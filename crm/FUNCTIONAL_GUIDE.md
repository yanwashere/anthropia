# CRM System - Функциональный Стиль Программирования

Полный переход системы управления заявками на функциональное программирование с использованием pure functions, composition паттернов и immutable state.

## Архитектура

### Backend (Node.js + Express)

#### 1. **Утилиты (fp-utils.js)**
Полный набор функциональных утилит:
- **Композиция**: `pipe`, `compose` - создание pipeline из функций
- **Каррирование**: `curry`, `partial` - применение функций по частям
- **Трансформация объектов**: `merge`, `pick`, `omit`, `mapObj`, `getIn`, `setIn`
- **Работа с массивами**: `sortBy`, `groupBy`, `uniq`, `uniqBy`
- **Валидация**: `validate`, `validateAll`, `validateSchema`
- **Обработка ошибок**: `tryCatch`, `handle`, `Maybe`, `Either (Right/Left)`
- **Утилиты**: `memoize`, `debounce`, `throttle`, `tap`

```javascript
// Пример использования pipe
const processPerson = pipe(
  validateUsername,
  validateEmail,
  hashPassword,
  saveToDB,
  returnPublicData
);

const result = await processPerson(userData);
```

#### 2. **Database Layer (db-functional.js)**
Чистые функции для всех операций с БД:
- Все функции возвращают Promise
- Нет побочных эффектов в самих функциях
- Используются Promise для асинхронности

```javascript
// Pure functions для работы с модераторами
const createModerator = (username, email, hashedPassword) => dbRun(...);
const findModeratorByUsername = (username) => dbGet(...);
const getAllModerators = () => dbAll(...);

// Pure functions для работы с заявками
const createTicket = (clientName, clientEmail, subject, message) => dbRun(...);
const getAllTickets = () => dbAll(...);
const getTicketsByStatus = (status) => dbAll(...);
```

#### 3. **Authentication Module (auth-functional.js)**
Функциональный подход к аутентификации:

```javascript
// Pure функции для валидации
const validateUsername = validate(predicate, 'error message');
const validateEmail = validate(predicate, 'error message');
const validatePassword = validate(predicate, 'error message');

// Pure функции для криптографии
const hashPassword = (password) => Promise<hashedPassword>;
const comparePassword = (plain, hashed) => Promise<boolean>;

// Pure функции для JWT
const createToken = (user) => tokenString;
const verifyToken = (token) => Promise<decoded>;
const extractToken = (authHeader) => tokenString | null;

// Composition для регистрации
const registerModerator = pipe(
  prepareRegistrationData,
  validateRegistrationData,
  checkUserExists,
  hashPassword,
  createInDB
);

// HOF для middleware
const authMiddleware = async (req, res, next) => {
  const token = extractToken(req.headers.authorization);
  const decoded = await verifyToken(token);
  req.user = decoded;
  next();
};
```

#### 4. **Tickets Module (tickets-functional.js)**
Pure functions для работы с заявками:

```javascript
// Валидаторы
const validateClientName = validate(predicate, 'error');
const validateEmail = validate(predicate, 'error');
const validateSubject = validate(predicate, 'error');
const validateMessage = validate(predicate, 'error');

// Трансформации данных
const prepareTicketData = (data) => ({ cleaned... });
const validateNewTicketData = (data) => { validate...; return data; };

// Composition для обогащения заявки
const formatTicketForClient = pipe(
  withTimingInfo,       // Добавляет информацию о времени
  withPriority,         // Добавляет приоритет
  publicizeTicket       // Убирает чувствительные данные
);

// Either монада для обработки ошибок
const createNewTicket = async (ticketData) => {
  try {
    const data = prepareTicketData(ticketData);
    validateNewTicketData(data);
    const result = await createTicket(...);
    return Right({ id: result.id, message: 'Success' });
  } catch (error) {
    return Left({ code: 'ERROR', message: error.message });
  }
};

// Использование Either
result.fold(
  (error) => res.status(400).json({ error: error.message }),
  (data) => res.status(201).json(data)
);
```

#### 5. **Server (index.js)**
Functional composition для инициализации:

```javascript
// Pure функции для создания приложения
const createApp = () => express();

const setupRoutes = (app) => {
  app.use('/api/auth', authRouter);
  app.use('/api/tickets', ticketsRouter);
  return app;
};

const setupHealthCheck = (app) => {
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  return app;
};

const setupErrorHandler = (app) => {
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });
  return app;
};

// Composition всей инициализации
const initializeServer = pipe(
  createApp,
  setupRoutes,
  setupHealthCheck,
  setupErrorHandler
);

const app = initializeServer();
startServer(app);
```

