const { z } = require('zod');
const {
  listarPerfiles,
  listarUsuarios,
  actualizarPerfilesUsuario,
  actualizarProgramasPerfil,
} = require('../services/usuariosService');

const idSchema = z.coerce.number().int().positive();
const updatePerfilesSchema = z.object({
  perfiles: z
    .array(z.coerce.number().int().positive())
    .min(1, 'Debe asignar al menos un perfil')
    .refine((ids) => new Set(ids).size === ids.length, 'No se permiten perfiles duplicados'),
});
const updateProgramasSchema = z.object({
  programas: z
    .array(
      z.object({
        idPrograma: z.coerce.number().int().positive(),
        puedeVer: z.boolean(),
        puedeCrear: z.boolean(),
        puedeEditar: z.boolean(),
        puedeEliminar: z.boolean(),
      })
    )
    .refine(
      (programas) => new Set(programas.map(({ idPrograma }) => idPrograma)).size === programas.length,
      'No se permiten programas duplicados'
    ),
});

function parseId(value) {
  const result = idSchema.safeParse(value);
  if (!result.success) {
    const error = new Error('Identificador inválido');
    error.statusCode = 400;
    throw error;
  }
  return result.data;
}

async function obtenerPerfiles(req, res, next) {
  try {
    const perfiles = await listarPerfiles();
    return res.status(200).json(perfiles);
  } catch (error) {
    return next(error);
  }
}

async function listar(req, res, next) {
  try {
    const usuarios = await listarUsuarios();
    return res.status(200).json(usuarios);
  } catch (error) {
    return next(error);
  }
}

async function actualizarPerfiles(req, res, next) {
  try {
    const usuario = await actualizarPerfilesUsuario({
      actor: req.user,
      idUsuario: parseId(req.params.id),
      idsPerfiles: req.body.perfiles,
    });
    return res.status(200).json(usuario);
  } catch (error) {
    return next(error);
  }
}

async function actualizarProgramas(req, res, next) {
  try {
    const perfil = await actualizarProgramasPerfil({
      idPerfil: parseId(req.params.id),
      programas: req.body.programas,
    });
    return res.status(200).json(perfil);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  obtenerPerfiles,
  listar,
  actualizarPerfiles,
  updatePerfilesSchema,
  actualizarProgramas,
  updateProgramasSchema,
};
