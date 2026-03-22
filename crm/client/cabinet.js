/**
 * CRM Personal Cabinet - Функциональный стиль
 * Личный кабинет модератора с расширенным функционалом
 * Pure functions, immutable state, composition паттерны
 */

// ============ Utility Functions ============

/**
 * Экранирование HTML
 */
const escapeHtml = (text) => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
};

/**
 * Форматирование даты
 */
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU');
};

/**
 * Форматирование даты с временем
 */
const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU');
};

/**
 * Трансляция статуса
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
 * CSS класс статуса
 */
const getStatusClass = (status) => `status-${status}`;

/**
 * Создание состояния кабинета через замыкание
 */
const createCabinetState = (initialState = {}) => {
  let state = {
    user: null,
    token: null,
    currentTab: 'dashboard',
    tickets: [],
    stats: null,
    selectedTicket: null,
    filter: {
      status: null,
      sortBy: 'created_at',
      order: 'desc'
    },
    ...initialState
  };

  const getState = () => Object.freeze({ ...state });
  const setState = (updates) => {
    state = { ...state, ...updates };
    return getState();
  };

  return { getState, setState };
};

/**
 * HOF для создания API caller с авторизацией
 */
const createAuthorizedApiCall = (baseUrl, token) =>
  (endpoint, method = 'GET', body = null) =>
    fetch(`${baseUrl}${endpoint}`, {
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

// ============ State Management ============

// Глобальное состояние кабинета
window.cabinet = {
  state: createCabinetState(),
  apiCall: null
};

// ============ Selectors (Pure Functions) ============

/**
 * Получить все заявки пользователя
 */
const getUserTickets = (state) => state.tickets;

/**
 * Получить заявки с применением фильтра
 */
const getFilteredTickets = (state) => {
  let tickets = state.tickets;

  if (state.filter.status) {
    tickets = tickets.filter(t => t.status === state.filter.status);
  }

  // Сортировка
  const sortKey = state.filter.sortBy || 'created_at';
  tickets.sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];

    if (aVal < bVal) return state.filter.order === 'asc' ? -1 : 1;
    if (aVal > bVal) return state.filter.order === 'asc' ? 1 : -1;
    return 0;
  });

  return tickets;
};

/**
 * Получить статистику
 */
const getStats = (state) => state.stats;

/**
 * Получить процент выполнения
 */
const getCompletionRate = (state) => {
  const stats = getStats(state);
  if (!stats || stats.total === 0) return 0;
  const completed = (stats.resolved || 0) + (stats.closed || 0);
  return Math.round((completed / stats.total) * 100);
};

// ============ Transformations (Pure Functions) ============

/**
 * Добавить вычисляемые свойства к заявке
 */
const enrichTicket = (ticket) => ({
  ...ticket,
  daysElapsed: Math.floor((Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60 * 24)),
  isOverdue: Math.floor((Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60 * 24)) > 7,
  isPriority: ticket.status === 'new' || ticket.status === 'in_progress'
});

/**
 * Трансформировать заявки
 */
const enrichTickets = (tickets) => tickets.map(enrichTicket);

// ============ Components (Pure Functions) ============

/**
 * Компонент шапки кабинета
 */
const CabinetHeader = (user) => `
  <div class="cabinet-header">
    <div class="cabinet-title">
      <h1>Личный кабинет</h1>
      <p>Добро пожаловать, <strong>${escapeHtml(user?.username)}</strong></p>
    </div>
    <div class="cabinet-user-actions">
      <div class="user-info">
        <span class="avatar">${(user?.username || 'U')[0].toUpperCase()}</span>
        <div class="user-details">
          <div class="user-name">${escapeHtml(user?.username)}</div>
          <div class="user-email">${escapeHtml(user?.email)}</div>
        </div>
      </div>
      <button class="logout-btn" onclick="window.cabinet.logout()">Выход</button>
    </div>
  </div>
`;

/**
 * Компонент вкладок кабинета
 */
