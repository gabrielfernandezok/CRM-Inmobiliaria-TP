const { z } = require('zod');
const service = require('../services/crmService');

const idSchema = z.coerce.number().int().positive();
const nullableIdSchema = z.union([idSchema, z.null()]).optional();
const nullablePositiveIntSchema = z.union([z.coerce.number().int().positive(), z.null()]).optional();
const nullableNonnegativeIntSchema = z.union([z.coerce.number().int().nonnegative(), z.null()]).optional();
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'La fecha no es válida');
const dateTimeSchema = z.string().datetime({ offset: true });
const decimalSchema = z.union([z.number().finite(), z.string().regex(/^-?\d+(\.\d+)?$/)]);
const nullableDecimalSchema = decimalSchema.nullable().optional();
const idArraySchema = z
  .array(idSchema)
  .refine((ids) => new Set(ids).size === ids.length, 'No se permiten identificadores duplicados');

const interaccionSchema = z.object({
  idOperacion: nullableIdSchema,
  tipoInteraccion: z.enum(['SEGUIMIENTO', 'ENTREVISTA_CAPTACION']),
  fecha: dateTimeSchema.optional(),
  medio: z.enum(['LLAMADA', 'WHATSAPP', 'MAIL', 'EN_PERSONA']),
  resultado: z.string().min(1),
  notas: z.string().nullable().optional(),
  proximaAccion: z.string().nullable().optional(),
  fechaProxContacto: dateSchema.nullable().optional(),
});

const busquedaSchema = z.object({
  tipoOperacion: z.enum(['COMPRA', 'ALQUILER']),
  tipoPropiedad: z.enum(['CASA', 'DEPARTAMENTO', 'TERRENO', 'LOCAL', 'OFICINA']),
  presupuestoMax: nullableDecimalSchema,
  moneda: z.enum(['USD', 'ARS']).nullable().optional(),
  zona: z.string().nullable().optional(),
  ambientes: nullablePositiveIntSchema,
  dormitorios: nullableNonnegativeIntSchema,
  antiguedadMax: nullableNonnegativeIntSchema,
  requiereCredito: z.boolean().optional(),
  activa: z.boolean().optional(),
  caracteristicas: idArraySchema.optional(),
});

const consultaSchema = z.object({
  idContacto: idSchema,
  idPropiedad: nullableIdSchema,
  idCanal: idSchema,
  fecha: dateTimeSchema.optional(),
  mensaje: z.string().min(1),
  estado: z.enum(['PENDIENTE', 'EN_SEGUIMIENTO', 'CERRADA']),
});

const propietarioSchema = z.object({
  idContacto: idSchema,
  porcentaje: decimalSchema,
});
const propietariosSchema = z
  .array(propietarioSchema)
  .min(1)
  .refine(
    (owners) => new Set(owners.map(({ idContacto }) => idContacto)).size === owners.length,
    'No se permiten propietarios duplicados'
  );
const propiedadFields = {
  tipoPropiedad: z.enum(['CASA', 'DEPARTAMENTO', 'TERRENO', 'LOCAL', 'OFICINA']),
  direccion: z.string().min(1),
  localidad: z.string().nullable().optional(),
  esPH: z.boolean().optional(),
  ambientes: nullablePositiveIntSchema,
  dormitorios: nullableNonnegativeIntSchema,
  antiguedadAnios: nullableNonnegativeIntSchema,
  superficie: nullableDecimalSchema,
  aptoCredito: z.enum(['NO_ESPECIFICADO', 'APTO_CREDITO', 'NO_APTO_CREDITO']).optional(),
  latitud: nullableDecimalSchema,
  longitud: nullableDecimalSchema,
  descripcion: z.string().nullable().optional(),
  llaveEntregada: z.boolean().optional(),
  estado: z.enum(['DISPONIBLE', 'RESERVADA', 'VENDIDA', 'ALQUILADA', 'RETIRADA']),
  fechaAlta: dateSchema.optional(),
};