### Frontend (Vanilla JavaScript)

#### 1. **Main App (app-functional.js)**
Полностью функциональный подход:

```javascript
// Pure function для API вызовов
const makeApiCall = (token) => (endpoint, method = 'GET', body = null) =>
  fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    ...(body && { body: JSON.stringify(body) })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      return data;
    });

// HOF для создания функций API
const registerUser = (apiCall) => (username, email, password) =>
  apiCall('/auth/register', 'POST', { username, email, password });

const loginUser = (apiCall) => (username, password) =>
  apiCall('/auth/login', 'POST', { username, password });

// State Management через Closures
const createAppState = () => {
  let state = { /* initial state */ };

  const getState = () => ({ ...state });
  const setState = (updates) => {
    state = { ...state, ...updates };
    return getState();
  };

  return { getState, setState };
};

// Pure компоненты (функции, возвращающие HTML)
const LoginForm = () => `<div class="auth-container">...</div>`;
const RegisterForm = () => `<div class="auth-container">...</div>`;
const TicketCard = (ticket) => `<div class="ticket-card">...</div>`;
const TicketsList = (tickets) =>
  tickets.length === 0
    ? '<p>Нет заявок</p>'
    : `<div>${tickets.map(TicketCard).join('')}</div>`;

// Pure функции для обработки событий
const handleLogin = async (e) => {
  e.preventDefault();
  const username = getFormValue('username');
  const password = getFormValue('password');
  try {
    const data = await loginUser(window.apiCall)(username, password);
    window.appState.setState({ token: data.token, currentUser: data.user });
    render();
  } catch (err) {
    displayError('error-message', err.message);
  }
};
```

#### 2. **Web Component Widget (crm-widget.js)**
Web Component для встраивания в другие сайты:

```javascript
// Utility functions (pure)
const escapeHtml = (text) => { /* pure */ };
const isValidEmail = (email) => /regex/.test(email);
const createApiCaller = (baseUrl) => (endpoint, method, body) => { /* returns promise */ };
const createComponentState = (initialState) => {
  let state = initialState;
  return {
    getState: () => ({ ...state }),
    setState: (updates) => { state = { ...state, ...updates }; }
  };
};

// Web Component класс
class CRMWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = createComponentState({
      loading: false,
      submitted: false,
      errors: {},
      message: null
    });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  // Pure функция валидации
  validateForm(formData) {
    const errors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Минимум 2 символа';
    }
    if (!isValidEmail(formData.email)) {
      errors.email = 'Некорректный email';
    }
    // ... другие валидации
    return errors;
  }

  // Pure функция для получения данных формы
  getFormData() {
    return {
      name: form.getElementById('name')?.value || '',
      email: form.getElementById('email')?.value || '',
      // ...
    };
  }

  // Async функция обработки отправки
  handleSubmit = async (e) => {
    e.preventDefault();
    const formData = this.getFormData();
    const errors = this.validateForm(formData);

    if (Object.keys(errors).length > 0) {
      this.state.setState({ errors });
      this.render();
      return;
    }

    this.state.setState({ loading: true });
    try {
      const apiCall = createApiCaller(this.getApiUrl());
      const response = await apiCall('/tickets/create', 'POST', {
        client_name: formData.name,
        client_email: formData.email,
        subject: formData.subject,
        message: formData.message
      });

      this.state.setState({ submitted: true, loading: false });
      this.dispatchEvent(new CustomEvent('ticket-submitted', {
        detail: { ticketId: response.id, data: formData },
        bubbles: true,
        composed: true
      }));
    } catch (error) {
      this.state.setState({ loading: false, message: error.message });
    }
    this.render();
  };

  render() {
    const state = this.state.getState();
    // render logic...
  }
}

customElements.define('crm-widget', CRMWidget);
```

Использование в HTML:
```html
<crm-widget
  api-url="http://localhost:5000/api"
  title="Консультация по ДПУ"
  subtitle="Заполните форму и мы свяжемся с вами"
></crm-widget>

<script src="crm-widget.js"></script>
```

#### 3. **Personal Cabinet (cabinet.js)**
Личный кабинет модератора:

```javascript
// Pure функции selectors
const getUserTickets = (state) => state.tickets;
const getFilteredTickets = (state) => {
  let tickets = state.tickets;
  if (state.filter.status) {
    tickets = tickets.filter(t => t.status === state.filter.status);
  }
  // ... сортировка, фильтры
  return tickets;
};
const getCompletionRate = (state) => {
  const stats = state.stats;
  if (!stats || stats.total === 0) return 0;
  return Math.round(((stats.resolved || 0) + (stats.closed || 0)) / stats.total * 100);
};

// Pure функции трансформации
const enrichTicket = (ticket) => ({
  ...ticket,
  daysElapsed: calculateDaysElapsed(ticket.created_at),
  isOverdue: calculateDaysElapsed(ticket.created_at) > 7,
  isPriority: ticket.status === 'new' || ticket.status === 'in_progress'
});

// Pure компоненты
const CabinetHeader = (user) => `<div class="cabinet-header">...</div>`;
const StatCard = (title, value, icon) => `<div class="stat-card">...</div>`;
const DashboardTab = (state) => `<div>...</div>`;
const TicketsListTab = (state) => `<div>...</div>`;

// State management через closures
const createCabinetState = (initialState) => {
  let state = initialState;
  const getState = () => Object.freeze({ ...state });
  const setState = (updates) => {
    state = { ...state, ...updates };
    return getState();
  };
  return { getState, setState };
};

// Инициализация
window.cabinet.initialize = async (user, token, apiUrl) => {
  window.cabinet.apiCall = createAuthorizedApiCall(apiUrl, token);
  window.cabinet.state.setState({ user, token });

  const tickets = await window.cabinet.apiCall('/tickets/my');
  const stats = await window.cabinet.apiCall('/tickets/my-stats');

  window.cabinet.state.setState({
    tickets: enrichTickets(tickets),
    stats
  });

  renderCabinet();
};
```

Использование в HTML:
```html
<div id="cabinet-app"></div>

<script src="cabinet.js"></script>
<script>
  window.cabinet.initialize(
    userData,
    token,
    'http://localhost:5000/api'
  );
</script>
```

## Ключевые Концепции

### 1. Pure Functions
Функции, которые:
- Не имеют побочных эффектов
- Всегда возвращают одинаковый результат для одинаковых входных данных
- Не изменяют глобальное состояние

```javascript
// Pure ✓
const double = (x) => x * 2;
const add = (a, b) => a + b;
const validateEmail = (email) => /regex/.test(email);

// Impure ✗
let count = 0;
const increment = () => { count++; return count; } // Изменяет глобальное состояние

let logs = [];
const log = (msg) => { logs.push(msg); } // Побочный эффект

const getUser = (id) => fetch(...); // Побочный эффект (сетевой запрос)
```

### 2. Function Composition
Создание сложных функций из простых:

```javascript
// pipe - применение слева направо
const process = pipe(
  validate,
  transform,
  save,
  format
);

// compose - применение справа налево
const process = compose(
  format,
  save,
  transform,
  validate
);

// Использование
const result = await process(data);
```

### 3. Higher-Order Functions (HOF)
Функции, которые принимают или возвращают функции:

```javascript
// HOF для создания валидаторов
const createValidator = (predicate, message) => (value) => {
  if (!predicate(value)) throw new Error(message);
  return value;
};

const validateAge = createValidator((age) => age >= 18, 'Must be 18+');
const validateEmail = createValidator((email) => /regex/.test(email), 'Invalid email');

// HOF для API вызовов
const createApiCaller = (baseUrl, token) =>
  (endpoint, method = 'GET', body = null) =>
    fetch(`${baseUrl}${endpoint}`, { /* options */ });

const apiCall = createApiCaller('http://api.example.com', 'token123');
const users = await apiCall('/users');
```

### 4. Immutability
Не изменяем данные на месте, создаём новые версии:

```javascript
// Mutable ✗
const user = { name: 'John', age: 30 };
user.age = 31; // Изменение на месте

// Immutable ✓
const user = { name: 'John', age: 30 };
const updatedUser = { ...user, age: 31 }; // Новый объект

// Использование утилит
const updatedUser = merge(user, { age: 31 });
const onlyNameAndEmail = pick(['name', 'email'])(user);
const withoutPassword = omit(['password'])(user);
```

### 5. State Management через Closures
Управление состоянием без классов:

```javascript
const createState = (initialState) => {
  let state = initialState; // Замыкание

  return {
    getState: () => ({ ...state }),
    setState: (updates) => {
      state = { ...state, ...updates };
      return { ...state };
    },
    updateField: (field, value) => {
      state[field] = value;
      return { ...state };
    }
  };
};

const appState = createState({ currentUser: null, page: 'login' });

// Использование
appState.setState({ currentUser: user, page: 'dashboard' });
const current = appState.getState();
```

### 6. Error Handling с Either Монадой
Функциональный способ обработки ошибок:

