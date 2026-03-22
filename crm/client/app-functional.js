/**
 * CRM Frontend - Функциональный стиль программирования
 * Pure functions, state through closures, function composition
 * No side effects, immutable state transformations
 */

// ============ Constants ============

const API_URL = 'http://localhost:5001/api';

// ============ Utility Functions ============

/**
 * Безопасное экранирование HTML
 */
const escapeHtml = (text) => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
};

/**
 * Функция для безопасного получения значения из localStorage
 */
const getFromStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn(`Failed to parse localStorage item: ${key}`);
    return defaultValue;
  }
};

/**
 * Функция для сохранения в localStorage
 */
const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`Failed to save to localStorage: ${key}`);
    return false;
  }
};

/**
 * Функция для удаления из localStorage
 */
const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.warn(`Failed to remove from localStorage: ${key}`);
    return false;
  }
};

/**
 * Трансляция статуса заявки
 */
const getStatusLabel = (status) => {
  const labels = {
    'new': 'Новая',
    'in_progress': 'В работе',
    'resolved': 'Решено',
    'closed': 'Закрыто'
  };
  return labels[status] || status;
};

/**
 * Форматирование даты и времени
 */
const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Валидация email
 */
const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * Валидация пароля
 */
const isValidPassword = (password) =>
  password && password.length >= 6;

// ============ API Functions (Pure Functions with Side Effects) ============

/**
 * Обобщённая функция для API вызовов
 */
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

/**
 * Регистрация пользователя
 */
const registerUser = (apiCall) => (username, email, password) =>
  apiCall('/auth/register', 'POST', { username, email, password });

/**
 * Вход в систему
 */
const loginUser = (apiCall) => (username, password) =>
  apiCall('/auth/login', 'POST', { username, password });

/**
 * Проверка профиля
 */
const fetchProfile = (apiCall) => () =>
  apiCall('/auth/profile', 'GET');

/**
 * Получить все заявки
 */
const fetchAllTickets = (apiCall) => () =>
  apiCall('/tickets/all', 'GET');

/**
 * Получить мои заявки
 */
const fetchMyTickets = (apiCall) => () =>
  apiCall('/tickets/my', 'GET');

/**
 * Получить одну заявку
 */
const fetchTicket = (apiCall) => (id) =>
  apiCall(`/tickets/${id}`, 'GET');

/**
 * Создать заявку
 */
const createNewTicket = (apiCall) => (clientName, clientEmail, subject, message) =>
  apiCall('/tickets/create', 'POST', { client_name: clientName, client_email: clientEmail, subject, message });

/**
 * Назначить заявку себе
 */
const assignTicketToMe = (apiCall) => (id) =>
  apiCall(`/tickets/${id}/assign`, 'POST', {});

/**
 * Обновить статус заявки
 */
const updateStatus = (apiCall) => (id, status) =>
  apiCall(`/tickets/${id}/status`, 'POST', { status });

// ============ State Management через Closures ============

/**
 * Создатель состояния приложения
 * Возвращает функцию для получения и изменения состояния
 */
const createAppState = () => {
  let state = {
    currentPage: 'login',
    currentUser: null,
    token: getFromStorage('token'),
    currentTicketId: null,
    tickets: [],
    myTickets: [],
    currentTicket: null,
    loading: false,
    error: null
  };

  const getState = () => ({ ...state });

  const setState = (updates) => {
    state = { ...state, ...updates };
    return getState();
  };

  const updateField = (field, value) => setState({ [field]: value });

  const clearError = () => setState({ error: null });

  return { getState, setState, updateField, clearError };
};

// ============ Form Handlers ============

/**
 * Функция для получения значения инпута с валидацией
 */
const getFormValue = (id) => {
  const element = document.getElementById(id);
  return element ? element.value : '';
};

/**
 * Функция для очистки инпутов
 */
const clearForm = (...ids) => {
  ids.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.value = '';
  });
};

/**
 * Функция для показания ошибки
 */
