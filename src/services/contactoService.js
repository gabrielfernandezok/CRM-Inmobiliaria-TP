const prisma = require('../config/prisma');
const { hasAnyProfile } = require('../middlewares/auth');

const ADMIN_PROFILES = ['Administrador', 'Corredor/Gerente'];
const AGENT_PROFILES = ['Agente'];

function buildNombreContacto(contacto) {
  if (contacto.tipoPersona === 'FISICA' && contacto.personaFisica) {
    return `${contacto.personaFisica.apellido} ${contacto.personaFisica.nombres}`.trim();
  }

  if (contacto.tipoPersona === 'JURIDICA' && contacto.personaJuridica) {
    return contacto.personaJuridica.razonSocial;
  }

  return 'Contacto';
}

function normalizeBoolean(value) {
  if (value === undefined || value === null) return value;
  return value === true || value === 'true';
}

function errorWithStatus(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function requireContactAccess(usuario, contacto) {
  const isAdmin = hasAnyProfile(usuario.perfiles, ADMIN_PROFILES);
  const isAgent = hasAnyProfile(usuario.perfiles, AGENT_PROFILES);

  if (!isAdmin && !isAgent) {
    throw errorWithStatus(403, 'No tiene permisos para esta acción');
  }

  if (!isAdmin && contacto.idUsuario !== usuario.id) {
    throw errorWithStatus(404, 'Recurso no encontrado');
  }

}

async function asignarRolesContacto(tx, idContacto, roles) {
  if (roles === undefined || roles.length === 0) return [];

  const rolesExistentes = await tx.rol.findMany({
    where: { id: { in: roles } },
    select: { id: true },
  });

  if (rolesExistentes.length !== roles.length) {
    throw errorWithStatus(400, 'Uno o más roles no existen');
  }

  await tx.contactoRol.createMany({
    data: roles.map((idRol) => ({ idContacto, idRol })),
  });

  return tx.contactoRol.findMany({
    where: { idContacto },
    include: { rol: true },
  });
}

async function buscarContactoParaAcceso(id, usuario) {
  const contacto = await prisma.contacto.findUnique({
    where: { id },
    include: {
      personaFisica: {
        include: {
          representantes: {
            include: { personaJuridica: true },
          },
        },
      },
      personaJuridica: {
        include: {
          representantes: {
            include: { personaFisica: true },
          },
        },
      },
      usuario: {
        select: { id: true, nombreUsuario: true },
      },
      roles: { include: { rol: true } },
      propiedades: {
        include: { propiedad: true },
      },
    },
  });

  if (!contacto) {
    throw errorWithStatus(404, 'Recurso no encontrado');
  }
  requireContactAccess(usuario, contacto);
  return contacto;
}

async function listarContactos({ usuario, query = {} }) {
  const where = {};

  if (query.tipoPersona) {
    where.tipoPersona = query.tipoPersona;
  }

  if (query.activo !== undefined) {
    where.activo = normalizeBoolean(query.activo);
  }

  const esAdministrador = hasAnyProfile(usuario.perfiles, ['Administrador', 'Corredor/Gerente']);
  const esAgente = hasAnyProfile(usuario.perfiles, ['Agente']);

  if (!esAdministrador && !esAgente) {
    return [];
  }

  if (esAgente && !esAdministrador) {
    where.idUsuario = usuario.id;
  }

  const contactos = await prisma.contacto.findMany({
    where,
    include: {
      personaFisica: true,
      personaJuridica: true,
    },
    orderBy: { fechaAlta: 'desc' },
  });

  return contactos.map((contacto) => ({
    id: contacto.id,
    tipoPersona: contacto.tipoPersona,
    nombre: buildNombreContacto(contacto),
    activo: contacto.activo,
    mail: contacto.mail,
    telefono: contacto.telefono,
    idUsuario: contacto.idUsuario,
  }));
}

async function crearContacto({ usuario, data }) {
  const esAgente = hasAnyProfile(usuario.perfiles, ['Agente']);
  const esAdmin = hasAnyProfile(usuario.perfiles, ['Administrador', 'Corredor/Gerente']);

  if (esAgente && !esAdmin) {
    data.idUsuario = usuario.id;
  }

  if (data.tipoPersona === 'FISICA') {
    const dni = Number(data.dni);
    const personaExistente = await prisma.personaFisica.findUnique({
      where: { dni },
    });

    if (personaExistente) {
      throw errorWithStatus(409, 'El contacto ya está registrado');
    }

    if (data.cuitCuil) {
      const contactoExistente = await prisma.contacto.findUnique({
        where: { cuitCuil: data.cuitCuil },
      });

      if (contactoExistente) {
        throw errorWithStatus(409, 'El contacto ya está registrado');
      }
    }

    return prisma.$transaction(async (tx) => {
      const contacto = await tx.contacto.create({
        data: {
          tipoPersona: 'FISICA',
          idUsuario: data.idUsuario || null,
          cuitCuil: data.cuitCuil || null,
          telefono: data.telefono || null,
          mail: data.mail || null,
          domicilio: data.domicilio || null,
          localidad: data.localidad || null,
          observaciones: data.observaciones || null,
          activo: data.activo ?? true,
        },
      });

      const roles = await asignarRolesContacto(tx, contacto.id, data.roles);

      const persona = await tx.personaFisica.create({
        data: {
          id: contacto.id,
          apellido: data.apellido,
          nombres: data.nombres,
          dni,
          fechaNac: new Date(data.fechaNac),
          sexo: data.sexo,
        },
      });

      return {
        ...contacto,
        personaFisica: persona,
        roles,
        nombre: `${persona.apellido} ${persona.nombres}`.trim(),
      };
    });
  }

  if (data.tipoPersona === 'JURIDICA') {
    if (!data.representantes || data.representantes.length === 0) {
      throw errorWithStatus(400, 'Debe indicar al menos un representante');
    }

    const cuitCuilExistente = data.cuitCuil
      ? await prisma.contacto.findUnique({
          where: { cuitCuil: data.cuitCuil },
        })
      : null;

    if (cuitCuilExistente) {
      throw errorWithStatus(409, 'El contacto ya está registrado');
    }

    return prisma.$transaction(async (tx) => {
      const contacto = await tx.contacto.create({
        data: {
          tipoPersona: 'JURIDICA',
          idUsuario: data.idUsuario || null,
          cuitCuil: data.cuitCuil || null,
          telefono: data.telefono || null,
          mail: data.mail || null,
          domicilio: data.domicilio || null,
          localidad: data.localidad || null,
          observaciones: data.observaciones || null,
          activo: data.activo ?? true,
        },
      });

      const roles = await asignarRolesContacto(tx, contacto.id, data.roles);

      const personaJuridica = await tx.personaJuridica.create({
        data: {
          id: contacto.id,
          razonSocial: data.razonSocial,
          nombreFantasia: data.nombreFantasia || null,
          tipoSocietario: data.tipoSocietario,
          fechaConstitucion: new Date(data.fechaConstitucion),
        },
      });

      const representantes = [];
      for (const representante of data.representantes) {
        const personaFisica = await tx.personaFisica.findUnique({
          where: { dni: Number(representante.dni) },
        });

        if (!personaFisica) {
          throw errorWithStatus(400, 'El representante debe existir como persona física');
        }

        const entidadRepresentante = await tx.representante.create({
          data: {
            idPersonaJuridica: contacto.id,
            idPersonaFisica: personaFisica.id,
            cargo: representante.cargo,
            fechaDesde: new Date(representante.fechaDesde),
            fechaHasta: representante.fechaHasta ? new Date(representante.fechaHasta) : null,
            esPrincipal: representante.esPrincipal ?? false,
            documentacionRespaldo: representante.documentacionRespaldo || null,
          },
        });

        representantes.push(entidadRepresentante);
      }

      return {
        ...contacto,
        personaJuridica,
        representantes,
        roles,
        nombre: personaJuridica.razonSocial,
      };
    });
  }

  throw errorWithStatus(400, 'Tipo de persona no válido');
}

async function obtenerContacto({ usuario, id }) {
  return buscarContactoParaAcceso(id, usuario);
}

async function actualizarContacto({ usuario, id, data }) {
  const contacto = await buscarContactoParaAcceso(id, usuario);
  const personaFisicaFields = ['apellido', 'nombres', 'dni', 'fechaNac', 'sexo'];
  const personaJuridicaFields = [
    'razonSocial',
    'nombreFantasia',
    'tipoSocietario',
    'fechaConstitucion',
  ];
  const fieldsForOtherType =
    contacto.tipoPersona === 'FISICA' ? personaJuridicaFields : personaFisicaFields;
  if (fieldsForOtherType.some((field) => data[field] !== undefined)) {
    throw errorWithStatus(400, 'Los datos enviados no corresponden al tipo de contacto');
  }

  const contactoData = {};
  for (const field of [
    'cuitCuil',
    'telefono',
    'mail',
    'domicilio',
    'localidad',
    'observaciones',
  ]) {
    if (data[field] !== undefined) contactoData[field] = data[field];
  }

  const personaData = {};
  const personFields =
    contacto.tipoPersona === 'FISICA' ? personaFisicaFields : personaJuridicaFields;
  for (const field of personFields) {
    if (data[field] !== undefined) personaData[field] = data[field];
  }
  const rolesWereProvided = data.roles !== undefined;
  for (const field of ['fechaNac', 'fechaConstitucion']) {
    if (personaData[field] !== undefined) {
      personaData[field] = new Date(`${personaData[field]}T00:00:00.000Z`);
    }
  }

  if (!Object.keys(contactoData).length && !Object.keys(personaData).length && !rolesWereProvided) {
    throw errorWithStatus(400, 'Debe enviar al menos un campo para modificar');
  }

  try {
    return await prisma.$transaction(async (tx) => {
      if (Object.keys(contactoData).length) {
        await tx.contacto.update({ where: { id }, data: contactoData });
      }

      if (Object.keys(personaData).length) {
        const model = contacto.tipoPersona === 'FISICA' ? tx.personaFisica : tx.personaJuridica;
        await model.update({ where: { id }, data: personaData });
      }

      if (rolesWereProvided) {
        await tx.contactoRol.deleteMany({ where: { idContacto: id } });
        await asignarRolesContacto(tx, id, data.roles);
      }

      return tx.contacto.findUnique({
        where: { id },
        include: {
          personaFisica: true,
          personaJuridica: true,
          roles: { include: { rol: true } },
        },
      });
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw errorWithStatus(409, 'El contacto ya está registrado');
    }
    if (error.code === 'P2025') {
      throw errorWithStatus(404, 'Recurso no encontrado');
    }
    throw error;
  }
}

async function darDeBajaContacto({ usuario, id }) {
  if (!hasAnyProfile(usuario.perfiles, ADMIN_PROFILES)) {
    throw errorWithStatus(403, 'No tiene permisos para esta acción');
  }
  const result = await prisma.contacto.updateMany({
    where: { id },
    data: { activo: false },
  });
  if (!result.count) {
    throw errorWithStatus(404, 'Recurso no encontrado');
  }
  return { id, activo: false };
}

module.exports = {
  listarContactos,
  crearContacto,
  buildNombreContacto,
  obtenerContacto,
  actualizarContacto,
  darDeBajaContacto,
};
