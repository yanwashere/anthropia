# CRM System - Функциональное Программирование

Полная переделка CRM системы в функциональном стиле с использованием pure functions, composition паттернов, immutable state и higher-order functions.

## Что было сделано

### Backend Рефакторинг

#### ✅ Утилиты (fp-utils.js)
- **Композиция**: `pipe`, `compose` - создание pipeline из функций
- **Каррирование**: `curry`, `partial` - применение функций по частям
- **Трансформация**: `merge`, `pick`, `omit`, `mapObj`, `getIn`, `setIn`
- **Массивы**: `sortBy`, `groupBy`, `uniq`, `uniqBy`
- **Валидация**: `validate`, `validateAll`, `validateSchema`
- **Ошибки**: `tryCatch`, `handle`, `Maybe`, `Either (Right/Left)`
- **Утилиты**: `memoize`, `debounce`, `throttle`, `tap`

```javascript
// Пример использования
const processPerson = pipe(
  validate,
  transform,
  save,
  format
);

const result = await processPerson(data);
```

#### ✅ Database Layer (db-functional.js)
Все операции с БД - pure functions:
- `createModerator`, `findModeratorByUsername`, `findModeratorById`
- `createTicket`, `findTicketById`, `getAllTickets`, `getUserTickets`
- `getUnassignedTickets`, `getTicketsByStatus`
- `assignTicketToUser`, `updateTicketStatus`, `getTicketsStats`

#### ✅ Authentication (auth-functional.js)
Функциональный подход к аутентификации:
- Pure валидаторы: `validateUsername`, `validateEmail`, `validatePassword`
- Pure криптография: `hashPassword`, `comparePassword`
- JWT операции: `createToken`, `verifyToken`, `extractToken`
- Composition: `registerModerator`, `authenticateUser`
- Middleware: `authMiddleware`, `requireRole`, `handleAuthError`
- Either монада для обработки результатов

#### ✅ Tickets Module (tickets-functional.js)
Pure functions для работы с заявками:
- Валидаторы для всех полей
- Трансформации: `prepareTicketData`, `validateNewTicketData`
- Composition: `formatTicketForClient = pipe(withTimingInfo, withPriority, publicizeTicket)`
- Either монада для обработки ошибок
- Business logic: `createNewTicket`, `getFilteredTickets`, `assignTicket`, `changeTicketStatus`

#### ✅ Server (index.js)
Functional composition для инициализации:
```javascript
const initializeServer = pipe(
  createApp,
  setupRoutes,
  setupHealthCheck,
  setupErrorHandler,
  setup404Handler
);
```

### Frontend Рефакторинг

#### ✅ Main App (app-functional.js)
Полностью функциональное приложение (451 строка):
- **Utilities**: `escapeHtml`, `getFromStorage`, `saveToStorage`, `isValidEmail`
- **API Functions** (HOF): `makeApiCall`, `registerUser`, `loginUser`, `fetchProfile`
- **State Management**: `createAppState` (замыкания)
- **Pure Components**: `LoginForm`, `RegisterForm`, `TicketCard`, `TicketsList`, `TabPanel`
- **Handlers**: `handleLogin`, `handleRegister`, `handleCreateTicket`, `handleAssignTicket`
- **Navigation**: `goToPage`, `goToTicket`, `logout`
- **Rendering**: `render`, `initializeApp`

```javascript
// State через closures
const appState = createAppState();
const apiCall = makeApiCall(token);

// Pure компоненты
const LoginForm = () => `<div>...</div>`;
const TicketCard = (ticket) => `<div>...</div>`;
```

#### ✅ Web Component Widget (crm-widget.js)
Независимый Widget для встраивания в другие сайты (350+ строк):
- Encapsulation через Shadow DOM
- State management через closures
- Pure validation functions
- Async form handling with Either-like error handling
- Custom events для коммуникации

```html
<!-- Использование -->
<crm-widget
  api-url="http://localhost:5000/api"
  title="Заявка на консультацию"
  subtitle="Заполните форму"
></crm-widget>
<script src="crm-widget.js"></script>
```