const displayError = (errorId, message) => {
  const element = document.getElementById(errorId);
  if (element) {
    element.innerHTML = message ? `<div class="error">${escapeHtml(message)}</div>` : '';
  }
};

/**
 * Функция для показания успеха
 */
const displaySuccess = (elementId, message) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<div class="success">✓ ${escapeHtml(message)}</div>`;
  }
};

// ============ Component Rendering (Pure Functions) ============

/**
 * Компонент логин-формы
 */
const LoginForm = () => `
  <div class="auth-container">
    <h1>Вход в CRM</h1>
    <div id="error-message"></div>
    <form onsubmit="handleLogin(event)">
      <div class="form-group">
        <label>Имя пользователя</label>
        <input type="text" id="username" required placeholder="Введите имя">
      </div>
      <div class="form-group">
        <label>Пароль</label>
        <input type="password" id="password" required placeholder="Введите пароль">
      </div>
      <button type="submit">Войти</button>
    </form>
    <div class="auth-link">
      Нет аккаунта? <a onclick="goToPage('register')">Зарегистрироваться</a>
    </div>
  </div>
`;

/**
 * Компонент регистрации
 */
const RegisterForm = () => `
  <div class="auth-container">
    <h1>Регистрация модератора</h1>
    <div id="error-message"></div>
    <form onsubmit="handleRegister(event)">
      <div class="form-group">
        <label>Имя пользователя</label>
        <input type="text" id="username" required placeholder="3-50 символов">
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="email" required placeholder="your@email.com">
      </div>
      <div class="form-group">
        <label>Пароль</label>
        <input type="password" id="password" required placeholder="Минимум 6 символов">
      </div>
      <button type="submit">Зарегистрироваться</button>
    </form>
    <div class="auth-link">
      Уже есть аккаунт? <a onclick="goToPage('login')">Войти</a>
    </div>
  </div>
`;

/**
 * Компонент карточки заявки
 */
const TicketCard = (ticket) => `
  <div class="ticket-card" onclick="goToTicket(${ticket.id})">
    <div class="ticket-header">
      <div class="ticket-title">${escapeHtml(ticket.subject)}</div>
      <span class="ticket-status status-${ticket.status}">${getStatusLabel(ticket.status)}</span>
    </div>
    <div class="ticket-meta">
      <div>👤 ${escapeHtml(ticket.client_name)}</div>
      <div>📧 ${escapeHtml(ticket.client_email)}</div>
      <div>📅 ${formatDateTime(ticket.created_at)}</div>
    </div>
    <div class="ticket-message">${escapeHtml(ticket.message.substring(0, 100))}...</div>
  </div>
`;

/**
 * Компонент списка заявок
 */
const TicketsList = (tickets) =>
  tickets.length === 0
    ? '<p style="text-align: center; color: #999;">Нет заявок</p>'
    : `<div class="tickets-list">${tickets.map(TicketCard).join('')}</div>`;

/**
 * Компонент информационного блока
 */
const InfoBlock = (label, value) => `
  <div class="info-block">
    <div class="info-label">${escapeHtml(label)}</div>
    <div class="info-value">${escapeHtml(value || '-')}</div>
  </div>
