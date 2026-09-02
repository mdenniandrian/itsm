const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// GET /api/knowledge
router.get('/', auth, (req, res) => {
  const { category, search, page = 1, limit = 20 } = req.query;
  let where = ['is_published = 1'];
  let params = [];

  if (category) { where.push('category = ?'); params.push(category); }
  if (search) {
    where.push('(title LIKE ? OR content LIKE ? OR tags LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause = 'WHERE ' + where.join(' AND ');
  const offset = (Number(page) - 1) * Number(limit);

  const articles = db.prepare(`
    SELECT k.id, k.title, k.category, k.tags, k.views, k.helpful_count, k.created_at, k.updated_at,
      u.name as author_name
    FROM knowledge_articles k
    LEFT JOIN users u ON k.author_id = u.id
    ${whereClause}
    ORDER BY k.views DESC, k.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  const total = db.prepare(`SELECT COUNT(*) as c FROM knowledge_articles ${whereClause}`).get(...params).c;
  const categories = db.prepare("SELECT DISTINCT category FROM knowledge_articles WHERE is_published = 1 ORDER BY category").all();

  res.json({ articles, total, categories: categories.map(c => c.category) });
});

// GET /api/knowledge/:id
router.get('/:id', auth, (req, res) => {
  const article = db.prepare(`
    SELECT k.*, u.name as author_name, u.avatar as author_avatar
    FROM knowledge_articles k LEFT JOIN users u ON k.author_id = u.id
    WHERE k.id = ?
  `).get(req.params.id);

  if (!article) return res.status(404).json({ error: 'Article not found' });

  // Increment views
  db.prepare('UPDATE knowledge_articles SET views = views + 1 WHERE id = ?').run(article.id);

  res.json(article);
});

// POST /api/knowledge
router.post('/', auth, requireRole('admin', 'manager', 'agent'), (req, res) => {
  const { title, content, category, tags, is_published } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  const result = db.prepare(`
    INSERT INTO knowledge_articles (title, content, category, tags, author_id, is_published)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, content, category || 'general', JSON.stringify(tags || []), req.user.id, is_published !== false ? 1 : 0);

  res.status(201).json({ id: result.lastInsertRowid });
});

// PUT /api/knowledge/:id
router.put('/:id', auth, requireRole('admin', 'manager', 'agent'), (req, res) => {
  const { title, content, category, tags, is_published } = req.body;
  const updates = [];
  const params = [];

  if (title !== undefined) { updates.push('title = ?'); params.push(title); }
  if (content !== undefined) { updates.push('content = ?'); params.push(content); }
  if (category !== undefined) { updates.push('category = ?'); params.push(category); }
  if (tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(tags)); }
  if (is_published !== undefined) { updates.push('is_published = ?'); params.push(is_published ? 1 : 0); }

  if (updates.length === 0) return res.json({ message: 'Nothing to update' });

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);
  db.prepare(`UPDATE knowledge_articles SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Article updated' });
});

// POST /api/knowledge/:id/helpful
router.post('/:id/helpful', auth, (req, res) => {
  db.prepare('UPDATE knowledge_articles SET helpful_count = helpful_count + 1 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Thank you for feedback' });
});

// DELETE /api/knowledge/:id
router.delete('/:id', auth, requireRole('admin', 'manager'), (req, res) => {
  db.prepare('DELETE FROM knowledge_articles WHERE id = ?').run(req.params.id);
  res.json({ message: 'Article deleted' });
});

module.exports = router;
