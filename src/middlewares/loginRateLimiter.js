const rateLimit = require('express-rate-limit');

const RATE_LIMIT_MESSAGE =
  'Demasiados intentos de inicio de sesión. Probá de nuevo en 15 minutos.';

function positiveIntegerFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function createLoginRateLimiter({
  max = positiveIntegerFromEnv('LOGIN_RATE_LIMIT_MAX', 5),
  windowMs = positiveIntegerFromEnv('LOGIN_RATE_LIMIT_WINDOW_MINUTES', 15) * 60 * 1000,
} = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ message: RATE_LIMIT_MESSAGE });
    },
  });
}

module.exports = { createLoginRateLimiter, RATE_LIMIT_MESSAGE };
