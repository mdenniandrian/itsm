const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// GET /api/assets
router.get('/', auth, requireRole('admin', 'manager', 'agent'), (req, res) => {
  const { type, status, assigned_to, search, page = 1, limit = 20 } = req.query;
  let where = [];
  let params = [];

  if (type) { where.push('a.type = ?'); params.push(type); }
  if (status) { where.push('a.status = ?'); params.push(status); }
  if (assigned_to) { where.push('a.assigned_to = ?'); params.push(assigned_to); }
  if (search) {
    where.push('(a.name LIKE ? OR a.serial_number LIKE ? OR a.brand LIKE ? OR a.model LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (Number(page) - 1) * Number(limit);

  const assets = db.prepare(`
    SELECT a.*, u.name as assigned_to_name, u.email as assigned_to_email
    FROM assets a
    LEFT JOIN users u ON a.assigned_to = u.id
    ${whereClause}
    ORDER BY a.name ASC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  const total = db.prepare(`SELECT COUNT(*) as c FROM assets a ${whereClause}`).get(...params).c;

  const summary = db.prepare(`
    SELECT type, status, COUNT(*) as count
    FROM assets
    GROUP BY type, status
  `).all();

  res.json({ assets, total, summary });
});

// GET /api/assets/:id
router.get('/:id', auth, requireRole('admin', 'manager', 'agent'), (req, res) => {
  const asset = db.prepare(`
    SELECT a.*, u.name as assigned_to_name, u.email as assigned_to_email
    FROM assets a LEFT JOIN users u ON a.assigned_to = u.id
    WHERE a.id = ?
  `).get(req.params.id);

  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  res.json(asset);
});

// POST /api/assets
router.post('/', auth, requireRole('admin', 'manager'), (req, res) => {
  const { name, type, brand, model, serial_number, ip_address, mac_address, status, assigned_to, location, purchase_date, warranty_expiry, purchase_value, notes } = req.body;

  if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });

  const result = db.prepare(`
    INSERT INTO assets (name, type, brand, model, serial_number, ip_address, mac_address, status, assigned_to, location, purchase_date, warranty_expiry, purchase_value, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, type, brand, model, serial_number, ip_address, mac_address, status || 'active', assigned_to || null, location, purchase_date, warranty_expiry, purchase_value, notes);

  res.status(201).json({ id: result.lastInsertRowid });
});

// PUT /api/assets/:id
router.put('/:id', auth, requireRole('admin', 'manager'), (req, res) => {
  const fields = ['name','type','brand','model','serial_number','ip_address','mac_address','status','assigned_to','location','purchase_date','warranty_expiry','purchase_value','notes'];
  const updates = [];
  const params = [];

  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f] === '' ? null : req.body[f]);
    }
  });

  if (updates.length === 0) return res.json({ message: 'Nothing to update' });

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);
  db.prepare(`UPDATE assets SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Asset updated' });
});

// DELETE /api/assets/:id
router.delete('/:id', auth, requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM assets WHERE id = ?').run(req.params.id);
  res.json({ message: 'Asset deleted' });
});

// GET /api/assets/stats/summary
router.get('/stats/summary', auth, requireRole('admin', 'manager', 'agent'), (req, res) => {
  const byType = db.prepare('SELECT type, COUNT(*) as count FROM assets GROUP BY type').all();
  const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM assets GROUP BY status').all();
  const total = db.prepare('SELECT COUNT(*) as c FROM assets').get().c;
  const totalValue = db.prepare('SELECT SUM(purchase_value) as v FROM assets').get().v || 0;
  const warrantyExpiring = db.prepare("SELECT COUNT(*) as c FROM assets WHERE warranty_expiry BETWEEN DATE('now') AND DATE('now', '+30 days')").get().c;

  res.json({ byType, byStatus, total, totalValue, warrantyExpiring });
});

module.exports = router;
