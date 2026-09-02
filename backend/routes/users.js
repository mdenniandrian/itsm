const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const bcrypt = require('bcryptjs');

// GET /api/users
router.get('/', auth, requireRole('admin', 'manager', 'agent'), (req, res) => {
  const { role, department, search, is_active } = req.query;
  let where = [];
  let params = [];

  if (role) { where.push('role = ?'); params.push(role); }
  if (department) { where.push('department = ?'); params.push(department); }
  if (search) { where.push('(name LIKE ? OR email LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (is_active !== undefined) { where.push('is_active = ?'); params.push(is_active === 'true' ? 1 : 0); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const users = db.prepare(`
    SELECT id, email, name, role, department, phone, avatar, is_active, created_at
    FROM users ${whereClause} ORDER BY name ASC
  `).all(...params);

  res.json(users);
});

// GET /api/users/:id
router.get('/:id', auth, (req, res) => {
  const user = db.prepare(
    'SELECT id, email, name, role, department, phone, avatar, is_active, created_at FROM users WHERE id = ?'
  ).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// POST /api/users (admin only)
router.post('/', auth, requireRole('admin'), (req, res) => {
  const { email, password, name, role, department, phone } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const password_hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, name, role, department, phone) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(email, password_hash, name, role || 'user', department || null, phone || null);

  res.status(201).json({ id: result.lastInsertRowid, message: 'User created' });
});

// PUT /api/users/:id (admin or self)
router.put('/:id', auth, (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== Number(req.params.id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { name, phone, department, role, is_active, password } = req.body;
  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
  if (department !== undefined) { updates.push('department = ?'); params.push(department); }
  if (req.user.role === 'admin') {
    if (role !== undefined) { updates.push('role = ?'); params.push(role); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  }
  if (password) {
    updates.push('password_hash = ?');
    params.push(bcrypt.hashSync(password, 10));
  }

  if (updates.length === 0) return res.json({ message: 'Nothing to update' });

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'User updated' });
});

// DELETE /api/users/:id (admin only)
router.delete('/:id', auth, requireRole('admin'), (req, res) => {
  if (req.user.id === Number(req.params.id)) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deactivated' });
});

// GET /api/users/agents/list - Get all agents for assignment
router.get('/agents/list', auth, (req, res) => {
  const agents = db.prepare(
    "SELECT id, name, email, avatar, department FROM users WHERE role IN ('admin','manager','agent') AND is_active = 1 ORDER BY name"
  ).all();
  res.json(agents);
});

module.exports = router;
