const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

// SSE clients store
const clients = new Map();

// GET /api/notifications/stream - SSE endpoint
router.get('/stream', (req, res) => {
  // EventSource can't set headers, so accept token from query param
  const token = req.query.token || (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).end();

  let decoded;
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'itsm-super-secret-key-2024';
    decoded = jwt.verify(token, JWT_SECRET);
  } catch(e) {
    return res.status(401).end();
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const userId = decoded.id;
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Heartbeat
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    if (clients.has(userId)) {
      clients.get(userId).delete(res);
      if (clients.get(userId).size === 0) clients.delete(userId);
    }
  });
});

// Utility: push notification to SSE clients
function pushToUser(userId, data) {
  if (clients.has(userId)) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    clients.get(userId).forEach(client => {
      try { client.write(message); } catch (e) { /* ignore */ }
    });
  }
}

// GET /api/notifications
router.get('/', auth, (req, res) => {
  const { page = 1, limit = 20, unread_only } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let where = 'WHERE user_id = ?';
  const params = [req.user.id];

  if (unread_only === 'true') { where += ' AND is_read = 0'; }

  const notifications = db.prepare(`
    SELECT n.*, t.ticket_number
    FROM notifications n
    LEFT JOIN tickets t ON n.ticket_id = t.id
    ${where}
    ORDER BY n.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  const unread_count = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id).c;

  res.json({ notifications, unread_count });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', auth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Marked as read' });
});

// PUT /api/notifications/read-all
router.put('/read-all', auth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'All marked as read' });
});

// DELETE /api/notifications/:id
router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Notification deleted' });
});

module.exports = { router, pushToUser };
