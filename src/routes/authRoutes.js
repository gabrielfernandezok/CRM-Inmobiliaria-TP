const express = require('express');
const { register, login, registerSchema, loginSchema } = require('../controllers/authController');
const { validate } = require('../middlewares/validate');
const { createLoginRateLimiter } = require('../middlewares/loginRateLimiter');

function createAuthRouter({ loginRateLimiter = createLoginRateLimiter() } = {}) {
  const router = express.Router();

  router.post('/registro', validate(registerSchema), register);
  router.post('/login', loginRateLimiter, validate(loginSchema), login);

  return router;
}

const router = createAuthRouter();
router.createAuthRouter = createAuthRouter;

module.exports = router;
