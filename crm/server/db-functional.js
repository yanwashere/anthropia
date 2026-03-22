/**
 * Функциональный слой работы с БД
 * Pure functions для CRUD операций с immutable результатами
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { handle, Right, Left } = require('./fp-utils');

const dbPath = path.join(__dirname, 'crm.db');
const db = new sqlite3.Database(dbPath);

// ============ Утилиты для работы с БД ============

/**
 * Обертка для db.run (Promise-based, immutable)
 */
const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({
          id: this.lastID,
          changes: this.changes
        });
      }
    });
  });

/**
 * Обертка для db.get (Promise-based, pure)
 */
const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });

/**
 * Обертка для db.all (Promise-based, pure)
 */
const dbAll = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });

// ============ Инициализация таблиц ============

/**
 * Создание схемы БД (чистая функция)
 */
const initializeSchema = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS moderators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_name TEXT NOT NULL,
        client_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'new',
        assigned_to INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(assigned_to) REFERENCES moderators(id)
      )
    `);
  });
};

// ============ Moderator операции ============

/**
 * Создать нового модератора (pure function)
 */
const createModerator = (username, email, hashedPassword) =>
  dbRun(
    'INSERT INTO moderators (username, email, password) VALUES (?, ?, ?)',
    [username, email, hashedPassword]
  );

/**
 * Найти модератора по имени пользователя (pure function)
 */
const findModeratorByUsername = (username) =>
  dbGet(
    'SELECT * FROM moderators WHERE username = ?',
    [username]
  );

/**
 * Найти модератора по ID (pure function)
 */
const findModeratorById = (id) =>
  dbGet(
    'SELECT * FROM moderators WHERE id = ?',
    [id]
  );

/**
 * Получить всех модераторов (pure function)
 */
const getAllModerators = () =>
  dbAll('SELECT id, username, email, created_at FROM moderators');

// ============ Ticket операции ============

/**
 * Создать новую заявку (pure function)
 */
const createTicket = (clientName, clientEmail, subject, message) =>
  dbRun(
    'INSERT INTO tickets (client_name, client_email, subject, message) VALUES (?, ?, ?, ?)',
    [clientName, clientEmail, subject, message]
  );

/**
 * Найти заявку по ID (pure function)
 */
const findTicketById = (id) =>
  dbGet(
    `SELECT t.*, m.username as moderator_name FROM tickets t
     LEFT JOIN moderators m ON t.assigned_to = m.id
     WHERE t.id = ?`,
    [id]
  );

/**
 * Получить все заявки с информацией о модераторе (pure function)
 */
const getAllTickets = () =>
  dbAll(
    `SELECT t.*, m.username as moderator_name FROM tickets t
     LEFT JOIN moderators m ON t.assigned_to = m.id
     ORDER BY t.created_at DESC`
  );

/**
 * Получить заявки, назначенные пользователю (pure function)
 */
const getUserTickets = (userId) =>
  dbAll(
    `SELECT * FROM tickets WHERE assigned_to = ? ORDER BY created_at DESC`,
    [userId]
  );

/**
 * Получить новые заявки (не назначенные)
 */
const getUnassignedTickets = () =>
  dbAll(
    `SELECT * FROM tickets WHERE assigned_to IS NULL ORDER BY created_at DESC`
  );

/**
 * Назначить заявку пользователю (pure function)
 */
const assignTicketToUser = (ticketId, userId) =>
  dbRun(
    'UPDATE tickets SET assigned_to = ? WHERE id = ?',
    [userId, ticketId]
  );

/**
 * Обновить статус заявки (pure function)
 */
const updateTicketStatus = (ticketId, status) =>
  dbRun(
    'UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, ticketId]
  );

/**
 * Обновить информацию заявки (pure function)
 */
const updateTicketInfo = (ticketId, updates) => {
  const allowedFields = ['subject', 'message', 'status'];
  const safeUpdates = Object.keys(updates)
    .filter(key => allowedFields.includes(key))
    .map(key => `${key} = ?`)
    .join(', ');

  const values = allowedFields
    .filter(key => key in updates)
    .map(key => updates[key])
    .concat([ticketId]);

  if (!safeUpdates) {
    return Promise.resolve({ changes: 0 });
  }

  return dbRun(
    `UPDATE tickets SET ${safeUpdates}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    values
  );
};

/**
 * Получить статистику заявок
 */
const getTicketsStats = () =>
  dbAll(
    `SELECT status, COUNT(*) as count FROM tickets GROUP BY status`
  ).then(rows => {
    const stats = {
      new: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
      total: 0
    };
    rows.forEach(row => {
      stats[row.status] = row.count;
      stats.total += row.count;
    });
    return stats;
  });

/**
 * Получить статистику по модератору
 */
const getModeratorStats = (userId) =>
  Promise.all([
    dbAll(
      `SELECT status, COUNT(*) as count FROM tickets WHERE assigned_to = ? GROUP BY status`,
      [userId]
    ),
    dbGet(
      `SELECT COUNT(*) as count FROM tickets WHERE assigned_to = ?`,
      [userId]
    )
  ]).then(([statusRows, totalResult]) => {
    const stats = {
      new: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
      total: totalResult?.count || 0
    };
    statusRows.forEach(row => {
      stats[row.status] = row.count;
    });
    return stats;
  });

// ============ Вспомогательные функции ============

/**
 * Удалить все данные (для тестирования)
 */
const clearDatabase = () =>
  Promise.all([
    dbRun('DELETE FROM tickets'),
    dbRun('DELETE FROM moderators')
  ]);

/**
 * Закрыть соединение с БД
 */
const closeDatabase = () =>
  new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

// Инициализируем схему при загрузке модуля
initializeSchema();

module.exports = {
  initializeSchema,
  createModerator,
  findModeratorByUsername,
  findModeratorById,
  getAllModerators,
  createTicket,
  findTicketById,
  getAllTickets,
  getUserTickets,
  getUnassignedTickets,
  assignTicketToUser,
  updateTicketStatus,
  updateTicketInfo,
  getTicketsStats,
  getModeratorStats,
  clearDatabase,
  closeDatabase
};
