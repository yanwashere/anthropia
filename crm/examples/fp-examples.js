/**
 * Примеры использования функционального стиля в CRM системе
 * Демонстрация ключевых концепций: composition, pure functions, immutability
 */

// ============ Пример 1: Composition для обработки заявок ============

const { pipe, validate, merge, omit, Right, Left } = require('../server/fp-utils');

/**
 * Этап 1: Валидация
 */
const validateTicketData = (data) => {
  if (!data.subject || data.subject.trim().length === 0) {
    throw new Error('Subject is required');
  }
  if (!data.message || data.message.trim().length < 10) {
    throw new Error('Message must be at least 10 characters');
  }
  if (!data.client_email || !data.client_email.includes('@')) {
    throw new Error('Valid email is required');
  }
  return data;
};

/**
 * Этап 2: Очистка данных
 */
const cleanTicketData = (data) => merge(data, {
  subject: data.subject.trim(),
  message: data.message.trim(),
  client_email: data.client_email.trim().toLowerCase()
});

/**
 * Этап 3: Обогащение данных
 */
const enrichWithTimestamp = (data) => merge(data, {
  created_at: new Date().toISOString(),
  status: 'new'
});

/**
 * Этап 4: Сохранение в БД
 */
const saveTicket = async (data) => {
  // Имитация сохранения в БД
  return Promise.resolve({
    id: Math.floor(Math.random() * 10000),
    ...data
  });
};

/**
 * Этап 5: Обработка результата (private fields)
 */
const publicizeTicket = omit(['internal_notes', 'moderator_comments']);

/**
 * Полная pipeline для создания заявки
 */
const createTicketPipeline = async (rawData) => {
  try {
    const ticket = pipe(
      validateTicketData,
      cleanTicketData,
      enrichWithTimestamp
    )(rawData);

    const saved = await saveTicket(ticket);
    const publicData = publicizeTicket(saved);

    return Right({
      success: true,
      ticketId: publicData.id,
      message: 'Ticket created successfully'
    });
  } catch (error) {
    return Left({
      success: false,
      error: error.message
    });
  }
};

// Использование:
/*
(async () => {
  const result = await createTicketPipeline({
    subject: 'Need help with subscription',
    message: 'I cannot access my account after payment',
    client_email: 'user@example.com',
    client_name: 'John Doe'
  });

  result.fold(
    (error) => console.log('Error:', error),
    (success) => console.log('Success:', success)
  );
})();
*/

// ============ Пример 2: Higher-Order Functions для фильтрации ============

/**
 * HOF для создания фильтра заявок
 */
const createTicketFilter = (predicate) => (tickets) =>
  tickets.filter(predicate);

/**
 * HOF для создания сортировщика
 */