const CabinetTabs = (currentTab) => `
  <div class="cabinet-tabs">
    <button
      class="tab-btn ${currentTab === 'dashboard' ? 'active' : ''}"
      onclick="window.cabinet.switchTab('dashboard')"
    >
      📊 Дашборд
    </button>
    <button
      class="tab-btn ${currentTab === 'my-tickets' ? 'active' : ''}"
      onclick="window.cabinet.switchTab('my-tickets')"
    >
      🎫 Мои заявки
    </button>
    <button
      class="tab-btn ${currentTab === 'profile' ? 'active' : ''}"
      onclick="window.cabinet.switchTab('profile')"
    >
      ⚙️ Профиль
    </button>
  </div>
`;

/**
 * Компонент статистики (Stat Card)
 */
const StatCard = (title, value, icon = '📊') => `
  <div class="stat-card">
    <div class="stat-icon">${icon}</div>
    <div class="stat-content">
      <div class="stat-title">${escapeHtml(title)}</div>
      <div class="stat-value">${String(value).padStart(2, '0')}</div>
    </div>
  </div>
`;

/**
 * Компонент дашборда
 */
const DashboardTab = (state) => {
  const stats = getStats(state);
  const completionRate = getCompletionRate(state);

  if (!stats) {
    return '<div class="loading">Загрузка статистики...</div>';
  }

  return `
    <div class="cabinet-content">
      <div class="dashboard-section">
        <h2>Статистика по заявкам</h2>
        <div class="stats-grid">
          ${StatCard('Всего заявок', stats.total, '📋')}
          ${StatCard('Новых', stats.new || 0, '🆕')}
          ${StatCard('В работе', stats.in_progress || 0, '⏳')}
          ${StatCard('Решено', stats.resolved || 0, '✅')}
          ${StatCard('Закрыто', stats.closed || 0, '🔒')}
        </div>
      </div>

      <div class="dashboard-section">
        <h2>Прогресс выполнения</h2>
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${completionRate}%"></div>
          </div>
          <div class="progress-text">${completionRate}% выполнено</div>
        </div>
      </div>

      <div class="dashboard-section">
        <h2>Последние заявки</h2>
        ${getFilteredTickets(state).slice(0, 5).length === 0
          ? '<p style="text-align: center; color: #999;">Нет заявок</p>'
          : `<div class="tickets-mini-list">
              ${getFilteredTickets(state).slice(0, 5).map(ticket => `
                <div class="ticket-mini-card" onclick="window.cabinet.selectTicket(${ticket.id})">
                  <div class="ticket-mini-header">
                    <strong>${escapeHtml(ticket.subject)}</strong>
                    <span class="badge status-${ticket.status}">${getStatusLabel(ticket.status)}</span>
                  </div>
                  <div class="ticket-mini-meta">
                    <span>${escapeHtml(ticket.client_name)}</span>
                    <span>${formatDate(ticket.created_at)}</span>
                  </div>
                </div>
              `).join('')}
            </div>`
        }
      </div>
    </div>
  `;
};

/**
 * Компонент фильтра заявок
 */
const TicketsFilter = (filter) => `
  <div class="tickets-filter">
    <div class="filter-group">
      <label>Статус:</label>
      <select onchange="window.cabinet.setFilter('status', this.value)">
        <option value="">Все статусы</option>
        <option value="new" ${filter.status === 'new' ? 'selected' : ''}>Новые</option>
        <option value="in_progress" ${filter.status === 'in_progress' ? 'selected' : ''}>В работе</option>
        <option value="resolved" ${filter.status === 'resolved' ? 'selected' : ''}>Решено</option>
        <option value="closed" ${filter.status === 'closed' ? 'selected' : ''}>Закрыто</option>
      </select>
    </div>
    <div class="filter-group">
      <label>Сортировка:</label>
      <select onchange="window.cabinet.setFilter('sortBy', this.value)">
        <option value="created_at" ${filter.sortBy === 'created_at' ? 'selected' : ''}>По дате создания</option>
        <option value="updated_at" ${filter.sortBy === 'updated_at' ? 'selected' : ''}>По дате обновления</option>
        <option value="subject" ${filter.sortBy === 'subject' ? 'selected' : ''}>По теме</option>
      </select>
    </div>
  </div>
`;

/**
 * Компонент списка заявок
 */
