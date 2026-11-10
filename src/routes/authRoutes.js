const express = require('express');
const { register, login, registerSchema, loginSchema } = require('../controllers/authController');
const { validate } = require('../middlewares/validate');

const router = express.Router();

router.post('/registro', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

module.exports = router;