#### ✅ Personal Cabinet (cabinet.js)
Личный кабинет модератора в функциональном стиле (550+ строк):
- **Selectors** (Pure): `getUserTickets`, `getFilteredTickets`, `getCompletionRate`
- **Transformations** (Pure): `enrichTicket`, `enrichTickets`
- **Components** (Pure): `CabinetHeader`, `StatCard`, `DashboardTab`, `TicketsListTab`
- **State Management**: `createCabinetState`
- **API Integration**: `createAuthorizedApiCall` (HOF)
- **Event Handlers**: async functions для обновления
- **Rendering**: `renderCabinet`

## Файловая Структура

```
crm/
├── server/
│   ├── fp-utils.js              ✅ Функциональные утилиты (313 строк)
│   ├── db-functional.js          ✅ Pure функции для БД (310 строк)
│   ├── auth-functional.js        ✅ Функциональная аутентификация (332 строки)
│   ├── tickets-functional.js     ✅ Функциональное управление заявками (458 строк)
│   ├── index.js                  ✅ Functional composition сервера (71 строка)
│   ├── package.json
│   └── crm.db                    (SQLite база данных)
│
├── client/
│   ├── app-functional.js         ✅ Основное приложение (451 строка)
│   ├── crm-widget.js             ✅ Web Component Widget (350+ строк)
│   ├── cabinet.js                ✅ Личный кабинет (550+ строк)
│   ├── cabinet.html              ✅ HTML для кабинета
│   ├── index.html                ✅ HTML для основного приложения
│   ├── style.css                 (Стили)
│   └── server.js
│
├── examples/
│   ├── widget-integration.html   ✅ Примеры встраивания виджета
│   └── fp-examples.js            ✅ 8 примеров функционального стиля
│
├── FUNCTIONAL_GUIDE.md           ✅ Полное руководство (550+ строк)
├── README_FUNCTIONAL.md          ✅ Этот файл
└── README.md                     (Оригинальное описание)
```

## Ключевые Концепции

### 1. Pure Functions
```javascript
// Pure ✓
const double = (x) => x * 2;
const isValidEmail = (email) => /regex/.test(email);

// Impure ✗
let count = 0;
const increment = () => { count++; } // Побочный эффект
```

### 2. Function Composition
```javascript
const process = pipe(
  validate,
  transform,
  save,
  format
);

const result = await process(data);
```

### 3. Higher-Order Functions
```javascript
const createApiCaller = (baseUrl, token) =>
  (endpoint, method = 'GET', body = null) =>
    fetch(`${baseUrl}${endpoint}`, { /* options */ });

const apiCall = createApiCaller('http://api.com', 'token');
```

### 4. Immutability
```javascript
// Mutable ✗
user.age = 31;

// Immutable ✓
const updatedUser = { ...user, age: 31 };
const updatedUser = merge(user, { age: 31 });
```

### 5. State via Closures
```javascript
const createAppState = () => {
  let state = { /* initial */ };

  return {
    getState: () => ({ ...state }),
    setState: (updates) => {
      state = { ...state, ...updates };
      return state;
    }
  };
};
```

### 6. Either Монада
```javascript
const result = await registerUser(data);

result.fold(
  (error) => handleError(error),
  (user) => handleSuccess(user)
);
```

## Запуск

### Backend
```bash
cd server
npm install  # если нужно
npm start
# Server running on http://localhost:5000
```

### Frontend
```bash
cd client
node server.js
# Frontend on http://localhost:3000
```

## Использование Компонентов

### 1. Main App
```html
<div id="app"></div>
<script src="app-functional.js"></script>
```

### 2. Web Component Widget
```html
<crm-widget
  api-url="http://localhost:5000/api"
  title="Консультация по ДПУ"
  subtitle="Заполните форму"
></crm-widget>
<script src="crm-widget.js"></script>

<!-- Обработка событий -->
<script>
  document.querySelector('crm-widget')
    .addEventListener('ticket-submitted', (e) => {
      console.log('Заявка:', e.detail);
    });
</script>
```

### 3. Personal Cabinet
```html
<div id="cabinet-app"></div>
<script src="cabinet.js"></script>
<script>
  window.cabinet.initialize(user, token, apiUrl);
</script>
```

## Примеры Функционального Кода

### Pipeline Composition
```javascript
const createTicketPipeline = pipe(
  validateTicketData,      // Pure function
  cleanTicketData,         // Pure function
  enrichWithTimestamp,     // Pure function
  saveTicket              // Async pure function
);

const result = await createTicketPipeline(rawData);
```

