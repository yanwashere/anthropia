const API_URL = 'http://localhost:5000/api';

// State
let currentPage = 'login';
let currentUser = null;
let token = localStorage.getItem('token');
let currentTicketId = null;

// Init
window.addEventListener('DOMContentLoaded', () => {
  if (token) {
    verifyToken();
  } else {
    render();
  }
});

// API Calls
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API Error');
  }

  return data;
}

async function verifyToken() {
  try {
    const profile = await apiCall('/auth/profile');
    currentUser = profile;
    currentPage = 'dashboard';
    render();
  } catch (err) {
    logout();
  }
}

async function register(username, email, password) {
  const data = await apiCall('/auth/register', 'POST', {
    username,
    email,
    password
  });
  return data;
}

async function login(username, password) {
  const data = await apiCall('/auth/login', 'POST', {
    username,
    password
  });
  token = data.token;
  currentUser = data.user;
  localStorage.setItem('token', token);
  currentPage = 'dashboard';
  return data;
}

async function logout() {
  token = null;
  currentUser = null;
  currentPage = 'login';
  localStorage.removeItem('token');
  render();
}

async function getTickets() {
  return apiCall('/tickets/all');
}

async function getMyTickets() {
  return apiCall('/tickets/my');
}

async function getTicket(id) {
  return apiCall(`/tickets/${id}`);
}

async function assignTicket(id) {
  return apiCall(`/tickets/${id}/assign`, 'POST', {});
}

async function updateTicketStatus(id, status) {
  return apiCall(`/tickets/${id}/status`, 'POST', { status });
}

async function createTicket(clientName, clientEmail, subject, message) {
  return apiCall('/tickets/create', 'POST', {
    client_name: clientName,
    client_email: clientEmail,
    subject,
    message
  });
}

// Navigation
function goToPage(page) {
  currentPage = page;
  currentTicketId = null;
  render();
}

function goToTicket(id) {
  currentTicketId = id;
  currentPage = 'dashboard';
  render();
}

// Render
function render() {
  const app = document.getElementById('app');

  if (!currentUser) {
    app.innerHTML = currentPage === 'login' ? renderLogin() : renderRegister();
  } else {
    app.innerHTML = renderDashboard();
  }
}

function renderLogin() {
  return `
    <div class="auth-container">
      <h1>Вход в CRM</h1>
      <div id="error-message"></div>
      <form onsubmit="handleLogin(event)">
        <div class="form-group">
          <label>Имя пользователя</label>
          <input type="text" id="username" required>
        </div>
        <div class="form-group">
          <label>Пароль</label>
          <input type="password" id="password" required>
        </div>
        <button type="submit">Войти</button>
      </form>
      <div class="auth-link">
        Нет аккаунта? <a onclick="goToPage('register')">Зарегистрироваться</a>
      </div>
    </div>
  `;
}

function renderRegister() {
  return `
    <div class="auth-container">
      <h1>Регистрация модератора</h1>
      <div id="error-message"></div>
      <form onsubmit="handleRegister(event)">
        <div class="form-group">
          <label>Имя пользователя</label>
          <input type="text" id="username" required>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="email" required>
        </div>
        <div class="form-group">
          <label>Пароль</label>
          <input type="password" id="password" required>
        </div>
        <button type="submit">Зарегистрироваться</button>
      </form>
      <div class="auth-link">
        Уже есть аккаунт? <a onclick="goToPage('login')">Войти</a>
      </div>
    </div>
  `;
}

function renderDashboard() {
  if (currentTicketId) {
    return renderTicketDetail();
  }

  return `
    <div class="dashboard">
      <div class="dashboard-header">
        <h1>CRM - Управление заявками</h1>
        <div class="user-info">
          <span>👤 ${currentUser.username}</span>
          <button class="logout-btn" onclick="logout()">Выход</button>
        </div>
      </div>
      <div class="tabs">
        <button class="tab ${currentPage === 'all-tickets' ? 'active' : ''}" onclick="goToPage('all-tickets')">Все заявки</button>
        <button class="tab ${currentPage === 'my-tickets' ? 'active' : ''}" onclick="goToPage('my-tickets')">Мои заявки</button>
        <button class="tab ${currentPage === 'new-ticket' ? 'active' : ''}" onclick="goToPage('new-ticket')">Новая заявка</button>
      </div>
      <div class="dashboard-content">
        ${currentPage === 'all-tickets' ? await renderAllTickets() : ''}
        ${currentPage === 'my-tickets' ? await renderMyTickets() : ''}
        ${currentPage === 'new-ticket' ? renderNewTicketForm() : ''}
      </div>
    </div>
  `;
}

async function renderAllTickets() {
  try {
    const tickets = await getTickets();
    if (tickets.length === 0) {
      return '<p style="text-align: center; color: #999;">Нет заявок</p>';
    }
    return `
      <div class="tickets-list">
        ${tickets.map(t => `
          <div class="ticket-card" onclick="goToTicket(${t.id})">
            <div class="ticket-header">
              <div class="ticket-title">${escapeHtml(t.subject)}</div>
              <span class="ticket-status status-${t.status}">${translateStatus(t.status)}</span>
            </div>
            <div class="ticket-meta">
              <div>👤 ${escapeHtml(t.client_name)}</div>
              <div>📧 ${escapeHtml(t.client_email)}</div>
              <div>📅 ${new Date(t.created_at).toLocaleString('ru-RU')}</div>
            </div>
            <div class="ticket-message">${escapeHtml(t.message.substring(0, 100))}...</div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    return `<div class="error">${escapeHtml(err.message)}</div>`;
  }
}