`;

/**
 * Компонент деталей заявки
 */
const TicketDetailView = (ticket) => `
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>CRM - Управление заявками</h1>
      <div class="user-info">
        <span>👤 ${escapeHtml(window.appState?.getState()?.currentUser?.username || 'User')}</span>
        <button class="logout-btn" onclick="logout()">Выход</button>
      </div>
    </div>
    <div class="dashboard-content">
      <button class="back-button" onclick="goToPage('all-tickets')">← Назад к заявкам</button>
      <div class="ticket-detail">
        <div class="detail-header">
          <h2>${escapeHtml(ticket.subject)}</h2>
          <span class="ticket-status status-${ticket.status}">${getStatusLabel(ticket.status)}</span>
        </div>
        <div class="detail-info">
          ${InfoBlock('Имя клиента', ticket.client_name)}
          ${InfoBlock('Email клиента', ticket.client_email)}
          ${InfoBlock('Создана', formatDateTime(ticket.created_at))}
          ${InfoBlock('Назначена', ticket.moderator_name || 'Не назначена')}
        </div>
        <div class="detail-message">
          <strong>Сообщение:</strong><br>
          ${escapeHtml(ticket.message)}
        </div>
        <div class="action-buttons">
          ${!ticket.assigned_to ? `<button onclick="handleAssignTicket(${ticket.id})">Принять заявку</button>` : ''}
          <button onclick="handleChangeStatus(${ticket.id}, 'in_progress')" ${ticket.status === 'in_progress' ? 'disabled' : ''}>В работе</button>
          <button onclick="handleChangeStatus(${ticket.id}, 'resolved')" ${ticket.status === 'resolved' ? 'disabled' : ''}>Решено</button>
          <button onclick="handleChangeStatus(${ticket.id}, 'closed')" ${ticket.status === 'closed' ? 'disabled' : ''}>Закрыто</button>
        </div>
      </div>
    </div>
  </div>
`;

/**
 * Компонент форма создания заявки
 */
const NewTicketForm = () => `
  <div class="new-ticket-form">
    <h2>Создать новую заявку</h2>
    <div id="error-message"></div>
    <form onsubmit="handleCreateTicket(event)">
      <div class="form-group">
        <label>Ваше имя</label>
        <input type="text" id="client-name" required placeholder="Полное имя">
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="client-email" required placeholder="your@email.com">
      </div>
      <div class="form-group">
        <label>Тема</label>
        <input type="text" id="subject" required placeholder="Краткая тема заявки">
      </div>
      <div class="form-group">
        <label>Описание</label>
        <textarea id="message" required placeholder="Подробное описание проблемы"></textarea>
      </div>
      <button type="submit">Создать заявку</button>
    </form>
  </div>
`;

/**
 * Компонент таб-панели
 */
const TabPanel = (currentPage, userName) => `
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>CRM - Управление заявками</h1>
      <div class="user-info">
        <span>👤 ${escapeHtml(userName)}</span>
        <button class="logout-btn" onclick="logout()">Выход</button>
      </div>
    </div>
    <div class="tabs">
      <button class="tab ${currentPage === 'all-tickets' ? 'active' : ''}" onclick="goToPage('all-tickets')">Все заявки</button>
      <button class="tab ${currentPage === 'my-tickets' ? 'active' : ''}" onclick="goToPage('my-tickets')">Мои заявки</button>
      <button class="tab ${currentPage === 'new-ticket' ? 'active' : ''}" onclick="goToPage('new-ticket')">Новая заявка</button>
    </div>
    <div class="dashboard-content">
      <div id="tab-content"></div>
    </div>
  </div>