### HOF для Фильтрации
```javascript
const createTicketFilter = (predicate) => (tickets) =>
  tickets.filter(predicate);

const filterNewTickets = createTicketFilter((t) => t.status === 'new');
const filterUnassigned = createTicketFilter((t) => !t.assigned_to);

const newUnassigned = pipe(
  filterNewTickets,
  filterUnassigned
)(allTickets);
```

### State Management
```javascript
const appState = createAppState();

appState.setState({ currentUser: user, page: 'dashboard' });
const state = appState.getState(); // Замороженный объект
```

### Обработка Ошибок
```javascript
const result = await registerUser(data);

result.fold(
  (error) => {
    console.error('Error:', error.message);
    return { success: false };
  },
  (user) => {
    console.log('Success:', user);
    return { success: true, user };
  }
);
```

## Преимущества

✅ **Тестируемость** - Pure functions легко тестировать
✅ **Переиспользуемость** - Функции можно компоновать
✅ **Читаемость** - Явный поток данных
✅ **Отладка** - Нет скрытых побочных эффектов
✅ **Масштабируемость** - Composition масштабируется
✅ **Безопасность** - Immutability предотвращает ошибки
✅ **Параллелизм** - Pure functions безопасны для параллельных операций

## Примеры в /examples

- `widget-integration.html` - Полный пример встраивания виджета
- `fp-examples.js` - 8 практических примеров функционального стиля

## Документация

- `FUNCTIONAL_GUIDE.md` - Полное руководство (550+ строк)
  - Architecture overview
  - Code examples
  - Best practices
  - Integration patterns
  - Advanced concepts

## Статистика

- **Всего кода**: ~4000+ строк функционального JavaScript
- **Pure functions**: 100+ функций без побочных эффектов
- **Composition patterns**: 15+ примеров composition
- **HOF примеры**: 10+ примеров higher-order functions
- **API endpoints**: 10 endpoints с функциональной обработкой
- **State management**: 3 реализации через closures
- **Web Components**: 1 полнофункциональный widget

## Технологический Стек

- **Backend**: Node.js + Express + SQLite
- **Frontend**: Vanilla JavaScript (ES6+)
- **Components**: Web Components + Shadow DOM
- **Architecture**: Functional Programming
- **Patterns**: Composition, Pure Functions, Immutability
- **Error Handling**: Either Monad

## API Endpoints (Функциональные)

### Authentication
- `POST /api/auth/register` - Регистрация (функциональная обработка)
- `POST /api/auth/login` - Логин (Either монада)
- `GET /api/auth/profile` - Профиль (middleware pipeline)
- `GET /api/auth/verify` - Проверка токена

### Tickets
- `POST /api/tickets/create` - Создать заявку (pure functions)
- `GET /api/tickets/all` - Все заявки (composition фильтров)
- `GET /api/tickets/my` - Мои заявки
- `GET /api/tickets/unassigned` - Нераспределённые
- `GET /api/tickets/:id` - Одна заявка
- `POST /api/tickets/:id/assign` - Назначить себе
- `POST /api/tickets/:id/status` - Изменить статус
- `GET /api/tickets/stats` - Статистика
- `GET /api/tickets/my-stats` - Личная статистика

## Тестирование

### Демо-аккаунт
- Username: `demo`
- Password: `password123`

### Тестовые заявки
Создаются через форму "Новая заявка" или через Web Component

## Быстрый Старт

1. **Запустить backend**:
   ```bash
   cd server && npm start
   ```

2. **Запустить frontend**:
   ```bash
   cd client && node server.js
   ```

3. **Открыть в браузере**:
   - Main app: http://localhost:3000
   - Widget example: http://localhost:3000/widget-example.html
   - Cabinet: http://localhost:3000/cabinet.html

4. **Зарегистрироваться и использовать**

## Контакты

Система разработана с использованием функционального программирования для обеспечения максимальной чистоты кода, тестируемости и масштабируемости.

---

**Версия**: 2.0 (Функциональный стиль)
**Дата**: 2024-03-22
**Язык**: JavaScript (ES6+)
**Лицензия**: ISC