async function renderMyTickets() {
  try {
    const tickets = await getMyTickets();
    if (tickets.length === 0) {
      return '<p style="text-align: center; color: #999;">У вас нет назначенных заявок</p>';
    }
    return `
      <div class="tickets-list">
        ${tickets.map(t => `
          <div class="ticket-card" onclick="goToTicket(${t.id})">
            <div class="ticket-header">
              <div class="ticket-title">${escapeHtml(t.subject)}</div>
              <span class="ticket-status status-${t.status}">${translateStatus(t.status)}</span>
            </div>
            <div class="ticket-meta">
              <div>👤 ${escapeHtml(t.client_name)}</div>
              <div>📧 ${escapeHtml(t.client_email)}</div>
            </div>
            <div class="ticket-message">${escapeHtml(t.message.substring(0, 100))}...</div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    return `<div class="error">${escapeHtml(err.message)}</div>`;
  }
}

function renderNewTicketForm() {
  return `
    <div class="new-ticket-form">
      <h2>Создать новую заявку</h2>
      <div id="error-message"></div>
      <form onsubmit="handleCreateTicket(event)">
        <div class="form-group">
          <label>Ваше имя</label>
          <input type="text" id="client-name" required>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="client-email" required>
        </div>
        <div class="form-group">
          <label>Тема</label>
          <input type="text" id="subject" required>
        </div>
        <div class="form-group">
          <label>Описание</label>
          <textarea id="message" required></textarea>
        </div>
        <button type="submit">Создать заявку</button>
      </form>
    </div>
  `;
}

async function renderTicketDetail() {
  try {
    const ticket = await getTicket(currentTicketId);
    return `
      <div class="dashboard">
        <div class="dashboard-header">
          <h1>CRM - Управление заявками</h1>
          <div class="user-info">
            <span>👤 ${currentUser.username}</span>
            <button class="logout-btn" onclick="logout()">Выход</button>
          </div>
        </div>
        <div class="dashboard-content">
          <button class="back-button" onclick="goToPage('all-tickets')">← Назад к заявкам</button>
          <div class="ticket-detail">
            <div class="detail-header">
              <h2>${escapeHtml(ticket.subject)}</h2>
              <span class="ticket-status status-${ticket.status}">${translateStatus(ticket.status)}</span>
            </div>
            <div class="detail-info">
              <div class="info-block">
                <div class="info-label">Имя клиента</div>
                <div class="info-value">${escapeHtml(ticket.client_name)}</div>
              </div>
              <div class="info-block">
                <div class="info-label">Email клиента</div>
                <div class="info-value">${escapeHtml(ticket.client_email)}</div>
              </div>
              <div class="info-block">
                <div class="info-label">Создана</div>
                <div class="info-value">${new Date(ticket.created_at).toLocaleString('ru-RU')}</div>
              </div>
              <div class="info-block">
                <div class="info-label">Назначена</div>
                <div class="info-value">${ticket.moderator_name || 'Не назначена'}</div>
              </div>
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
  } catch (err) {
    return `
      <div class="dashboard">
        <div class="dashboard-header">
          <h1>CRM</h1>
          <button class="logout-btn" onclick="logout()">Выход</button>
        </div>
        <div class="dashboard-content">
          <button class="back-button" onclick="goToPage('all-tickets')">← Назад</button>
          <div class="error">${escapeHtml(err.message)}</div>
        </div>
      </div>
    `;
  }
}

// Handlers
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('error-message');

  try {
    errorDiv.innerHTML = '';
    await login(username, password);
    render();
  } catch (err) {
    errorDiv.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('error-message');

  try {
    errorDiv.innerHTML = '';
    await register(username, email, password);
    errorDiv.innerHTML = '<div class="success">✓ Регистрация успешна! Теперь войдите.</div>';
    setTimeout(() => goToPage('login'), 1500);
  } catch (err) {
    errorDiv.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
  }
}

async function handleCreateTicket(e) {
  e.preventDefault();
  const clientName = document.getElementById('client-name').value;
  const clientEmail = document.getElementById('client-email').value;
  const subject = document.getElementById('subject').value;
  const message = document.getElementById('message').value;
  const errorDiv = document.getElementById('error-message');

  try {
    errorDiv.innerHTML = '';
    await createTicket(clientName, clientEmail, subject, message);
    errorDiv.innerHTML = '<div class="success">✓ Заявка создана успешно!</div>';
    setTimeout(() => goToPage('all-tickets'), 1500);
  } catch (err) {
    errorDiv.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
  }
}

async function handleAssignTicket(id) {
  try {
    await assignTicket(id);
    goToTicket(id);
  } catch (err) {
    alert(`Ошибка: ${err.message}`);
  }
}

async function handleChangeStatus(id, status) {
  try {
    await updateTicketStatus(id, status);
    goToTicket(id);
  } catch (err) {
    alert(`Ошибка: ${err.message}`);
  }
}

// Utilities
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function translateStatus(status) {
  const statuses = {
    'new': 'Новая',
    'in_progress': 'В работе',
    'resolved': 'Решено',
    'closed': 'Закрыто'
  };
  return statuses[status] || status;
}
