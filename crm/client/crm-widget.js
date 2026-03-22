/**
 * CRM Widget - Web Component для встраивания в основной сайт
 * Функциональный стиль с использованием Shadow DOM
 * Независимый модуль для регистрации заявок по ДПУ
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
 * Валидация email
 */
const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * Создание функции API вызова
 */
const createApiCaller = (baseUrl) => (endpoint, method = 'GET', body = null) =>
  fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body && { body: JSON.stringify(body) })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      return data;
    });

/**
 * Создание состояния компонента через замыкание
 */
const createComponentState = (initialState = {}) => {
  let state = initialState;

  const getState = () => ({ ...state });
  const setState = (updates) => {
    state = { ...state, ...updates };
    return getState();
  };

  return { getState, setState };
};

// ============ Styles ============

const WIDGET_STYLES = `
  :host {
    --primary-color: #007bff;
    --error-color: #dc3545;
    --success-color: #28a745;
    --border-color: #dee2e6;
    --text-color: #333;
    --bg-color: #fff;
  }

  * {
    box-sizing: border-box;
  }

  .crm-widget {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: var(--text-color);
    background: var(--bg-color);
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    max-width: 600px;
  }

  .crm-widget h2 {
    margin-top: 0;
    margin-bottom: 8px;
    font-size: 24px;
    font-weight: 600;
  }

  .crm-widget-subtitle {
    color: #666;
    margin-bottom: 24px;
    font-size: 14px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    font-size: 14px;
  }

  .form-group input,
  .form-group textarea {
    display: block;
    width: 100%;
    padding: 12px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-family: inherit;
    font-size: 14px;
    transition: border-color 0.3s;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }

  .form-group textarea {
    resize: vertical;
    min-height: 120px;
  }

  .form-group input.error,
  .form-group textarea.error {
    border-color: var(--error-color);
  }

  .error-message {
    color: var(--error-color);
    font-size: 12px;
    margin-top: 4px;
  }

  .success-message {
    color: var(--success-color);
    font-size: 12px;
    margin-top: 4px;
  }

  .form-alert {
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 20px;
    font-size: 14px;
  }

  .form-alert.error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }

  .form-alert.success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .submit-button {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    transition: background-color 0.3s;
  }

  .submit-button:hover {
    background-color: #0056b3;
  }

  .submit-button:active {
    transform: scale(0.98);
  }

  .submit-button:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
    opacity: 0.65;
  }

  .loading-indicator {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .required-marker {
    color: var(--error-color);
  }
`;

// ============ Web Component ============

class CRMWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = createComponentState({
      loading: false,
      submitted: false,
      errors: {},
      message: null,
      messageType: null
    });
  }

  /**
   * Lifecycle hook - когда элемент добавлен в DOM
   */
  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  /**
   * Получить API URL из атрибута или использовать default
   */
  getApiUrl() {
    return this.getAttribute('api-url') || 'http://localhost:5000/api';
  }

  /**
   * Получить заголовок из атрибута
   */
  getTitle() {
    return this.getAttribute('title') || 'Заявка на консультацию по ДПУ';
  }

  /**
   * Получить подзаголовок
   */
  getSubtitle() {
    return this.getAttribute('subtitle') || 'Заполните форму ниже, и мы свяжемся с вами в ближайшее время';
  }

  /**
   * Рендеринг компонента (pure function)
   */
  render() {
    const title = this.getTitle();
    const subtitle = this.getSubtitle();
    const state = this.state.getState();

    const template = document.createElement('template');
    template.innerHTML = `
      <style>${WIDGET_STYLES}</style>
      <div class="crm-widget">
        <h2>${escapeHtml(title)}</h2>
        <p class="crm-widget-subtitle">${escapeHtml(subtitle)}</p>

        ${state.message ? `
          <div class="form-alert ${state.messageType}">
            ${escapeHtml(state.message)}
          </div>
        ` : ''}

        <form id="crm-form" ${state.submitted ? 'style="display:none"' : ''}>
          <div class="form-group">
            <label>
              Ваше имя <span class="required-marker">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Ваше полное имя"
              required
              ${state.errors.name ? 'class="error"' : ''}
            >
            ${state.errors.name ? `<div class="error-message">${escapeHtml(state.errors.name)}</div>` : ''}
          </div>

          <div class="form-group">
            <label>
              Email <span class="required-marker">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="your@email.com"
              required
              ${state.errors.email ? 'class="error"' : ''}
            >
            ${state.errors.email ? `<div class="error-message">${escapeHtml(state.errors.email)}</div>` : ''}
          </div>

          <div class="form-group">
            <label>
              Телефон <span class="required-marker">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              placeholder="+7 (999) 999-99-99"
              required
              ${state.errors.phone ? 'class="error"' : ''}
            >
            ${state.errors.phone ? `<div class="error-message">${escapeHtml(state.errors.phone)}</div>` : ''}
          </div>

          <div class="form-group">
            <label>
              Тема обращения <span class="required-marker">*</span>
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              placeholder="Краткая тема обращения"
              required
              ${state.errors.subject ? 'class="error"' : ''}
            >
            ${state.errors.subject ? `<div class="error-message">${escapeHtml(state.errors.subject)}</div>` : ''}
          </div>

          <div class="form-group">
            <label>
              Описание <span class="required-marker">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              placeholder="Подробное описание вашего вопроса или проблемы"
              required
              ${state.errors.message ? 'class="error"' : ''}
            ></textarea>
            ${state.errors.message ? `<div class="error-message">${escapeHtml(state.errors.message)}</div>` : ''}
          </div>

          <button
            type="submit"
            class="submit-button"
            ${state.loading ? 'disabled' : ''}
          >
            ${state.loading ? `<span class="loading-indicator"></span> Отправка...` : 'Отправить заявку'}
          </button>
        </form>

        ${state.submitted ? `
          <div style="text-align: center; padding: 40px 0;">
            <h3 style="color: var(--success-color); margin-bottom: 16px;">Спасибо!</h3>
            <p style="color: #666; margin-bottom: 24px;">Ваша заявка успешно отправлена. Мы свяжемся с вами в ближайшее время.</p>
            <button
              class="submit-button"
              style="background: var(--primary-color);"
              onclick="this.closest('crm-widget').resetForm()"
            >
              Отправить ещё одну заявку
            </button>
          </div>
        ` : ''}
      </div>
    `;

    // Очищаем shadow DOM и добавляем новый контент
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  /**
   * Функция валидации формы (pure function)
   */
  validateForm(formData) {
    const errors = {};

    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Имя должно содержать минимум 2 символа';
    }

    if (!isValidEmail(formData.email)) {
      errors.email = 'Пожалуйста, введите корректный email';
    }

    if (!formData.phone || formData.phone.trim().length < 5) {
      errors.phone = 'Пожалуйста, введите корректный номер телефона';
    }

    if (!formData.subject || formData.subject.trim().length < 3) {
      errors.subject = 'Тема должна содержать минимум 3 символа';
    }

    if (!formData.message || formData.message.trim().length < 10) {
      errors.message = 'Описание должно содержать минимум 10 символов';
    }

    return errors;
  }

  /**
   * Получить значения формы (pure function)
   */
  getFormData() {
    const form = this.shadowRoot.getElementById('crm-form');
    if (!form) return null;

    return {
      name: form.getElementById('name')?.value || '',
      email: form.getElementById('email')?.value || '',
      phone: form.getElementById('phone')?.value || '',
      subject: form.getElementById('subject')?.value || '',
      message: form.getElementById('message')?.value || ''
    };
  }

  /**
   * Обработчик отправки формы
   */
  handleSubmit = async (e) => {
    e.preventDefault();

    const formData = this.getFormData();
    const errors = this.validateForm(formData);

    if (Object.keys(errors).length > 0) {
      this.state.setState({ errors });
      this.render();
      return;
    }

    // Начинаем загрузку
    this.state.setState({ loading: true });
    this.render();

    try {
      const apiCall = createApiCaller(this.getApiUrl());

      // Отправляем заявку как новый тикет
      const response = await apiCall('/tickets/create', 'POST', {
        client_name: formData.name,
        client_email: formData.email,
        subject: formData.subject,
        message: `Телефон: ${formData.phone}\n\n${formData.message}`
      });

      // Успешно отправлено
      this.state.setState({
        submitted: true,
        loading: false,
        message: 'Спасибо! Ваша заявка успешно отправлена.',
        messageType: 'success',
        errors: {}
      });

      // Отправляем событие о успешной отправке
      this.dispatchEvent(new CustomEvent('ticket-submitted', {
        detail: { ticketId: response.id, data: formData },
        bubbles: true,
        composed: true
      }));

      this.render();
    } catch (error) {
      this.state.setState({
        loading: false,
        message: error.message,
        messageType: 'error'
      });
      this.render();
    }
  };

  /**
   * Функция сброса формы
   */
  resetForm() {
    this.state.setState({
      loading: false,
      submitted: false,
      errors: {},
      message: null,
      messageType: null
    });
    this.render();
  }

  /**
   * Установка обработчиков событий
   */
  setupEventListeners() {
    const form = this.shadowRoot.getElementById('crm-form');
    if (form) {
      form.addEventListener('submit', this.handleSubmit);
    }
  }

  /**
   * Lifecycle hook - атрибут изменился
   */
  attributeChangedCallback() {
    this.render();
  }

  /**
   * Какие атрибуты наблюдать
   */
  static get observedAttributes() {
    return ['api-url', 'title', 'subtitle'];
  }
}

// ============ Регистрация Web Component ============

// Проверяем, не определён ли уже
if (!customElements.get('crm-widget')) {
  customElements.define('crm-widget', CRMWidget);
}

// Экспортируем класс для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CRMWidget;
}
