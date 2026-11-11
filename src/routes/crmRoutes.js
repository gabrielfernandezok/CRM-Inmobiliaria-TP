const express = require('express');
const controller = require('../controllers/crmController');
const { requireAuth, requireProfiles } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');

const router = express.Router();
const authenticated = requireAuth;
const records = ['Administrador', 'Corredor/Gerente', 'Agente'];

router.post('/consultas', authenticated, requireProfiles(...records), validate(controller.consultaSchema), controller.crearConsulta);
router.get('/consultas', authenticated, requireProfiles(...records), controller.listarConsultas);

router.post('/propiedades', authenticated, requireProfiles(...records), validate(controller.createPropiedadSchema), controller.crearPropiedad);
router.get('/propiedades', authenticated, requireProfiles(...records), controller.listarPropiedades);
router.get('/propiedades/:id/visitas', authenticated, requireProfiles(...records), controller.listarVisitasPropiedad);
router.get('/propiedades/:id', authenticated, requireProfiles(...records), controller.obtenerPropiedad);
router.patch('/propiedades/:id', authenticated, requireProfiles(...records), validate(controller.updatePropiedadSchema), controller.actualizarPropiedad);
router.post('/visitas', authenticated, requireProfiles(...records), validate(controller.visitaSchema), controller.crearVisita);

router.post('/operaciones', authenticated, requireProfiles(...records), validate(controller.operacionSchema), controller.crearOperacion);
router.get('/operaciones', authenticated, requireProfiles(...records), controller.listarOperaciones);
router.patch(
  '/operaciones/:id/etapa',
  authenticated,
  requireProfiles(...records),
  validate(controller.etapaSchema),
  controller.cambiarEtapaOperacion
);
router.post(
  '/operaciones/:id/ofertas',
  authenticated,
  requireProfiles(...records),
  validate(controller.ofertaSchema),
  controller.crearOferta
);
router.post(
  '/operaciones/:id/contratos',
  authenticated,
  requireProfiles(...records),
  validate(controller.contratoSchema),
  controller.crearContrato
);
router.get('/contratos', authenticated, requireProfiles(...records), controller.listarContratos);
router.get('/menu', authenticated, requireProfiles(...records), controller.obtenerMenu);
router.get('/catalogos', authenticated, requireProfiles(...records), controller.obtenerCatalogos);

module.exports = router;
