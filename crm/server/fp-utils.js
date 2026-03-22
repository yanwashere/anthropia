/**
 * Функциональные утилиты для построения pipeline архитектуры
 * Pure functions для обработки данных и композиции
 */

// ============ Композиция функций ============

/**
 * Композзинг функций слева направо
 * pipe(f, g, h)(x) === h(g(f(x)))
 */
const pipe = (...fns) => (value) =>
  fns.reduce((acc, fn) => acc instanceof Promise ? acc.then(fn) : fn(acc), value);

/**
 * Композзинг функций справа налево
 * compose(f, g, h)(x) === f(g(h(x)))
 */
const compose = (...fns) => pipe(...fns.reverse());

/**
 * Каррирование функции
 */
const curry = (fn) => {
  const arity = fn.length;
  return function curried(...args) {
    if (args.length >= arity) {
      return fn.apply(null, args);
    }
    return (...nextArgs) => curried.apply(null, args.concat(nextArgs));
  };
};

/**
 * Частичное применение функции
 */
const partial = (fn, ...args) => (...nextArgs) => fn(...args, ...nextArgs);

// ============ Работа с объектами ============

/**
 * Immutable объект - слияние с новыми значениями
 */
const merge = (obj1, obj2) => Object.freeze(Object.assign({}, obj1, obj2));

/**
 * Омощить структуру объекта
 */
const pick = (keys) => (obj) =>
  keys.reduce((acc, key) => merge(acc, { [key]: obj[key] }), {});

/**
 * Исключить ключи из объекта
 */
const omit = (keys) => (obj) =>
  Object.keys(obj)
    .filter(key => !keys.includes(key))
    .reduce((acc, key) => merge(acc, { [key]: obj[key] }), {});

/**
 * Получить значение из объекта по пути (например "user.email")
 */
const getIn = (path) => (obj) => {
  const keys = path.split('.');
  return keys.reduce((acc, key) => acc?.[key], obj);
};

/**
 * Установить значение в объект по пути (immutable)
 */
const setIn = (path, value) => (obj) => {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const parent = keys.reduce((acc, key) => acc[key] = acc[key] || {}, obj);
  return merge(obj, {
    ...parent,
    [lastKey]: value
  });
};

/**
 * Преобразовать объект с функцией-трансформером
 */
const mapObj = (fn) => (obj) =>
  Object.entries(obj).reduce((acc, [key, value]) =>
    merge(acc, { [key]: fn(value, key) }), {});

// ============ Работа с массивами ============

/**
 * Безопасное получение элемента по индексу
 */
const safeGet = (index) => (arr) =>
  index >= 0 && index < arr.length ? arr[index] : undefined;

/**
 * Сортировка по полю (immutable)
 */
const sortBy = (key) => (arr) =>
  [...arr].sort((a, b) => {
    if (a[key] < b[key]) return -1;
    if (a[key] > b[key]) return 1;
    return 0;
  });

/**
 * Группировка массива по ключу
 */
const groupBy = (key) => (arr) =>
  arr.reduce((acc, item) => {
    const groupKey = item[key];
    return merge(acc, {
      [groupKey]: [...(acc[groupKey] || []), item]
    });
  }, {});

/**
 * Уникальные элементы массива
 */
const uniq = (arr) =>
  [...new Set(arr)];

/**
 * Уникальные элементы по полю
 */
const uniqBy = (key) => (arr) => {
  const seen = new Set();
  return arr.filter(item => {
    if (seen.has(item[key])) return false;
    seen.add(item[key]);
    return true;
  });
};

// ============ Валидация ============

/**
 * Проверка значения с предикатом
 */
const validate = (predicate, errorMsg) => (value) => {
  if (!predicate(value)) {
    const error = new Error(errorMsg);
    error.code = 'VALIDATION_ERROR';
    throw error;
  }
  return value;
};

/**
 * Цепочка валидаторов
 */
const validateAll = (validators) => (value) =>
  validators.reduce((acc, validator) => validator(acc), value);

/**
 * Валидация объекта по схеме
 */
const validateSchema = (schema) => (obj) => {
  Object.entries(schema).forEach(([key, validator]) => {
    if (validator) {
      validator(obj[key]);
    }
  });
  return obj;
};

// ============ Хелперы для обработки ошибок ============

/**
 * Try-catch как функция
 */
const tryCatch = (fn) => (...args) => {
  try {
    return { ok: true, value: fn(...args) };
  } catch (error) {
    return { ok: false, error };
  }
};

/**
 * Обработка Promise с resultом [error, data]
 */
const handle = (promise) =>
  promise
    .then(data => [null, data])
    .catch(error => [error, null]);

/**
 * Maybe монада для работы с null/undefined
 */
const Maybe = (value) => ({
  map: (fn) => value != null ? Maybe(fn(value)) : Maybe(null),
  flatMap: (fn) => value != null ? fn(value) : Maybe(null),
  getOrElse: (defaultValue) => value != null ? value : defaultValue,
  isNone: () => value == null,
  isSome: () => value != null,
  value: value
});

/**
 * Either монада для обработки ошибок
 */
const Right = (value) => ({
  map: (fn) => Right(fn(value)),
  flatMap: (fn) => fn(value),
  fold: (errFn, successFn) => successFn(value),
  isRight: () => true,
  isLeft: () => false,
  value: value
});

const Left = (error) => ({
  map: () => Left(error),
  flatMap: () => Left(error),
  fold: (errFn, successFn) => errFn(error),
  isRight: () => false,
  isLeft: () => true,
  error: error
});

// ============ Хелперы для работы с функциями ============

/**
 * Мемоизация функции
 */
const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

/**
 * Отсрочка выполнения функции
 */
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Ограничение частоты вызова функции
 */
const throttle = (fn, delay) => {
  let lastTime = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      return fn(...args);
    }
  };
};

/**
 * Повторить функцию N раз
 */
const times = (n) => (fn) => {
  const results = [];
  for (let i = 0; i < n; i++) {
    results.push(fn(i));
  }
  return results;
};

/**
 * Логирование без побочных эффектов
 */
const tap = (label) => (value) => {
  console.log(`[${label}]`, value);
  return value;
};

module.exports = {
  pipe,
  compose,
  curry,
  partial,
  merge,
  pick,
  omit,
  getIn,
  setIn,
  mapObj,
  safeGet,
  sortBy,
  groupBy,
  uniq,
  uniqBy,
  validate,
  validateAll,
  validateSchema,
  tryCatch,
  handle,
  Maybe,
  Right,
  Left,
  memoize,
  debounce,
  throttle,
  times,
  tap
};
