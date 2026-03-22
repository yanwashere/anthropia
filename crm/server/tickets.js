const express = require('express');
const db = require('./db');
const { verifyToken } = require('./auth');

const router = express.Router();

// Создать заявку (от клиента, без аутентификации)
router.post('/create', (req, res) => {
  const { client_name, client_email, subject, message } = req.body;

  if (!client_name || !client_email || !subject || !message) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  db.run(
    'INSERT INTO tickets (client_name, client_email, subject, message) VALUES (?, ?, ?, ?)',
    [client_name, client_email, subject, message],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Ticket created', id: this.lastID });
    }
  );
});

// Все заявки (для модератора)
router.get('/all', verifyToken, (req, res) => {
  db.all(
    `SELECT t.*, m.username as moderator_name FROM tickets t
     LEFT JOIN moderators m ON t.assigned_to = m.id
     ORDER BY t.created_at DESC`,
    (err, tickets) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(tickets);
    }
  );
});

// Мои заявки (назначенные мне)
router.get('/my', verifyToken, (req, res) => {
  db.all(
    'SELECT * FROM tickets WHERE assigned_to = ? ORDER BY created_at DESC',
    [req.user.id],
    (err, tickets) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(tickets);
    }
  );
});

// Получить заявку по ID
router.get('/:id', verifyToken, (req, res) => {
  db.get('SELECT * FROM tickets WHERE id = ?', [req.params.id], (err, ticket) => {
    if (err || !ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
  });
});

// Назначить заявку себе
router.post('/:id/assign', verifyToken, (req, res) => {
  db.run(
    'UPDATE tickets SET assigned_to = ? WHERE id = ?',
    [req.user.id, req.params.id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Ticket assigned' });
    }
  );
});

// Обновить статус заявки
router.post('/:id/status', verifyToken, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['new', 'in_progress', 'resolved', 'closed'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.run(
    'UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, req.params.id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Status updated' });
    }
  );
});

module.exports = router;