```javascript
// Right - успешный результат
// Left - ошибка

const result = await registerUser(data);

result.fold(
  (error) => {
    console.error('Registration failed:', error.message);
    return { success: false, error };
  },
  (user) => {
    console.log('User created:', user);
    return { success: true, user };
  }
);
```

## Примеры Использования

### Backend - Регистрация пользователя

```javascript
// 1. Валидация
const validateUsername = validate(
  (username) => username && username.length >= 3 && username.length <= 50,
  'Username must be between 3 and 50 characters'
);

// 2. Подготовка данных (pure function)
const prepareRegistrationData = pipe(
  requireFields('username', 'email', 'password'),
  (data) => merge(data, {
    username: data.username.trim(),
    email: data.email.trim().toLowerCase()
  })
);

// 3. Валидация (pure function)
const validateRegistrationData = (data) => {
  validateUsername(data.username);
  validateEmail(data.email);
  validatePassword(data.password);
  return data;
};

// 4. Регистрация (async pure function with Either)
const registerModerator = async (registrationData) => {
  try {
    const data = prepareRegistrationData(registrationData);
    validateRegistrationData(data);

    const existingUser = await findModeratorByUsername(data.username);
    if (existingUser) {
      return Left({ code: 'USER_EXISTS', message: 'User already exists' });
    }

    const hashedPassword = await hashPassword(data.password);
    const result = await createModerator(data.username, data.email, hashedPassword);

    return Right({
      id: result.id,
      username: data.username,
      email: data.email
    });
  } catch (error) {
    return Left({ code: 'DB_ERROR', message: error.message });
  }
};

// 5. API маршрут (используя Either)
router.post('/register', async (req, res) => {
  const result = await registerModerator(req.body);

  result.fold(
    (error) => res.status(400).json({ error: error.message }),
    (user) => res.json({ message: 'Success', user })
  );
});
```

### Frontend - Форма логина

```javascript
// 1. Состояние через closure
const appState = createAppState();

// 2. API функция (HOF)
const apiCall = makeApiCall(appState.getState().token);

// 3. Pure компонент
const LoginForm = () => `
  <form onsubmit="handleLogin(event)">
    <input type="text" id="username" required>
    <input type="password" id="password" required>
    <button type="submit">Вход</button>
  </form>
`;

// 4. Обработчик события (async function)
const handleLogin = async (e) => {
  e.preventDefault();
  const username = getFormValue('username');
  const password = getFormValue('password');

  try {
    const data = await loginUser(apiCall)(username, password);

    saveToStorage('token', data.token);
    appState.setState({
      token: data.token,
      currentUser: data.user,
      currentPage: 'dashboard'
    });

    window.apiCall = makeApiCall(data.token);
    clearForm('username', 'password');
    render();
  } catch (err) {
    displayError('error-message', err.message);
  }
};
```

## Преимущества Функционального Стиля

1. **Тестируемость** - Pure functions легко тестировать
2. **Переиспользуемость** - Функции можно компоновать и переиспользовать
3. **Читаемость** - Явное описание потока данных
4. **Отладка** - Нет скрытых побочных эффектов
5. **Масштабируемость** - Композиция легче масштабируется
6. **Параллелизм** - Pure functions безопасны для параллельного исполнения

## Стек Технологий

- **Backend**: Node.js + Express + SQLite
- **Frontend**: Vanilla JavaScript (ES6+)
- **Web Components**: Shadow DOM
- **State Management**: Closures + Immutable patterns
- **Architecture**: Functional Programming, Composition, Pure Functions

## Запуск

### Backend
```bash
cd server
npm install
npm start
```

### Frontend
```bash
cd client
node server.js
```

### Использование виджета
```html
<crm-widget
  api-url="http://localhost:5000/api"
  title="Заявка на консультацию"
></crm-widget>
<script src="crm-widget.js"></script>
```

### Использование кабинета
```html
<div id="cabinet-app"></div>
<script src="cabinet.js"></script>
<script>
  window.cabinet.initialize(user, token, apiUrl);
</script>
```

## Файлы Проекта

### Backend
- `fp-utils.js` - Функциональные утилиты
- `db-functional.js` - Функциональный слой БД
- `auth-functional.js` - Функциональная аутентификация
- `tickets-functional.js` - Функциональное управление заявками
- `index.js` - Функциональная инициализация сервера

### Frontend
- `app-functional.js` - Основное приложение в функциональном стиле
- `crm-widget.js` - Web Component для встраивания
- `cabinet.js` - Личный кабинет модератора
- `style.css` - Стили приложения

## Авторство

Система разработана с использованием принципов функционального программирования для обеспечения чистоты кода, тестируемости и масштабируемости.

---

**Дата последнего обновления**: 2024-03-22
