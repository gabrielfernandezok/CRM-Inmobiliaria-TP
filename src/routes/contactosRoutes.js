const express = require('express');
const {
  listar,
  crear,
  obtener,
  actualizar,
  baja,
  crearInteraccion,
  listarInteracciones,
  crearBusqueda,
  createContactoSchema,
  updateContactoSchema,
  interaccionSchema,
  busquedaSchema,
} = require('../controllers/contactoController');
const { requireAuth, requireProfiles } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');

const router = express.Router();

router.get('/', requireAuth, listar);
router.post('/', requireAuth, validate(createContactoSchema), crear);
router.get('/:id', requireAuth, obtener);
router.patch('/:id', requireAuth, validate(updateContactoSchema), actualizar);
router.delete('/:id', requireAuth, requireProfiles('Administrador', 'Corredor/Gerente'), baja);
router.post('/:id/interacciones', requireAuth, validate(interaccionSchema), crearInteraccion);
router.get('/:id/interacciones', requireAuth, listarInteracciones);
router.post('/:id/busquedas', requireAuth, validate(busquedaSchema), crearBusqueda);

module.exports = router;
