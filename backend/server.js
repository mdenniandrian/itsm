require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/users', require('./routes/users'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/knowledge', require('./routes/knowledge'));
app.use('/api/assets', require('./routes/assets'));

const { router: notificationsRouter } = require('./routes/notifications');
app.use('/api/notifications', notificationsRouter);

// SLA Checker - runs every 5 minutes
const db = require('./database/db');
function checkSLABreaches() {
  const now = new Date().toISOString();
  // Mark response breaches
  db.prepare(`
    UPDATE tickets SET sla_response_breached = 1
    WHERE sla_response_due < ? AND sla_response_breached = 0
    AND status NOT IN ('resolved','closed')
  `).run(now);

  // Mark resolution breaches
  db.prepare(`
    UPDATE tickets SET sla_resolution_breached = 1
    WHERE sla_resolution_due < ? AND sla_resolution_breached = 0
    AND status NOT IN ('resolved','closed')
  `).run(now);
}

// Run SLA check on start and every 5 minutes
checkSLABreaches();
setInterval(checkSLABreaches, 5 * 60 * 1000);

// Catch-all: serve frontend
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log('\x1b[36m%s\x1b[0m', `
  ╔══════════════════════════════════════╗
  ║     🚀 ITSM Server Running           ║
  ║     http://localhost:${PORT}           ║
  ╚══════════════════════════════════════╝
  `);
  console.log('\x1b[33mDemo Accounts:\x1b[0m');
  console.log('  Admin:   admin@itsm.com / admin123');
  console.log('  Agent:   agent@itsm.com / agent123');
  console.log('  User:    user@itsm.com  / user123');
});
