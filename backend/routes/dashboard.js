const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', auth, (req, res) => {
  const isUser = req.user.role === 'user';
  const userId = req.user.id;

  const userFilter = isUser ? `WHERE requester_id = ${userId}` : '';
  const userFilterAnd = isUser ? `AND requester_id = ${userId}` : '';

  const stats = {
    total: db.prepare(`SELECT COUNT(*) as c FROM tickets ${userFilter}`).get().c,
    open: db.prepare(`SELECT COUNT(*) as c FROM tickets WHERE status = 'open' ${userFilterAnd}`).get().c,
    in_progress: db.prepare(`SELECT COUNT(*) as c FROM tickets WHERE status = 'in_progress' ${userFilterAnd}`).get().c,
    pending: db.prepare(`SELECT COUNT(*) as c FROM tickets WHERE status = 'pending' ${userFilterAnd}`).get().c,
    resolved: db.prepare(`SELECT COUNT(*) as c FROM tickets WHERE status = 'resolved' ${userFilterAnd}`).get().c,
    closed: db.prepare(`SELECT COUNT(*) as c FROM tickets WHERE status = 'closed' ${userFilterAnd}`).get().c,
    critical: db.prepare(`SELECT COUNT(*) as c FROM tickets WHERE priority = 'critical' AND status NOT IN ('resolved','closed') ${userFilterAnd}`).get().c,
    sla_breached: db.prepare(`SELECT COUNT(*) as c FROM tickets WHERE (sla_response_breached = 1 OR sla_resolution_breached = 1) AND status NOT IN ('closed') ${userFilterAnd}`).get().c,
    unassigned: isUser ? 0 : db.prepare("SELECT COUNT(*) as c FROM tickets WHERE assignee_id IS NULL AND status NOT IN ('resolved','closed')").get().c,
    resolved_today: db.prepare(`SELECT COUNT(*) as c FROM tickets WHERE DATE(resolved_at) = DATE('now') ${userFilterAnd}`).get().c,
  };

  res.json(stats);
});

// GET /api/dashboard/by-status
router.get('/by-status', auth, (req, res) => {
  const data = db.prepare(`
    SELECT status, COUNT(*) as count FROM tickets
    GROUP BY status ORDER BY count DESC
  `).all();
  res.json(data);
});

// GET /api/dashboard/by-priority
router.get('/by-priority', auth, (req, res) => {
  const data = db.prepare(`
    SELECT priority, COUNT(*) as count FROM tickets
    WHERE status NOT IN ('resolved','closed')
    GROUP BY priority ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END
  `).all();
  res.json(data);
});

// GET /api/dashboard/by-category
router.get('/by-category', auth, (req, res) => {
  const data = db.prepare(`
    SELECT category, COUNT(*) as count FROM tickets
    GROUP BY category ORDER BY count DESC
  `).all();
  res.json(data);
});

// GET /api/dashboard/trend?days=30
router.get('/trend', auth, (req, res) => {
  const days = Math.min(Number(req.query.days) || 30, 90);
  const data = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as created,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
    FROM tickets
    WHERE created_at >= DATE('now', '-${days} days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all();
  res.json(data);
});

// GET /api/dashboard/agent-performance
router.get('/agent-performance', auth, (req, res) => {
  const data = db.prepare(`
    SELECT u.id, u.name, u.avatar,
      COUNT(t.id) as total_assigned,
      SUM(CASE WHEN t.status IN ('resolved','closed') THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN t.status IN ('open','in_progress','pending') THEN 1 ELSE 0 END) as active,
      ROUND(AVG(CASE WHEN t.resolved_at IS NOT NULL
        THEN (julianday(t.resolved_at) - julianday(t.created_at)) * 24
        ELSE NULL END), 1) as avg_resolution_hrs
    FROM users u
    LEFT JOIN tickets t ON u.id = t.assignee_id
    WHERE u.role IN ('admin','manager','agent') AND u.is_active = 1
    GROUP BY u.id, u.name
    ORDER BY resolved DESC
    LIMIT 10
  `).all();
  res.json(data);
});

// GET /api/dashboard/recent-tickets
router.get('/recent-tickets', auth, (req, res) => {
  const isUser = req.user.role === 'user';
  const userId = req.user.id;
  const userFilter = isUser ? 'AND t.requester_id = ?' : '';
  const params = isUser ? [userId] : [];

  const tickets = db.prepare(`
    SELECT t.id, t.ticket_number, t.title, t.status, t.priority, t.category, t.created_at,
      r.name as requester_name, a.name as assignee_name
    FROM tickets t
    LEFT JOIN users r ON t.requester_id = r.id
    LEFT JOIN users a ON t.assignee_id = a.id
    WHERE 1=1 ${userFilter}
    ORDER BY t.created_at DESC LIMIT 10
  `).all(...params);
  res.json(tickets);
});

// GET /api/dashboard/sla-breaches
router.get('/sla-breaches', auth, (req, res) => {
  const data = db.prepare(`
    SELECT t.id, t.ticket_number, t.title, t.priority, t.status,
      t.sla_response_due, t.sla_resolution_due,
      t.sla_response_breached, t.sla_resolution_breached,
      r.name as requester_name, a.name as assignee_name
    FROM tickets t
    LEFT JOIN users r ON t.requester_id = r.id
    LEFT JOIN users a ON t.assignee_id = a.id
    WHERE (t.sla_response_breached = 1 OR t.sla_resolution_breached = 1)
      AND t.status NOT IN ('resolved','closed')
    ORDER BY t.priority, t.created_at ASC
    LIMIT 20
  `).all();
  res.json(data);
});

module.exports = router;
