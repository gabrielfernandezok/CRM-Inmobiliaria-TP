const prisma = require('../config/prisma');
const { hasAnyProfile } = require('../middlewares/auth');

const ADMIN_PROFILE = 'Administrador';
const MANAGER_PROFILE = 'Corredor/Gerente';
const AGENT_PROFILE = 'Agente';
const MANAGER_ASSIGNABLE_PROFILES = [MANAGER_PROFILE, AGENT_PROFILE];

function errorWithStatus(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function formatUser(usuario) {
  const { contrasena, perfiles, ...safeUser } = usuario;
  return {
    ...safeUser,
    perfiles: perfiles.map(({ perfil }) => perfil.nombre),
  };
}

async function listarPerfiles() {
  return prisma.perfil.findMany({
    select: {
      id: true,
      nombre: true,
      descripcion: true,
    },
    orderBy: { nombre: 'asc' },
  });
}

async function obtenerProgramasPerfil({ idPerfil }) {
  const perfil = await prisma.perfil.findUnique({
    where: { id: idPerfil },
    select: { id: true, nombre: true },
  });
  if (!perfil) throw errorWithStatus(404, 'Perfil no encontrado');

  const programas = await prisma.programa.findMany({
    select: {
      id: true,
      idMenu: true,
      nombre: true,
      ruta: true,
      orden: true,
      menu: {
        select: { id: true, nombre: true, orden: true },
      },
      perfiles: {
        where: { idPerfil },
        select: {
          puedeVer: true,
          puedeCrear: true,
          puedeEditar: true,
          puedeEliminar: true,
        },
      },
    },
    orderBy: [{ menu: { orden: 'asc' } }, { orden: 'asc' }],
  });

  return {
    ...perfil,
    programas: programas.map(({ id, perfiles, ...programa }) => ({
      ...programa,
      idPrograma: id,
      ...(perfiles[0] || {
        puedeVer: false,
        puedeCrear: false,
        puedeEditar: false,
        puedeEliminar: false,
      }),
    })),
  };
}

async function listarUsuarios() {
  const usuarios = await prisma.usuario.findMany({
    select: {
      id: true,
      idPersonaFisica: true,
      nombreUsuario: true,
      mail: true,
      estado: true,
      ultimoAcceso: true,
      perfiles: {
        select: {
          perfil: {
            select: { nombre: true },
          },
        },
      },
    },
    orderBy: { id: 'asc' },
  });

  return usuarios.map(formatUser);
}

async function actualizarPerfilesUsuario({ actor, idUsuario, idsPerfiles }) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const usuario = await tx.usuario.findUnique({
          where: { id: idUsuario },
          select: {
            id: true,
            perfiles: {
              select: {
                idPerfil: true,
                perfil: {
                  select: { nombre: true },
                },
              },
            },
          },
        });

        if (!usuario) {
          throw errorWithStatus(404, 'Recurso no encontrado');
        }

        if (actor.id === idUsuario) {
          throw errorWithStatus(403, 'No puede modificar sus propios perfiles');
        }

        const esAdmin = hasAnyProfile(actor.perfiles, [ADMIN_PROFILE]);
        const tienePerfilAdmin = usuario.perfiles.some(
          ({ perfil }) => perfil.nombre === ADMIN_PROFILE
        );

        const perfiles = await tx.perfil.findMany({
          where: { id: { in: idsPerfiles } },
          select: { id: true, nombre: true },
        });

        if (perfiles.length !== idsPerfiles.length) {
          throw errorWithStatus(400, 'Uno o más perfiles no existen');
        }

        if (!esAdmin && tienePerfilAdmin) {
          throw errorWithStatus(403, 'No puede modificar a un usuario Administrador');
        }

        const asignaPerfilAdmin = perfiles.some(({ nombre }) => nombre === ADMIN_PROFILE);
        if (!esAdmin && asignaPerfilAdmin) {
          throw errorWithStatus(403, 'Solo un Administrador puede asignar ese perfil');
        }

        if (
          !esAdmin &&
          perfiles.some(({ nombre }) => !MANAGER_ASSIGNABLE_PROFILES.includes(nombre))
        ) {
          throw errorWithStatus(403, 'No tiene permisos para asignar esos perfiles');
        }

        if (tienePerfilAdmin && !asignaPerfilAdmin) {
          const perfilAdmin = usuario.perfiles.find(
            ({ perfil }) => perfil.nombre === ADMIN_PROFILE
          );
          const administradores = await tx.perfilUsuario.count({
            where: { idPerfil: perfilAdmin.idPerfil },
          });

          if (administradores <= 1) {
            throw errorWithStatus(409, 'El sistema debe conservar al menos un Administrador');
          }
        }

        await tx.perfilUsuario.deleteMany({ where: { idUsuario } });
        await tx.perfilUsuario.createMany({
          data: idsPerfiles.map((idPerfil) => ({ idUsuario, idPerfil })),
        });

        const usuarioActualizado = await tx.usuario.findUnique({
          where: { id: idUsuario },
          select: {
            id: true,
            idPersonaFisica: true,
            nombreUsuario: true,
            mail: true,
            estado: true,
            ultimoAcceso: true,
            perfiles: {
              select: {
                perfil: {
                  select: { nombre: true },
                },
              },
            },
          },
        });

        return formatUser(usuarioActualizado);
      },
      { isolationLevel: 'Serializable' }
    );
  } catch (error) {
    if (error.code === 'P2034') {
      throw errorWithStatus(409, 'Conflicto al modificar perfiles; vuelva a intentarlo');
    }
    throw error;
  }
}

async function actualizarProgramasPerfil({ idPerfil, programas }) {
  const perfil = await prisma.perfil.findUnique({
    where: { id: idPerfil },
    select: { id: true },
  });
  if (!perfil) throw errorWithStatus(404, 'Perfil no encontrado');

  const ids = programas.map(({ idPrograma }) => idPrograma);
  const existentes = await prisma.programa.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  if (existentes.length !== ids.length) {
    throw errorWithStatus(400, 'Uno o más programas no existen');
  }

  await prisma.$transaction(async (tx) => {
    await tx.perfilPrograma.deleteMany({ where: { idPerfil } });
    if (programas.length) {
      await tx.perfilPrograma.createMany({
        data: programas.map((programa) => ({
          idPerfil,
          idPrograma: programa.idPrograma,
          puedeVer: programa.puedeVer,
          puedeCrear: programa.puedeCrear,
          puedeEditar: programa.puedeEditar,
          puedeEliminar: programa.puedeEliminar,
        })),
      });
    }
  });

  return prisma.perfil.findUnique({
    where: { id: idPerfil },
    select: {
      id: true,
      nombre: true,
      programas: {
        include: {
          programa: { include: { menu: true } },
        },
        orderBy: { idPrograma: 'asc' },
      },
    },
  });
}

module.exports = {
  listarPerfiles,
  obtenerProgramasPerfil,
  listarUsuarios,
  actualizarPerfilesUsuario,
  actualizarProgramasPerfil,
};