const createPropiedadSchema = z.object({
  ...propiedadFields,
  propietarios: propietariosSchema,
  caracteristicas: idArraySchema.optional(),
});
const updatePropiedadSchema = z
  .object({
    ...Object.fromEntries(
      Object.entries(propiedadFields).map(([key, schema]) => [
        key,
        key === 'estado' || key === 'tipoPropiedad' || key === 'direccion'
          ? schema.optional()
          : schema,
      ])
    ),
    propietarios: propietariosSchema.optional(),
    caracteristicas: idArraySchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Debe enviar al menos un campo para modificar');

const visitaSchema = z.object({
  idContacto: idSchema,
  idPropiedad: idSchema,
  fechaHora: dateTimeSchema.optional(),
  resultado: z.string().nullable().optional(),
});

const operacionSchema = z.object({
  idPropiedad: idSchema,
  idEtapa: idSchema,
  idMotivoBaja: nullableIdSchema,
  idCliente: nullableIdSchema,
  tipoOperacion: z.enum(['VENTA', 'ALQUILER']),
  precioUSD: nullableDecimalSchema,
  precioARS: nullableDecimalSchema,
  montoCierre: nullableDecimalSchema,
  monedaCierre: z.enum(['USD', 'ARS']).nullable().optional(),
  honorarios: nullableDecimalSchema,
  valorSugerido: nullableDecimalSchema,
  esExclusiva: z.boolean().nullable().optional(),
  fechaFirmaAutorizacion: dateSchema.nullable().optional(),
  fechaVencAutorizacion: dateSchema.nullable().optional(),
  fechaCierre: dateSchema.nullable().optional(),
});
const etapaSchema = z.object({
  idEtapa: idSchema,
  idMotivoBaja: idSchema.optional(),
  fechaCierre: dateSchema.optional(),
});
const ofertaSchema = z.object({
  idContacto: idSchema,
  monto: decimalSchema,
  moneda: z.enum(['USD', 'ARS']),
  fecha: dateSchema,
  estado: z.enum(['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CONTRAOFERTA']),
});
const contratoSchema = z.object({
  fechaFirma: dateSchema,
  fechaInicio: dateSchema,
  fechaVencimiento: dateSchema,
  montoAlquiler: decimalSchema,
  moneda: z.enum(['USD', 'ARS']),
  frecuenciaAjuste: z.enum(['TRIMESTRAL', 'SEMESTRAL', 'ANUAL']),
  indiceAjuste: z.enum(['IPC', 'ICL', 'PORCENTAJE_FIJO', 'MONTO_FIJO']),
  depositoGarantia: decimalSchema,
  diasAviso: z.coerce.number().int().nonnegative(),
  estado: z.enum(['VIGENTE', 'POR_VENCER', 'VENCIDO', 'RENOVADO', 'RESCINDIDO']),
  fechaRescision: dateSchema.nullable().optional(),
  garantes: idArraySchema.default([]),
}).refine((data) => data.fechaInicio <= data.fechaVencimiento, {
  message: 'La fecha de vencimiento debe ser posterior al inicio',
  path: ['fechaVencimiento'],
});

const listPropertiesSchema = z.object({
  tipoPropiedad: z.enum(['CASA', 'DEPARTAMENTO', 'TERRENO', 'LOCAL', 'OFICINA']).optional(),
  estado: z.enum(['DISPONIBLE', 'RESERVADA', 'VENDIDA', 'ALQUILADA', 'RETIRADA']).optional(),
  localidad: z.string().optional(),
});
const listOperationsSchema = z.object({
  tipoOperacion: z.enum(['VENTA', 'ALQUILER']).optional(),
  idEtapa: idSchema.optional(),
});
const listContractsSchema = z.object({
  estado: z.enum(['VIGENTE', 'POR_VENCER', 'VENCIDO', 'RENOVADO', 'RESCINDIDO']).optional(),
  vencimientoDesde: dateSchema.optional(),
  vencimientoHasta: dateSchema.optional(),
}).refine(
  ({ vencimientoDesde, vencimientoHasta }) =>
    !vencimientoDesde || !vencimientoHasta || vencimientoDesde <= vencimientoHasta,
  { message: 'El rango de vencimiento no es válido' }
);

function parseId(req, res, key = 'id') {
  const parsed = idSchema.safeParse(req.params[key]);
  if (!parsed.success) {
    res.status(400).json({ message: 'Identificador inválido' });
    return null;
  }
  return parsed.data;
}

function parseQuery(schema, req, res) {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ message: 'Datos inválidos', errors: result.error.errors });
    return null;
  }
  return result.data;
}

