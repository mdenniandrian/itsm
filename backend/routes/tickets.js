const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Helper: generate ticket number
function generateTicketNumber() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `TKT-${year}${month}-${random}`;
}

// Helper: get SLA due dates
function getSLADates(slaPolicy, createdAt) {
  if (!slaPolicy) return { response: null, resolution: null };
  const created = new Date(createdAt || Date.now());
  const response = new Date(created.getTime() + slaPolicy.response_time_hrs * 3600000);
  const resolution = new Date(created.getTime() + slaPolicy.resolution_time_hrs * 3600000);
  return { response: response.toISOString(), resolution: resolution.toISOString() };
}

// Helper: notify users about ticket events
function createNotification(userId, title, message, type, ticketId) {
  if (!userId) return;
  try {
    db.prepare(
      'INSERT INTO notifications (user_id, title, message, type, ticket_id) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, title, message, type, ticketId);
  } catch (e) { /* ignore */ }
}

// GET /api/tickets
router.get('/', auth, (req, res) => {
  const { status, priority, category, assignee_id, requester_id, search, page = 1, limit = 20, sort = 'created_at', order = 'desc' } = req.query;

  let where = [];
  let params = [];

  // Role-based filtering
  if (req.user.role === 'user') {
    where.push('t.requester_id = ?');
    params.push(req.user.id);
  }

  if (status) { where.push('t.status = ?'); params.push(status); }
  if (priority) { where.push('t.priority = ?'); params.push(priority); }
  if (category) { where.push('t.category = ?'); params.push(category); }
  if (assignee_id) { where.push('t.assignee_id = ?'); params.push(assignee_id); }
  if (requester_id) { where.push('t.requester_id = ?'); params.push(requester_id); }
  if (search) {
    where.push('(t.title LIKE ? OR t.description LIKE ? OR t.ticket_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const validSorts = ['created_at', 'updated_at', 'priority', 'status', 'ticket_number'];
  const sortCol = validSorts.includes(sort) ? sort : 'created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
  const offset = (Number(page) - 1) * Number(limit);

  const tickets = db.prepare(`
    SELECT t.*,
      r.name as requester_name, r.email as requester_email, r.avatar as requester_avatar,
      a.name as assignee_name, a.email as assignee_email, a.avatar as assignee_avatar,
      (SELECT COUNT(*) FROM ticket_comments tc WHERE tc.ticket_id = t.id AND tc.is_internal = 0) as comment_count
    FROM tickets t
    LEFT JOIN users r ON t.requester_id = r.id
    LEFT JOIN users a ON t.assignee_id = a.id
    ${whereClause}
    ORDER BY t.${sortCol} ${sortOrder}
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM tickets t ${whereClause}`).get(...params);

  res.json({
    tickets,
    pagination: {
      total: total.count,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total.count / Number(limit))
    }
  });
});

// GET /api/tickets/:id
router.get('/:id', auth, (req, res) => {
  const ticket = db.prepare(`
    SELECT t.*,
      r.name as requester_name, r.email as requester_email, r.avatar as requester_avatar, r.department as requester_department, r.phone as requester_phone,
      a.name as assignee_name, a.email as assignee_email, a.avatar as assignee_avatar,
      s.name as sla_name, s.response_time_hrs, s.resolution_time_hrs
    FROM tickets t
    LEFT JOIN users r ON t.requester_id = r.id
    LEFT JOIN users a ON t.assignee_id = a.id
    LEFT JOIN sla_policies s ON t.sla_policy_id = s.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  // Access control for regular users
  if (req.user.role === 'user' && ticket.requester_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Get comments
  const comments = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar as user_avatar, u.role as user_role
    FROM ticket_comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.ticket_id = ?
    ${req.user.role === 'user' ? 'AND c.is_internal = 0' : ''}
    ORDER BY c.created_at ASC
  `).all(req.params.id);

  // Get history
  const history = db.prepare(`
    SELECT h.*, u.name as user_name
    FROM ticket_history h
    LEFT JOIN users u ON h.user_id = u.id
    WHERE h.ticket_id = ?
    ORDER BY h.changed_at DESC
    LIMIT 50
  `).all(req.params.id);

  res.json({ ...ticket, comments, history });
});

// POST /api/tickets
router.post('/', auth, (req, res) => {
  const { title, description, priority, category, assignee_id, tags } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const ticket_number = generateTicketNumber();

  // Get matching SLA policy
  const slaPolicy = db.prepare('SELECT * FROM sla_policies WHERE priority = ? LIMIT 1').get(priority || 'medium');
  const slaDates = getSLADates(slaPolicy, new Date());

  const result = db.prepare(`
    INSERT INTO tickets (ticket_number, title, description, priority, category, requester_id, assignee_id, sla_policy_id, sla_response_due, sla_resolution_due, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ticket_number, title, description,
    priority || 'medium', category || 'incident',
    req.user.id, assignee_id || null,
    slaPolicy ? slaPolicy.id : null,
    slaDates.response, slaDates.resolution,
    JSON.stringify(tags || [])
  );

  const ticketId = result.lastInsertRowid;

  // Log history
  db.prepare('INSERT INTO ticket_history (ticket_id, user_id, action, new_value) VALUES (?, ?, ?, ?)').run(
    ticketId, req.user.id, 'created', ticket_number
  );

  // Notify assignee if set
  if (assignee_id) {
    createNotification(assignee_id, 'New Ticket Assigned', `Ticket ${ticket_number} has been assigned to you`, 'info', ticketId);
  }

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  res.status(201).json(ticket);
});

// PUT /api/tickets/:id
router.put('/:id', auth, (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  // Access control
  if (req.user.role === 'user' && ticket.requester_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { title, description, priority, category, status, assignee_id, tags } = req.body;
  const updates = [];
  const params = [];

  const trackChange = (field, oldVal, newVal) => {
    if (oldVal !== newVal && newVal !== undefined) {
      db.prepare('INSERT INTO ticket_history (ticket_id, user_id, action, field_name, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)').run(
        ticket.id, req.user.id, 'updated', field, String(oldVal), String(newVal)
      );
    }
  };

  if (title !== undefined) { updates.push('title = ?'); params.push(title); trackChange('title', ticket.title, title); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); trackChange('priority', ticket.priority, priority); }
  if (category !== undefined) { updates.push('category = ?'); params.push(category); trackChange('category', ticket.category, category); }
  if (tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(tags)); }

  if (status !== undefined && status !== ticket.status) {
    updates.push('status = ?');
    params.push(status);
    trackChange('status', ticket.status, status);

    if (status === 'resolved') {
      updates.push('resolved_at = CURRENT_TIMESTAMP');
      createNotification(ticket.requester_id, 'Ticket Resolved', `Your ticket ${ticket.ticket_number} has been resolved`, 'success', ticket.id);
    }
    if (status === 'closed') {
      updates.push('closed_at = CURRENT_TIMESTAMP');
    }
    if (status === 'in_progress' && !ticket.first_response_at) {
      updates.push('first_response_at = CURRENT_TIMESTAMP');
    }
  }

  if (assignee_id !== undefined) {
    updates.push('assignee_id = ?');
    params.push(assignee_id || null);
    trackChange('assignee', ticket.assignee_id, assignee_id);
    if (assignee_id && assignee_id !== ticket.assignee_id) {
      createNotification(assignee_id, 'Ticket Assigned', `Ticket ${ticket.ticket_number} has been assigned to you`, 'info', ticket.id);
    }
  }

  if (updates.length === 0) return res.json(ticket);

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(ticket.id);

  db.prepare(`UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare(`
    SELECT t.*, r.name as requester_name, a.name as assignee_name
    FROM tickets t
    LEFT JOIN users r ON t.requester_id = r.id
    LEFT JOIN users a ON t.assignee_id = a.id
    WHERE t.id = ?
  `).get(ticket.id);

  res.json(updated);
});

// POST /api/tickets/:id/comments
router.post('/:id/comments', auth, (req, res) => {
  const { content, is_internal } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const result = db.prepare(
    'INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal) VALUES (?, ?, ?, ?)'
  ).run(ticket.id, req.user.id, content, is_internal ? 1 : 0);

  // Update ticket updated_at
  db.prepare('UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(ticket.id);

  // Notify relevant parties
  if (ticket.assignee_id && ticket.assignee_id !== req.user.id) {
    createNotification(ticket.assignee_id, 'New Comment', `New comment on ticket ${ticket.ticket_number}`, 'info', ticket.id);
  }
  if (ticket.requester_id !== req.user.id && !is_internal) {
    createNotification(ticket.requester_id, 'Update on your ticket', `New reply on ticket ${ticket.ticket_number}`, 'info', ticket.id);
  }

  const comment = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar as user_avatar, u.role as user_role
    FROM ticket_comments c LEFT JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(comment);
});

// DELETE /api/tickets/:id
router.delete('/:id', auth, requireRole('admin', 'manager'), (req, res) => {
  const ticket = db.prepare('SELECT id FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  db.prepare('DELETE FROM tickets WHERE id = ?').run(req.params.id);
  res.json({ message: 'Ticket deleted' });
});

// GET /api/tickets/:id/history
router.get('/:id/history', auth, (req, res) => {
  const history = db.prepare(`
    SELECT h.*, u.name as user_name, u.avatar as user_avatar
    FROM ticket_history h LEFT JOIN users u ON h.user_id = u.id
    WHERE h.ticket_id = ? ORDER BY h.changed_at DESC
  `).all(req.params.id);
  res.json(history);
});

module.exports = router;