`;

// ============ Global App Initialization ============

// Создаём глобальное состояние приложения
window.appState = createAppState();
window.apiCall = makeApiCall(window.appState.getState().token);

/**
 * Функция рендеринга приложения
 */
const render = () => {
  const app = document.getElementById('app');
  const state = window.appState.getState();

  if (!state.currentUser) {
    app.innerHTML = state.currentPage === 'login' ? LoginForm() : RegisterForm();
  } else if (state.currentTicketId) {
    // Загрузка деталей заявки в фоне
    window.apiCall(`/tickets/${state.currentTicketId}`)
      .then(ticket => {
        app.innerHTML = TicketDetailView(ticket);
      })
      .catch(err => {
        app.innerHTML = `<div class="error">Ошибка загрузки: ${escapeHtml(err.message)}</div>`;
      });
  } else {
    app.innerHTML = TabPanel(state.currentPage, state.currentUser.username);

    // Загрузка контента таба
    const tabContent = document.getElementById('tab-content');

    if (state.currentPage === 'all-tickets') {
      window.apiCall('/tickets/all')
        .then(tickets => {
          tabContent.innerHTML = TicketsList(tickets);
        })
        .catch(err => {
          tabContent.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
        });
    } else if (state.currentPage === 'my-tickets') {
      window.apiCall('/tickets/my')
        .then(tickets => {
          tabContent.innerHTML = TicketsList(tickets);
        })
        .catch(err => {
          tabContent.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
        });
    } else if (state.currentPage === 'new-ticket') {
      tabContent.innerHTML = NewTicketForm();
    }
  }
};

/**
 * Функция инициализации приложения
 */
const initializeApp = () => {
  const state = window.appState.getState();

  if (state.token) {
    // Если есть токен, проверяем профиль
    window.apiCall = makeApiCall(state.token);
    fetchProfile(window.apiCall)()
      .then(user => {
        window.appState.setState({
          currentUser: user,
          currentPage: 'all-tickets'
        });
        render();
      })
      .catch(err => {
        removeFromStorage('token');
        window.appState.setState({
          token: null,
          currentUser: null,
          currentPage: 'login'
        });
        render();
      });
  } else {
    render();
  }
};

// ============ Event Handlers ============

/**
 * Обработчик входа
 */
const handleLogin = async (e) => {
  e.preventDefault();
  const username = getFormValue('username');
  const password = getFormValue('password');
  const errorDiv = document.getElementById('error-message');

  try {
    displayError('error-message', '');
    const data = await loginUser(window.apiCall)(username, password);

    saveToStorage('token', data.token);
    window.appState.setState({
      token: data.token,
      currentUser: data.user,
      currentPage: 'all-tickets'
    });
    window.apiCall = makeApiCall(data.token);
    clearForm('username', 'password');
    render();
  } catch (err) {
    displayError('error-message', err.message);
  }
};

/**
 * Обработчик регистрации
 */
const handleRegister = async (e) => {
  e.preventDefault();
  const username = getFormValue('username');
  const email = getFormValue('email');
  const password = getFormValue('password');

  try {
    displayError('error-message', '');

    await registerUser(window.apiCall)(username, email, password);
    displaySuccess('error-message', 'Регистрация успешна! Теперь войдите.');
    clearForm('username', 'email', 'password');

    setTimeout(() => {
      window.appState.setState({ currentPage: 'login' });
      render();
    }, 1500);
  } catch (err) {
    displayError('error-message', err.message);
  }
};

/**
 * Обработчик создания заявки
 */
const handleCreateTicket = async (e) => {
  e.preventDefault();
  const clientName = getFormValue('client-name');
  const clientEmail = getFormValue('client-email');
  const subject = getFormValue('subject');
  const message = getFormValue('message');

  try {
    displayError('error-message', '');
    await createNewTicket(window.apiCall)(clientName, clientEmail, subject, message);
    displaySuccess('error-message', 'Заявка создана успешно!');
    clearForm('client-name', 'client-email', 'subject', 'message');

    setTimeout(() => {
      window.appState.setState({ currentPage: 'all-tickets' });
      render();
    }, 1500);
  } catch (err) {
    displayError('error-message', err.message);
  }
};

/**
 * Обработчик назначения заявки
 */
const handleAssignTicket = async (id) => {
  try {
    await assignTicketToMe(window.apiCall)(id);
    goToTicket(id);
  } catch (err) {
    alert(`Ошибка: ${err.message}`);
  }
};

/**
 * Обработчик изменения статуса
 */
const handleChangeStatus = async (id, status) => {
  try {
    await updateStatus(window.apiCall)(id, status);
    goToTicket(id);
  } catch (err) {
    alert(`Ошибка: ${err.message}`);
  }
};

/**
 * Навигация на страницу
 */
const goToPage = (page) => {
  window.appState.setState({
    currentPage: page,
    currentTicketId: null
  });
  render();
};

/**
 * Навигация на деталь заявки
 */
const goToTicket = (id) => {
  window.appState.setState({
    currentTicketId: id
  });
  render();
};

/**
 * Выход из системы
 */
const logout = () => {
  removeFromStorage('token');
  window.appState.setState({
    token: null,
    currentUser: null,
    currentPage: 'login',
    currentTicketId: null
  });
  window.apiCall = makeApiCall(null);
  render();
};

// ============ DOM Ready ============

window.addEventListener('DOMContentLoaded', initializeApp);
