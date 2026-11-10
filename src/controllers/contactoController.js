const { z } = require('zod');
const {
  listarContactos,
  crearContacto,
  obtenerContacto,
  actualizarContacto,
  darDeBajaContacto,
} = require('../services/contactoService');
const {
  interaccionSchema,
  busquedaSchema,
  crearInteraccion,
  listarInteracciones,
  crearBusqueda,
} = require('./crmController');

const idSchema = z.coerce.number().int().positive();
const rolesSchema = z
  .array(z.coerce.number().int().positive())
  .refine((roles) => new Set(roles).size === roles.length, 'No se permiten roles duplicados');
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'La fecha no es válida');

const listQuerySchema = z.object({
  tipoPersona: z.enum(['FISICA', 'JURIDICA']).optional(),
  activo: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === true || value === 'true')),
});

const createContactoSchema = z.object({
  tipoPersona: z.enum(['FISICA', 'JURIDICA']),
  idUsuario: z.coerce.number().int().positive().optional(),
  cuitCuil: z.string().optional(),
  telefono: z.string().optional(),
  mail: z.string().email().optional(),
  domicilio: z.string().optional(),
  localidad: z.string().optional(),
  observaciones: z.string().optional(),
  activo: z.boolean().optional(),
  roles: rolesSchema.optional(),
  apellido: z.string().optional(),
  nombres: z.string().optional(),
  dni: z.coerce.number().int().positive().optional(),
  fechaNac: z.string().optional(),
  sexo: z.enum(['F', 'M', 'X']).optional(),
  razonSocial: z.string().optional(),
  nombreFantasia: z.string().optional(),
  tipoSocietario: z.enum(['SA', 'SRL', 'SAS', 'COOPERATIVA']).optional(),
  fechaConstitucion: z.string().optional(),
  representantes: z
    .array(
      z.object({
        dni: z.coerce.number().int().positive(),
        cargo: z.string().min(1),
        fechaDesde: z.string().min(1),
        fechaHasta: z.string().optional(),
        esPrincipal: z.boolean().optional(),
        documentacionRespaldo: z.string().optional(),
      })
    )
    .optional(),
}).superRefine((value, ctx) => {
  if (value.tipoPersona === 'FISICA') {
    if (!value.apellido || !value.nombres || !value.dni || !value.fechaNac || !value.sexo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Falta información requerida para persona física',
      });
    }
  }

  if (value.tipoPersona === 'JURIDICA') {
    if (!value.razonSocial || !value.tipoSocietario || !value.fechaConstitucion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Falta información requerida para persona jurídica',
      });
    }

    if (!value.representantes || value.representantes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe indicar al menos un representante',
      });
    }
  }
});

const updateContactoSchema = z.object({
  cuitCuil: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  mail: z.string().email().nullable().optional(),
  domicilio: z.string().nullable().optional(),
  localidad: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),
  roles: rolesSchema.optional(),
  apellido: z.string().min(1).optional(),
  nombres: z.string().min(1).optional(),
  dni: z.coerce.number().int().positive().optional(),
  fechaNac: dateSchema.optional(),
  sexo: z.enum(['F', 'M', 'X']).optional(),
  razonSocial: z.string().min(1).optional(),
  nombreFantasia: z.string().nullable().optional(),
  tipoSocietario: z.enum(['SA', 'SRL', 'SAS', 'COOPERATIVA']).optional(),
  fechaConstitucion: dateSchema.optional(),
});

function parseId(req, res) {
  const parsed = idSchema.safeParse(req.params.id);
  if (!parsed.success) {
    res.status(400).json({ message: 'Identificador inválido' });
    return null;
  }
  return parsed.data;
}

async function listar(req, res, next) {
  try {
    const result = listQuerySchema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        message: 'Datos inválidos',
        errors: result.error.errors,
      });
    }

    const contactos = await listarContactos({
      usuario: req.user,
      query: result.data,
    });

    return res.status(200).json(contactos);
  } catch (error) {
    return next(error);
  }
}

async function crear(req, res, next) {
  try {
    const contacto = await crearContacto({
      usuario: req.user,
      data: req.body,
    });

    return res.status(201).json(contacto);
  } catch (error) {
    return next(error);
  }
}

async function obtener(req, res, next) {
  const id = parseId(req, res);
  if (id === null) return;

  try {
    const contacto = await obtenerContacto({ usuario: req.user, id });
    return res.status(200).json(contacto);
  } catch (error) {
    return next(error);
  }
}

async function actualizar(req, res, next) {
  const id = parseId(req, res);
  if (id === null) return;

  try {
    const contacto = await actualizarContacto({
      usuario: req.user,
      id,
      data: req.body,
    });
    return res.status(200).json(contacto);
  } catch (error) {
    return next(error);
  }
}

async function baja(req, res, next) {
  const id = parseId(req, res);
  if (id === null) return;

  try {
    const result = await darDeBajaContacto({ usuario: req.user, id });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listar,
  crear,
  obtener,
  actualizar,
  baja,
  listQuerySchema,
  createContactoSchema,
  updateContactoSchema,
  interaccionSchema,
  busquedaSchema,
  crearInteraccion,
  listarInteracciones,
  crearBusqueda,
};
