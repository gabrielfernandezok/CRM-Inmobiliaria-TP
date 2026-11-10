const { z } = require('zod');
const { registerUser, loginUser } = require('../services/authService');

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'La fecha no es válida');

const registerSchema = z.object({
  nombreUsuario: z.string().min(3),
  mail: z.string().email(),
  contrasena: z.string().min(8),
  apellido: z.string().min(1),
  nombres: z.string().min(1),
  dni: z.coerce.number().int().positive(),
  fechaNac: dateSchema,
  sexo: z.enum(['F', 'M', 'X']),
});

const loginSchema = z
  .object({
    nombreUsuario: z.string().min(1).optional(),
    mail: z.string().email().optional(),
    contrasena: z.string().min(8),
  })
  .refine((data) => Boolean(data.nombreUsuario || data.mail), {
    message: 'Debe enviar nombreUsuario o mail',
    path: ['nombreUsuario'],
  });

async function register(req, res, next) {
  try {
    const user = await registerUser(req.body);
    return res.status(201).json(user);
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await loginUser(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  registerSchema,
  loginSchema,
};