function endpoint(callback, successStatus = 200) {
  return async (req, res, next) => {
    try {
      const result = await callback(req, res);
      if (res.headersSent) return;
      return res.status(successStatus).json(result);
    } catch (error) {
      return next(error);
    }
  };
}

const listarInteracciones = endpoint((req, res) => {
  const id = parseId(req, res, 'id');
  if (id === null) return;
  return service.listarInteracciones({ user: req.user, idContacto: id });
});

const crearInteraccion = endpoint((req, res) => {
  const id = parseId(req, res, 'id');
  if (id === null) return;
  return service.crearInteraccion({
    user: req.user,
    idContacto: id,
    data: req.body,
  });
}, 201);

const crearBusqueda = endpoint((req, res) => {
  const id = parseId(req, res, 'id');
  if (id === null) return;
  return service.crearBusqueda({
    user: req.user,
    idContacto: id,
    data: req.body,
  });
}, 201);

const crearConsulta = endpoint((req) => service.crearConsulta({ user: req.user, data: req.body }), 201);
const listarConsultas = endpoint((req) => service.listarConsultas({ user: req.user }));
const crearPropiedad = endpoint((req) => service.crearPropiedad({ user: req.user, data: req.body }), 201);
const listarPropiedades = endpoint((req, res) => {
  const query = parseQuery(listPropertiesSchema, req, res);
  return query && service.listarPropiedades({ user: req.user, query });
});
const obtenerPropiedad = endpoint((req, res) => {
  const id = parseId(req, res);
  return id === null ? undefined : service.obtenerPropiedad({ user: req.user, id });
});
const actualizarPropiedad = endpoint((req, res) => {
  const id = parseId(req, res);
  return id === null ? undefined : service.actualizarPropiedad({ user: req.user, id, data: req.body });
});
const crearVisita = endpoint((req) => service.crearVisita({ user: req.user, data: req.body }), 201);
const crearOperacion = endpoint((req) => service.crearOperacion({ user: req.user, data: req.body }), 201);
const listarOperaciones = endpoint((req, res) => {
  const query = parseQuery(listOperationsSchema, req, res);
  return query && service.listarOperaciones({ user: req.user, query });
});
const cambiarEtapaOperacion = endpoint((req, res) => {
  const id = parseId(req, res);
  return id === null ? undefined : service.cambiarEtapaOperacion({ user: req.user, id, data: req.body });
});
const crearOferta = endpoint((req, res) => {
  const id = parseId(req, res, 'id');
  return id === null ? undefined : service.crearOferta({ user: req.user, idOperacion: id, data: req.body });
}, 201);
const crearContrato = endpoint((req, res) => {
  const id = parseId(req, res, 'id');
  return id === null ? undefined : service.crearContrato({ user: req.user, idOperacion: id, data: req.body });
}, 201);
const listarContratos = endpoint((req, res) => {
  const query = parseQuery(listContractsSchema, req, res);
  return query && service.listarContratos({ user: req.user, query });
});
const obtenerMenu = endpoint((req) => service.obtenerMenu({ user: req.user }));
const obtenerCatalogos = endpoint(() => service.obtenerCatalogos());

module.exports = {
  endpoint,
  interaccionSchema,
  busquedaSchema,
  consultaSchema,
  createPropiedadSchema,
  updatePropiedadSchema,
  visitaSchema,
  operacionSchema,
  etapaSchema,
  ofertaSchema,
  contratoSchema,
  listarInteracciones,
  crearInteraccion,
  crearBusqueda,
  crearConsulta,
  listarConsultas,
  crearPropiedad,
  listarPropiedades,
  obtenerPropiedad,
  actualizarPropiedad,
  crearVisita,
  crearOperacion,
  listarOperaciones,
  cambiarEtapaOperacion,
  crearOferta,
  crearContrato,
  listarContratos,
  obtenerMenu,
  obtenerCatalogos,
};