const createTicketSorter = (key, order = 'asc') => (tickets) => {
  return [...tickets].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

// Создаём конкретные фильтры
const filterNewTickets = createTicketFilter((t) => t.status === 'new');
const filterUnassigned = createTicketFilter((t) => !t.assigned_to);
const filterHighPriority = createTicketFilter((t) =>
  t.status === 'new' || t.status === 'in_progress'
);

// Создаём конкретные сортировщики
const sortByDate = createTicketSorter('created_at', 'desc');
const sortByPriority = createTicketSorter('priority', 'asc');

// Использование:
/*
const allTickets = [
  { id: 1, status: 'new', assigned_to: null, priority: 'high', created_at: '2024-01-01' },
  { id: 2, status: 'in_progress', assigned_to: 1, priority: 'medium', created_at: '2024-01-02' },
  { id: 3, status: 'new', assigned_to: null, priority: 'low', created_at: '2024-01-03' }
];

const newUnassignedHighPriority = pipe(
  filterNewTickets,
  filterUnassigned,
  filterHighPriority,
  sortByDate
)(allTickets);

console.log('New unassigned high priority tickets:', newUnassignedHighPriority);
*/

// ============ Пример 3: Каррирование для валидаторов ============

/**
 * Карриированная функция для проверки длины строки
 */
const createLengthValidator = (minLength, maxLength) => (fieldName) => (value) => {
  if (!value || value.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} characters`);
  }
  if (value.length > maxLength) {
    throw new Error(`${fieldName} must be at most ${maxLength} characters`);
  }
  return value;
};

/**
 * Карриированная функция для проверки паттерна
 */
const createPatternValidator = (pattern, message) => (value) => {
  if (!pattern.test(value)) {
    throw new Error(message);
  }
  return value;
};

// Создаём конкретные валидаторы
const validateUsername = createLengthValidator(3, 50)('Username');
const validatePassword = createLengthValidator(6, 100)('Password');
const validateEmail = createPatternValidator(
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  'Invalid email format'
);

// Использование:
/*
try {
  const username = validateUsername('john_doe');
  const password = validatePassword('secure123password');
  const email = validateEmail('john@example.com');

  console.log('All validations passed');
} catch (error) {
  console.error('Validation failed:', error.message);
}
*/

// ============ Пример 4: Immutability для управления состоянием ============

/**
 * Функция для безопасного обновления объекта (immutable)
 */
const updateUser = (user, updates) => ({
  ...user,
  ...updates,
  updated_at: new Date().toISOString()
});

/**
 * Функция для добавления заявки в список (immutable)
 */
const addTicketToList = (tickets, newTicket) => [
  ...tickets,
  newTicket
];

/**
 * Функция для обновления заявки в списке (immutable)
 */
const updateTicketInList = (tickets, ticketId, updates) =>
  tickets.map((ticket) =>
    ticket.id === ticketId
      ? { ...ticket, ...updates }
      : ticket
  );

/**
 * Функция для удаления заявки из списка (immutable)
 */
const removeTicketFromList = (tickets, ticketId) =>
  tickets.filter((ticket) => ticket.id !== ticketId);

// Использование:
/*
let user = { id: 1, name: 'John', email: 'john@example.com' };
let tickets = [
  { id: 1, subject: 'Issue 1', status: 'new' },
  { id: 2, subject: 'Issue 2', status: 'in_progress' }
];

// Обновляем пользователя (оригинальный объект не изменяется)
const updatedUser = updateUser(user, { email: 'newemail@example.com' });

// Добавляем новую заявку
const newTickets = addTicketToList(tickets, {
  id: 3,
  subject: 'New Issue',
  status: 'new'
});

// Обновляем заявку
const updatedTickets = updateTicketInList(newTickets, 1, { status: 'resolved' });

// Удаляем заявку
const filteredTickets = removeTicketFromList(updatedTickets, 2);

console.log('Original user:', user); // Не изменился
console.log('Updated user:', updatedUser);
console.log('Updated tickets:', filteredTickets);
*/

// ============ Пример 5: State Management через Closures ============

/**
 * Создание управляемого состояния
 */
const createStateManager = (initialState) => {
  let state = initialState;
  const listeners = [];

  return {
    getState: () => Object.freeze({ ...state }),
    setState: (updates) => {
      state = { ...state, ...updates };
      // Уведомляем слушателей об изменении
      listeners.forEach((listener) => listener(state));
      return state;
    },
    subscribe: (listener) => {
      listeners.push(listener);
      // Возвращаем функцию отписки
      return () => {
        listeners.splice(listeners.indexOf(listener), 1);
      };
    }
  };
};

// Использование:
/*
const appState = createStateManager({
  currentUser: null,
  tickets: [],
  currentPage: 'login'
});

// Подписываемся на изменения
const unsubscribe = appState.subscribe((newState) => {
  console.log('State changed:', newState);
});

// Обновляем состояние
appState.setState({ currentPage: 'dashboard' });
appState.setState({ currentUser: { id: 1, name: 'John' } });

// Отписываемся
unsubscribe();
*/

// ============ Пример 6: Async Pipe для асинхронных операций ============

/**
 * Функция для создания асинхронной pipeline
 */
const asyncPipe = (...fns) => async (value) => {
  let result = value;
  for (const fn of fns) {
    result = await Promise.resolve(fn(result));
  }
  return result;
};

/**
 * Пример асинхронной pipeline для аутентификации
 */
const authenticateAndLoadUserData = asyncPipe(
  // Этап 1: Получить пользователя из БД
  (username) => getUserFromDatabase(username),

  // Этап 2: Загрузить настройки пользователя
  (user) => loadUserPreferences(user),

  // Этап 3: Загрузить его заявки
  (user) => loadUserTickets(user),

  // Этап 4: Форматировать результат
  (user) => omit(['password', 'token'])(user)
);

// Имитации функций
const getUserFromDatabase = async (username) => ({
  id: 1,
  username,
  password: 'hashed...',
  email: 'user@example.com'
});

const loadUserPreferences = async (user) => ({
  ...user,
  preferences: { language: 'ru', theme: 'dark' }
});

const loadUserTickets = async (user) => ({
  ...user,
  tickets: [
    { id: 1, subject: 'Issue 1' },
    { id: 2, subject: 'Issue 2' }
  ]
});

// Использование:
/*
(async () => {
  const userData = await authenticateAndLoadUserData('john_doe');
  console.log('User data:', userData);
})();
*/

// ============ Пример 7: Error Handling с Either Монадой ============

/**
 * Функция для логирования с Either
 */
const logIfError = (either) => {
  either.fold(
    (error) => {
      console.error('[Error]', error);
      return either;
    },
    (success) => {
      console.log('[Success]', success);
      return either;
    }
  );
  return either;
};

/**
 * Функция для трансформации Either результата
 */
const handleAuthResult = (result) => {
  return result.fold(
    (error) => {
      // Обработка ошибки
      if (error.code === 'INVALID_CREDENTIALS') {
        return {
          success: false,
          message: 'Неправильное имя пользователя или пароль',
          shouldRetry: true
        };
      }
      return {
        success: false,
        message: 'Ошибка аутентификации',
        shouldRetry: false
      };
    },
    (user) => {
      // Обработка успеха
      return {
        success: true,
        user,
        message: `Добро пожаловать, ${user.username}!`,
        shouldRetry: false
      };
    }
  );
};

// Использование:
/*
const authResult = await authenticateUser(credentials);
const response = handleAuthResult(authResult);

if (response.success) {
  console.log(response.message);
  redirectToDashboard(response.user);
} else {
  displayError(response.message);
  if (response.shouldRetry) {
    showRetryButton();
  }
}
*/

// ============ Пример 8: Декораторы и HOC для переиспользования ============

/**
 * HOC для добавления логирования к функции
 */
const withLogging = (fn) => {
  return async (...args) => {
    console.log(`[${fn.name}] Calling with:`, args);
    try {
      const result = await fn(...args);
      console.log(`[${fn.name}] Result:`, result);
      return result;
    } catch (error) {
      console.error(`[${fn.name}] Error:`, error);
      throw error;
    }
  };
};

/**
 * HOC для добавления кеширования
 */
const withCaching = (fn) => {
  const cache = new Map();
  return async (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      console.log(`[Cache hit] for key:`, key);
      return cache.get(key);
    }

    const result = await fn(...args);
    cache.set(key, result);
    console.log(`[Cache miss] saved key:`, key);
    return result;
  };
};

/**
 * HOC для добавления обработки ошибок
 */
const withErrorHandling = (fallbackValue) => (fn) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('Operation failed, using fallback:', error);
      return fallbackValue;
    }
  };
};

// Использование:
/*
const fetchUserWithEnhancements = pipe(
  withLogging,
  withCaching,
  withErrorHandling([])
)(fetchUser);

// Теперь функция автоматически:
// - Логирует вызовы
// - Кеширует результаты
// - Обрабатывает ошибки
const users = await fetchUserWithEnhancements(1);
*/

module.exports = {
  // Pipeline functions
  createTicketPipeline,

  // Filter and Sort
  createTicketFilter,
  createTicketSorter,
  filterNewTickets,
  filterUnassigned,
  sortByDate,

  // Validators
  createLengthValidator,
  createPatternValidator,

  // Immutability
  updateUser,
  addTicketToList,
  updateTicketInList,
  removeTicketFromList,

  // State Management
  createStateManager,

  // Async operations
  asyncPipe,
  authenticateAndLoadUserData,

  // Error Handling
  logIfError,
  handleAuthResult,

  // HOC
  withLogging,
  withCaching,
  withErrorHandling
};
