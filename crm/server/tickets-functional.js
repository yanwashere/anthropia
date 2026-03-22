/**
 * Функциональный модуль управления заявками
 * Pure functions для работы с заявками и их композиция
 */

const express = require('express');
const {
  pipe,
  validate,
  merge,
  pick,
  Right,
  Left,
  sortBy
} = require('./fp-utils');
const { authMiddleware } = require('./auth-functional');
const {
  createTicket,
  findTicketById,
  getAllTickets,
  getUserTickets,
  getUnassignedTickets,
  assignTicketToUser,
  updateTicketStatus,
  updateTicketInfo,
  getTicketsStats,
  getModeratorStats
} = require('./db-functional');

const router = express.Router();

// ============ Валидаторы для заявок (Pure Functions) ============

/**
 * Валидация имени клиента
 */
const validateClientName = validate(
  (name) => name && name.trim().length >= 2,
  'Client name must be at least 2 characters'
);

/**
 * Валидация email клиента
 */
const validateClientEmail = validate(
  (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  'Invalid email format'
);

/**
 * Валидация темы заявки
 */
const validateSubject = validate(
  (subject) => subject && subject.trim().length >= 3,
  'Subject must be at least 3 characters'
);

/**
 * Валидация сообщения
 */
const validateMessage = validate(
  (message) => message && message.trim().length >= 5,
  'Message must be at least 5 characters'
);

/**
 * Валидация статуса
 */
const validateStatus = validate(
  (status) => ['new', 'in_progress', 'resolved', 'closed'].includes(status),
  'Invalid status'
);

// ============ Трансформации данных (Pure Functions) ============

/**
 * Очистить и подготовить данные заявки
 */
const prepareTicketData = (data) => ({
  client_name: (data.client_name || '').trim(),
  client_email: (data.client_email || '').trim().toLowerCase(),
  subject: (data.subject || '').trim(),
  message: (data.message || '').trim()
});

/**
 * Валидировать данные новой заявки
 */
const validateNewTicketData = (data) => {
  validateClientName(data.client_name);
  validateClientEmail(data.client_email);
  validateSubject(data.subject);
  validateMessage(data.message);
  return data;
};

/**
 * Конвертировать заявку для отправки клиенту (omit sensitive info)
 */
const publicizeTicket = pick([
  'id',
  'client_name',
  'client_email',
  'subject',
  'message',
  'status',
  'assigned_to',
  'moderator_name',
  'created_at',
  'updated_at'
]);

/**
 * Добавить информацию о времени жизни заявки
 */
const withTimingInfo = (ticket) => {
  const createdAt = new Date(ticket.created_at);
  const now = new Date();
  const daysSinceCreation = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

  return merge(ticket, {
    daysSinceCreation,
    isOverdue: daysSinceCreation > 7
  });
};

/**
 * Обогатить заявку приоритетом
 */
const withPriority = (ticket) => {
  const priorityMap = {
    'new': 'high',
    'in_progress': 'medium',
    'resolved': 'low',
    'closed': 'none'
  };

  return merge(ticket, {
    priority: priorityMap[ticket.status] || 'medium'
  });
};

/**
 * Форматированный вывод заявки
 */
const formatTicketForClient = pipe(
  withTimingInfo,
  withPriority,
  publicizeTicket
);

// ============ Бизнес-логика (Pure Functions) ============

/**
 * Создать новую заявку (async pure function)
 */
const createNewTicket = async (ticketData) => {
  try {
    const data = prepareTicketData(ticketData);
    validateNewTicketData(data);

    const result = await createTicket(
      data.client_name,
      data.client_email,
      data.subject,
      data.message
    );

    return Right({
      id: result.id,
      message: 'Ticket created successfully'
    });
  } catch (error) {
    return Left({ code: 'VALIDATION_ERROR', message: error.message });
  }
};

/**
 * Получить список всех заявок с фильтрацией
 */
const getFilteredTickets = async (filters = {}) => {
  try {
    let tickets = await getAllTickets();

    // Фильтр по статусу
    if (filters.status) {
      tickets = tickets.filter(t => t.status === filters.status);
    }

    // Фильтр по модератору
    if (filters.moderatorId) {
      tickets = tickets.filter(t => t.assigned_to === filters.moderatorId);
    }

    // Фильтр по email
    if (filters.email) {
      tickets = tickets.filter(t =>
        t.client_email.toLowerCase().includes(filters.email.toLowerCase())
      );
    }

    // Сортировка
    const sortKey = filters.sortBy || 'created_at';
    if (filters.sortBy) {
      tickets = sortBy(sortKey)(tickets);
    }

    if (filters.reverse) {
      tickets = tickets.reverse();
    }

    return Right(tickets);
  } catch (error) {
    return Left({ code: 'DB_ERROR', message: error.message });
  }
};

/**
 * Получить заявку с проверкой доступа
 */
const getTicketWithAccess = async (ticketId, userId) => {
  try {
    const ticket = await findTicketById(ticketId);

    if (!ticket) {
      return Left({ code: 'NOT_FOUND', message: 'Ticket not found' });
    }

    // Проверка доступа: модератор может видеть только свои заявки или все если он админ
    if (ticket.assigned_to && ticket.assigned_to !== userId) {
      return Left({ code: 'FORBIDDEN', message: 'Access denied' });
    }

    return Right(ticket);
  } catch (error) {
    return Left({ code: 'DB_ERROR', message: error.message });
  }
};

/**
 * Назначить заявку модератору
 */
const assignTicket = async (ticketId, userId) => {
  try {
    const ticket = await findTicketById(ticketId);

    if (!ticket) {
      return Left({ code: 'NOT_FOUND', message: 'Ticket not found' });
    }

    if (ticket.assigned_to) {
      return Left({ code: 'ALREADY_ASSIGNED', message: 'Ticket already assigned' });
    }

    await assignTicketToUser(ticketId, userId);
    return Right({ message: 'Ticket assigned successfully' });
  } catch (error) {
    return Left({ code: 'DB_ERROR', message: error.message });
  }
};

/**
 * Изменить статус заявки
 */
const changeTicketStatus = async (ticketId, newStatus) => {
  try {
    validateStatus(newStatus);

    const ticket = await findTicketById(ticketId);
    if (!ticket) {
      return Left({ code: 'NOT_FOUND', message: 'Ticket not found' });
    }

    if (ticket.status === newStatus) {
      return Left({ code: 'NO_CHANGE', message: 'Status is already ' + newStatus });
    }

    await updateTicketStatus(ticketId, newStatus);
    return Right({ message: 'Status updated successfully' });
  } catch (error) {
    return Left({ code: 'ERROR', message: error.message });
  }
};

/**
 * Получить статистику заявок для модератора
 */
const getModeratorTicketStats = async (userId) => {
  try {
    const stats = await getModeratorStats(userId);
    return Right(stats);
  } catch (error) {
    return Left({ code: 'DB_ERROR', message: error.message });
  }
};

/**
 * Получить общую статистику
 */
const getSystemTicketStats = async () => {
  try {
    const stats = await getTicketsStats();
    return Right(stats);
  } catch (error) {
    return Left({ code: 'DB_ERROR', message: error.message });
  }
};

// ============ Express маршруты ============

/**
 * POST /api/tickets/create
 * Создать новую заявку (от клиента, без аутентификации)
 */
router.post('/create', async (req, res) => {
  const result = await createNewTicket(req.body);

  result.fold(
    (error) => res.status(400).json({ error: error.message }),
    (data) => res.status(201).json(data)
  );
});

/**
 * GET /api/tickets/all
 * Получить все заявки (для модератора)
 */
router.get('/all', authMiddleware, async (req, res) => {
  const filters = {
    status: req.query.status,
    sortBy: req.query.sortBy || 'created_at',
    reverse: req.query.reverse === 'true'
  };

  const result = await getFilteredTickets(filters);

  result.fold(
    (error) => res.status(500).json({ error: error.message }),
    (tickets) => res.json(tickets)
  );
});

/**
 * GET /api/tickets/my
 * Получить заявки, назначенные текущему модератору
 */
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const tickets = await getUserTickets(req.user.id);
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tickets/unassigned
 * Получить нераспределенные заявки
 */
router.get('/unassigned', authMiddleware, async (req, res) => {
  try {
    const tickets = await getUnassignedTickets();
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tickets/stats
 * Получить статистику заявок
 */
router.get('/stats', authMiddleware, async (req, res) => {
  const result = await getSystemTicketStats();

  result.fold(
    (error) => res.status(500).json({ error: error.message }),
    (stats) => res.json(stats)
  );
});

/**
 * GET /api/tickets/my-stats
 * Получить личную статистику модератора
 */
router.get('/my-stats', authMiddleware, async (req, res) => {
  const result = await getModeratorTicketStats(req.user.id);

  result.fold(
    (error) => res.status(500).json({ error: error.message }),
    (stats) => res.json(stats)
  );
});

/**
 * GET /api/tickets/:id
 * Получить заявку по ID
 */
router.get('/:id', authMiddleware, async (req, res) => {
  const result = await getTicketWithAccess(parseInt(req.params.id), req.user.id);

  result.fold(
    (error) => {
      const status = error.code === 'NOT_FOUND' ? 404 : 403;
      res.status(status).json({ error: error.message });
    },
    (ticket) => res.json(ticket)
  );
});

/**
 * POST /api/tickets/:id/assign
 * Назначить заявку себе
 */
router.post('/:id/assign', authMiddleware, async (req, res) => {
  const result = await assignTicket(parseInt(req.params.id), req.user.id);

  result.fold(
    (error) => {
      const status = error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: error.message });
    },
    (data) => res.json(data)
  );
});

/**
 * POST /api/tickets/:id/status
 * Обновить статус заявки
 */
router.post('/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body;
  const result = await changeTicketStatus(parseInt(req.params.id), status);

  result.fold(
    (error) => {
      const status = error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: error.message });
    },
    (data) => res.json(data)
  );
});

module.exports = {
  router,
  createNewTicket,
  getFilteredTickets,
  getTicketWithAccess,
  assignTicket,
  changeTicketStatus,
  getModeratorTicketStats,
  getSystemTicketStats,
  formatTicketForClient
};
