/**
 * CRM Server - Функциональный стиль
 * Pure functions для middleware и routing
 * Composition паттерны для pipeline обработки
 */

const express = require('express');
const cors = require('cors');
const { pipe, compose } = require('./fp-utils');
const { router: authRouter } = require('./auth-functional');
const { router: ticketsRouter } = require('./tickets-functional');

const PORT = 5001;

// ============ Middleware Composition ============

/**
 * Создать Express приложение с middleware
 */
const createApp = () => {
  const app = express();

  // Core middleware
  app.use(cors());
  app.use(express.json());

  return app;
};

/**
 * Pure function для регистрации маршрутов
 */
const setupRoutes = (app) => {
  app.use('/api/auth', authRouter);
  app.use('/api/tickets', ticketsRouter);

  return app;
};

/**
 * Pure function для добавления health check endpoint
 */
const setupHealthCheck = (app) => {
  const healthHandler = (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  };

  app.get('/api/health', healthHandler);

  return app;
};

/**
 * Pure function для добавления обработчика ошибок
 */
const setupErrorHandler = (app) => {
  app.use((err, req, res, next) => {
    console.error('[Error]', err.message);

    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({
      error: message,
      status,
      timestamp: new Date().toISOString()
    });
  });

  return app;
};

/**
 * Pure function для добавления 404 handler
 */
const setup404Handler = (app) => {
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      path: req.path,
      method: req.method
    });
  });

  return app;
};

/**
 * Composition для инициализации всего сервера
 */
const initializeServer = pipe(
  createApp,
  setupRoutes,
  setupHealthCheck,
  setupErrorHandler,
  setup404Handler
);

// ============ Server Startup ============

/**
 * Pure function для запуска сервера
 */
const startServer = (app) => {
  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`[CRM Server] Running on http://localhost:${PORT}`);
      console.log(`[CRM Server] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[CRM Server] Functional Programming Style enabled`);
      resolve(server);
    });
  });
};

// ============ Application Startup ============

// Инициализируем и запускаем
const app = initializeServer();
startServer(app).catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});

// Graceful shutdown
const handleShutdown = (signal) => () => {
  console.log(`[CRM Server] Received ${signal}, shutting down gracefully...`);
  process.exit(0);
};

process.on('SIGTERM', handleShutdown('SIGTERM'));
process.on('SIGINT', handleShutdown('SIGINT'));

module.exports = { app, startServer };
