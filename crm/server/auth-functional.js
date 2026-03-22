/**
 * Функциональный модуль аутентификации
 * Pure functions для валидации, хеширования и генерации токенов
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  pipe,
  compose,
  curry,
  validate,
  validateSchema,
  merge,
  omit,
  pick,
  Right,
  Left
} = require('./fp-utils');
const {
  createModerator,
  findModeratorByUsername,
  findModeratorById
} = require('./db-functional');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const router = express.Router();

// ============ Валидаторы (Pure Functions) ============

/**
 * Валидация имени пользователя
 */
const validateUsername = validate(
  (username) => username && username.length >= 3 && username.length <= 50,
  'Username must be between 3 and 50 characters'
);

/**
 * Валидация email
 */
const validateEmail = validate(
  (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  'Invalid email format'
);

/**
 * Валидация пароля
 */
const validatePassword = validate(
  (password) => password && password.length >= 6,
  'Password must be at least 6 characters'
);

/**
 * Проверка, что объект содержит требуемые поля
 */
const requireFields = (...fields) => (obj) => {
  const missing = fields.filter(field => !obj[field]);
  if (missing.length > 0) {
    throw new Error(`Missing fields: ${missing.join(', ')}`);
  }
  return obj;
};

// ============ Криптография (Pure Functions) ============

/**
 * Хеширование пароля (асинхронная чистая функция)
 */
const hashPassword = (password) =>
  new Promise((resolve, reject) => {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) reject(err);
      else resolve(hash);
    });
  });

/**
 * Проверка пароля
 */
const comparePassword = (plainPassword, hashedPassword) =>
  new Promise((resolve, reject) => {
    bcrypt.compare(plainPassword, hashedPassword, (err, isMatch) => {
      if (err) reject(err);
      else resolve(isMatch);
    });
  });

// ============ JWT операции ============

/**
 * Создать JWT токен (pure function)
 */
const createToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

/**
 * Верифицировать JWT токен (pure function)
 */
const verifyToken = (token) =>
  new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });

/**
 * Извлечь токен из заголовков (pure function)
 */
const extractToken = (authHeader) => {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  return parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;
};

// ============ Регистрация ============

/**
 * Подготовить данные регистрации (pure function)
 */
const prepareRegistrationData = pipe(
  requireFields('username', 'email', 'password'),
  (data) => merge(data, {
    username: data.username.trim(),
    email: data.email.trim().toLowerCase()
  })
);

/**
 * Валидировать данные регистрации (pure function)
 */
const validateRegistrationData = (data) => {
  validateUsername(data.username);
  validateEmail(data.email);
  validatePassword(data.password);
  return data;
};

/**
 * Регистрация нового модератора (async pure function)
 */
const registerModerator = async (registrationData) => {
  const data = prepareRegistrationData(registrationData);
  validateRegistrationData(data);

  // Проверить, существует ли пользователь
  const existingUser = await findModeratorByUsername(data.username);
  if (existingUser) {
    return Left({ code: 'USER_EXISTS', message: 'User already exists' });
  }

  // Хешировать пароль
  const hashedPassword = await hashPassword(data.password);

  // Создать модератора
  try {
    const result = await createModerator(
      data.username,
      data.email,
      hashedPassword
    );
    return Right({
      id: result.id,
      username: data.username,
      email: data.email
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return Left({ code: 'USER_EXISTS', message: 'User already exists' });
    }
    return Left({ code: 'DB_ERROR', message: 'Database error' });
  }
};

// ============ Логин ============

/**
 * Подготовить данные логина (pure function)
 */
const prepareLoginData = pipe(
  requireFields('username', 'password'),
  (data) => merge(data, {
    username: data.username.trim()
  })
);

/**
 * Аутентифицировать пользователя (async pure function)
 */
const authenticateUser = async (loginData) => {
  const data = prepareLoginData(loginData);

  // Найти пользователя
  const user = await findModeratorByUsername(data.username);
  if (!user) {
    return Left({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
  }

  // Проверить пароль
  const isPasswordValid = await comparePassword(data.password, user.password);
  if (!isPasswordValid) {
    return Left({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
  }

  // Создать токен
  const token = createToken(user);
  const userPublic = omit(['password'])(user);

  return Right({
    token,
    user: userPublic
  });
};

// ============ Middleware (Express-специфические) ============

/**
 * Middleware для проверки токена (functional composition)
 */
const authMiddleware = async (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = await verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * HOF (Higher-Order Function) для создания роль-based middleware
 */
const requireRole = (role) => (req, res, next) => {
  if (req.user?.role === role) {
    next();
  } else {
    res.status(403).json({ error: 'Insufficient permissions' });
  }
};

/**
 * Middleware для обработки ошибок авторизации
 */
const handleAuthError = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============ Express маршруты ============

/**
 * POST /api/auth/register
 */
router.post('/register', handleAuthError(async (req, res) => {
  const result = await registerModerator(req.body);

  result.fold(
    (error) => res.status(400).json({ error: error.message }),
    (user) => res.json({
      message: 'User registered successfully',
      user
    })
  );
}));

/**
 * POST /api/auth/login
 */
router.post('/login', handleAuthError(async (req, res) => {
  const result = await authenticateUser(req.body);

  result.fold(
    (error) => res.status(401).json({ error: error.message }),
    (data) => res.json(data)
  );
}));

/**
 * GET /api/auth/profile
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await findModeratorById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(omit(['password'])(user));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/verify
 */
router.get('/verify', authMiddleware, (req, res) => {
  res.json({ valid: true, user: req.user });
});

module.exports = {
  router,
  authMiddleware,
  requireRole,
  createToken,
  verifyToken,
  extractToken,
  registerModerator,
  authenticateUser,
  validateUsername,
  validateEmail,
  validatePassword
};