const TicketsListTab = (state) => {
  const tickets = getFilteredTickets(state);

  return `
    <div class="cabinet-content">
      ${TicketsFilter(state.filter)}

      <div class="tickets-list-container">
        ${tickets.length === 0
          ? '<div style="text-align: center; padding: 40px 0; color: #999;">Нет заявок</div>'
          : `<table class="tickets-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Тема</th>
                  <th>Клиент</th>
                  <th>Статус</th>
                  <th>Дата</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                ${tickets.map(ticket => `
                  <tr>
                    <td>#${ticket.id}</td>
                    <td>${escapeHtml(ticket.subject)}</td>
                    <td>${escapeHtml(ticket.client_name)}</td>
                    <td><span class="badge ${getStatusClass(ticket.status)}">${getStatusLabel(ticket.status)}</span></td>
                    <td>${formatDate(ticket.created_at)}</td>
                    <td>
                      <button class="action-btn" onclick="window.cabinet.selectTicket(${ticket.id})">Просмотр</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>`
        }
      </div>
    </div>
  `;
};

/**
 * Компонент профиля
 */
const ProfileTab = (user) => `
  <div class="cabinet-content">
    <div class="profile-section">
      <h2>Информация профиля</h2>
      <div class="profile-info">
        <div class="info-row">
          <label>Имя пользователя:</label>
          <div>${escapeHtml(user?.username)}</div>
        </div>
        <div class="info-row">
          <label>Email:</label>
          <div>${escapeHtml(user?.email)}</div>
        </div>
        <div class="info-row">
          <label>Дата регистрации:</label>
          <div>${formatDateTime(user?.created_at)}</div>
        </div>
      </div>
    </div>

    <div class="profile-section">
      <h2>Опасная зона</h2>
      <p style="color: #666; margin-bottom: 16px;">Будьте осторожны с этими действиями:</p>
      <button class="danger-btn" onclick="window.cabinet.logout()">
        Выход из системы
      </button>
    </div>
  </div>
`;

/**
 * Компонент модального окна деталей заявки
 */
const TicketDetailModal = (ticket) => `
  <div class="modal-backdrop" onclick="window.cabinet.closeTicket()">
    <div class="modal-content" onclick="event.stopPropagation()">
      <button class="modal-close" onclick="window.cabinet.closeTicket()">✕</button>

      <div class="modal-header">
        <h2>${escapeHtml(ticket.subject)}</h2>
        <span class="badge ${getStatusClass(ticket.status)}">${getStatusLabel(ticket.status)}</span>
      </div>

      <div class="modal-body">
        <div class="detail-section">
          <h3>Информация клиента</h3>
          <div class="detail-row">
            <span class="label">Имя:</span>
            <span>${escapeHtml(ticket.client_name)}</span>
          </div>
          <div class="detail-row">
            <span class="label">Email:</span>
            <span><a href="mailto:${ticket.client_email}">${escapeHtml(ticket.client_email)}</a></span>
          </div>
        </div>

        <div class="detail-section">
          <h3>Статус</h3>
          <div class="detail-row">
            <span class="label">Текущий статус:</span>
            <span>${getStatusLabel(ticket.status)}</span>
          </div>
          <div class="status-buttons">
            ${ticket.status !== 'in_progress' ? `
              <button onclick="window.cabinet.updateStatus(${ticket.id}, 'in_progress')">В работе</button>
            ` : ''}
            ${ticket.status !== 'resolved' ? `
              <button onclick="window.cabinet.updateStatus(${ticket.id}, 'resolved')">Решено</button>
            ` : ''}
            ${ticket.status !== 'closed' ? `
              <button onclick="window.cabinet.updateStatus(${ticket.id}, 'closed')">Закрыто</button>
            ` : ''}
          </div>
        </div>

        <div class="detail-section">
          <h3>Сообщение</h3>
          <div class="message-box">${escapeHtml(ticket.message)}</div>
        </div>

        <div class="detail-section">
          <h3>История</h3>
          <div class="detail-row">
            <span class="label">Создана:</span>
            <span>${formatDateTime(ticket.created_at)}</span>
          </div>
          <div class="detail-row">
            <span class="label">Обновлена:</span>
            <span>${formatDateTime(ticket.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
`;

// ============ Main Render Function ============

/**
 * Основная функция рендеринга
 */
const renderCabinet = () => {
  const state = window.cabinet.state.getState();
  const container = document.getElementById('cabinet-app');

  if (!container) {
    console.error('Cabinet container not found');
    return;
  }

  let content = '';

  if (state.currentTab === 'dashboard') {
    content = DashboardTab(state);
  } else if (state.currentTab === 'my-tickets') {
    content = TicketsListTab(state);
  } else if (state.currentTab === 'profile') {
    content = ProfileTab(state.user);
  }

  container.innerHTML = `
    ${CabinetHeader(state.user)}
    ${CabinetTabs(state.currentTab)}
    ${content}
    ${state.selectedTicket ? TicketDetailModal(state.selectedTicket) : ''}
  `;
};

// ============ Global Functions ============

/**
 * Переключение между вкладками
 */
window.cabinet.switchTab = (tabName) => {
  window.cabinet.state.setState({ currentTab: tabName });
  renderCabinet();
};

/**
 * Выбор заявки для просмотра
 */
window.cabinet.selectTicket = async (ticketId) => {
  try {
    const ticket = await window.cabinet.apiCall(`/tickets/${ticketId}`);
    const enriched = enrichTicket(ticket);
    window.cabinet.state.setState({ selectedTicket: enriched });
    renderCabinet();
  } catch (err) {
    alert(`Ошибка: ${err.message}`);
  }
};

/**
 * Закрытие деталей заявки
 */
window.cabinet.closeTicket = () => {
  window.cabinet.state.setState({ selectedTicket: null });
  renderCabinet();
};

/**
 * Установка фильтра
 */
window.cabinet.setFilter = (filterKey, value) => {
  const state = window.cabinet.state.getState();
  window.cabinet.state.setState({
    filter: { ...state.filter, [filterKey]: value || null }
  });
  renderCabinet();
};

/**
 * Обновление статуса заявки
 */
window.cabinet.updateStatus = async (ticketId, newStatus) => {
  try {
    await window.cabinet.apiCall(`/tickets/${ticketId}/status`, 'POST', { status: newStatus });
    // Перезагружаем заявку
    window.cabinet.selectTicket(ticketId);
  } catch (err) {
    alert(`Ошибка: ${err.message}`);
  }
};

/**
 * Выход из системы
 */
window.cabinet.logout = () => {
  localStorage.removeItem('token');
  window.location.href = '/';
};

/**
 * Инициализация кабинета
 */
window.cabinet.initialize = async (user, token, apiUrl = 'http://localhost:5000/api') => {
  window.cabinet.apiCall = createAuthorizedApiCall(apiUrl, token);
  window.cabinet.state.setState({ user, token });

  try {
    // Загрузка заявок
    const tickets = await window.cabinet.apiCall('/tickets/my');
    window.cabinet.state.setState({ tickets: enrichTickets(tickets) });

    // Загрузка статистики
    const stats = await window.cabinet.apiCall('/tickets/my-stats');
    window.cabinet.state.setState({ stats });

    renderCabinet();
  } catch (err) {
    console.error('Failed to initialize cabinet:', err);
    alert('Ошибка загрузки данных кабинета');
  }
};

// ============ Styles ============

const CABINET_STYLES = `
  * {
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: #f5f5f5;
    color: #333;
  }

  #cabinet-app {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  .cabinet-header {
    background: white;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .cabinet-title h1 {
    margin: 0;
    font-size: 28px;
  }

  .cabinet-title p {
    margin: 8px 0 0 0;
    color: #666;
  }

  .cabinet-user-actions {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #007bff;
    color: white;
    font-weight: bold;
    font-size: 18px;
  }

  .user-details {
    display: flex;
    flex-direction: column;
  }

  .user-name {
    font-weight: 600;
    font-size: 14px;
  }

  .user-email {
    font-size: 12px;
    color: #666;
  }

  .logout-btn {
    padding: 8px 16px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }

  .logout-btn:hover {
    background: #c82333;
  }

  .cabinet-tabs {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    background: white;
    padding: 12px;
    border-radius: 8px;
  }

  .tab-btn {
    padding: 10px 16px;
    border: none;
    background: #f0f0f0;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s;
  }

  .tab-btn:hover {
    background: #e0e0e0;
  }

  .tab-btn.active {
    background: #007bff;
    color: white;
  }

  .cabinet-content {
    background: white;
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .dashboard-section {
    margin-bottom: 32px;
  }

  .dashboard-section h2 {
    margin-top: 0;
    margin-bottom: 16px;
    font-size: 18px;
    border-bottom: 2px solid #007bff;
    padding-bottom: 8px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .stat-card {
    background: #f8f9fa;
    padding: 16px;
    border-radius: 8px;
    text-align: center;
    border-left: 4px solid #007bff;
  }

  .stat-icon {
    font-size: 28px;
    margin-bottom: 8px;
  }

  .stat-title {
    font-size: 12px;
    color: #666;
    margin-bottom: 8px;
  }

  .stat-value {
    font-size: 24px;
    font-weight: bold;
    color: #007bff;
  }

  .progress-container {
    margin-bottom: 24px;
  }

  .progress-bar {
    width: 100%;
    height: 24px;
    background: #e0e0e0;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #007bff, #28a745);
    transition: width 0.3s;
  }

  .progress-text {
    text-align: center;
    font-weight: 500;
    color: #333;
  }

  .tickets-mini-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ticket-mini-card {
    padding: 12px;
    background: #f8f9fa;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .ticket-mini-card:hover {
    background: #e9ecef;
    transform: translateX(4px);
  }

  .ticket-mini-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .ticket-mini-meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #666;
  }

  .badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    color: white;
  }

  .status-new { background: #dc3545; }
  .status-in_progress { background: #ffc107; color: #333; }
  .status-resolved { background: #28a745; }
  .status-closed { background: #6c757d; }

  .tickets-filter {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
  }

  .filter-group label {
    font-weight: 500;
    margin-bottom: 4px;
    font-size: 12px;
  }

  .filter-group select {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }

  .tickets-table {
    width: 100%;
    border-collapse: collapse;
  }

  .tickets-table th {
    background: #f8f9fa;
    padding: 12px;
    text-align: left;
    font-weight: 600;
    font-size: 12px;
    border-bottom: 2px solid #ddd;
  }

  .tickets-table td {
    padding: 12px;
    border-bottom: 1px solid #ddd;
  }

  .action-btn {
    padding: 6px 12px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .action-btn:hover {
    background: #0056b3;
  }

  .profile-section {
    margin-bottom: 32px;
  }

  .profile-section h2 {
    margin-top: 0;
    margin-bottom: 16px;
  }

  .profile-info {
    background: #f8f9fa;
    padding: 16px;
    border-radius: 4px;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #ddd;
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .info-row label {
    font-weight: 500;
    color: #666;
  }

  .danger-btn {
    padding: 12px 24px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }

  .danger-btn:hover {
    background: #c82333;
  }

  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 8px;
    max-width: 700px;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    z-index: 10;
  }

  .modal-header {
    padding: 24px 24px 0 24px;
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 20px;
  }

  .modal-header h2 {
    margin: 0;
  }

  .modal-body {
    padding: 0 24px 24px 24px;
  }

  .detail-section {
    margin-bottom: 24px;
  }

  .detail-section h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    color: #666;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
  }

  .detail-row .label {
    font-weight: 500;
    color: #666;
  }

  .message-box {
    background: #f8f9fa;
    padding: 12px;
    border-radius: 4px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .status-buttons {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }

  .status-buttons button {
    padding: 8px 16px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    font-size: 12px;
  }

  .status-buttons button:hover {
    background: #0056b3;
  }

  .loading {
    text-align: center;
    padding: 40px;
    color: #666;
  }
`;

// Добавляем стили в HTML
document.addEventListener('DOMContentLoaded', () => {
  const styleElement = document.createElement('style');
  styleElement.textContent = CABINET_STYLES;
  document.head.appendChild(styleElement);
});
