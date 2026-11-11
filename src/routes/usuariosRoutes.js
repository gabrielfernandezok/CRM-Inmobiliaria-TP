const express = require('express');
const {
  obtenerPerfiles,
  obtenerProgramas,
  listar,
  actualizarPerfiles,
  updatePerfilesSchema,
  actualizarProgramas,
  updateProgramasSchema,
} = require('../controllers/usuariosController');
const { requireAuth, requireProfiles } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');

const router = express.Router();
const perfilesAdministrativos = ['Administrador', 'Corredor/Gerente'];

router.get('/perfiles', requireAuth, requireProfiles(...perfilesAdministrativos), obtenerPerfiles);
router.get('/perfiles/:id/programas', requireAuth, requireProfiles('Administrador'), obtenerProgramas);
router.get('/usuarios', requireAuth, requireProfiles('Administrador'), listar);
router.put(
  '/usuarios/:id/perfiles',
  requireAuth,
  requireProfiles(...perfilesAdministrativos),
  validate(updatePerfilesSchema),
  actualizarPerfiles
);
router.put(
  '/perfiles/:id/programas',
  requireAuth,
  requireProfiles('Administrador'),
  validate(updateProgramasSchema),
  actualizarProgramas
);

module.exports = router;
