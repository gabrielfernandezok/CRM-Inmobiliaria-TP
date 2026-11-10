const prisma = require('../config/prisma');
const { hasAnyProfile } = require('../middlewares/auth');

const ADMIN_PROFILES = ['Administrador', 'Corredor/Gerente'];
const ALL_PROFILES = [...ADMIN_PROFILES, 'Agente'];

function errorWithStatus(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function canManageAll(user) {
  return hasAnyProfile(user.perfiles, ADMIN_PROFILES);
}

function assertSupportedUser(user) {
  if (!hasAnyProfile(user.perfiles, ALL_PROFILES)) {
    throw errorWithStatus(403, 'No tiene permisos para esta acción');
  }
}

function ownedWhere(user, field = 'idUsuario') {
  assertSupportedUser(user);
  return canManageAll(user) ? {} : { [field]: user.id };
}

async function getContact(user, id) {
  const contact = await prisma.contacto.findFirst({
    where: { id, ...(ownedWhere(user, 'idUsuario')) },
  });
  if (!contact) throw errorWithStatus(404, 'Recurso no encontrado');
  return contact;
}

async function getProperty(user, id) {
  const property = await prisma.propiedad.findFirst({
    where: { id, ...ownedWhere(user) },
  });
  if (!property) throw errorWithStatus(404, 'Recurso no encontrado');
  return property;
}

async function getOperation(user, id) {
  const operation = await prisma.operacion.findFirst({
    where: { id, ...ownedWhere(user) },
  });
  if (!operation) throw errorWithStatus(404, 'Recurso no encontrado');
  return operation;
}

async function requireIdsExist(model, ids, message) {
  if (!ids?.length) return;
  const uniqueIds = [...new Set(ids)];
  const rows = await model.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  });
  if (rows.length !== uniqueIds.length) throw errorWithStatus(400, message);
}

async function crearInteraccion({ user, idContacto, data }) {
  await getContact(user, idContacto);
  if (data.idOperacion !== undefined && data.idOperacion !== null) {
    await getOperation(user, data.idOperacion);
  }
  return prisma.interaccion.create({
    data: {
      ...data,
      idContacto,
      idUsuario: user.id,
      fecha: data.fecha ? new Date(data.fecha) : undefined,
      fechaProxContacto: data.fechaProxContacto
        ? new Date(`${data.fechaProxContacto}T00:00:00.000Z`)
        : null,
    },
  });
}

async function listarInteracciones({ user, idContacto }) {
  await getContact(user, idContacto);
  return prisma.interaccion.findMany({
    where: { idContacto },
    include: { operacion: true, usuario: { select: { id: true, nombreUsuario: true } } },
    orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
  });
}

async function crearBusqueda({ user, idContacto, data }) {
  await getContact(user, idContacto);
  await requireIdsExist(
    prisma.caracteristica,
    data.caracteristicas || [],
    'Una o más características no existen'
  );
  const { caracteristicas = [], ...fields } = data;
  return prisma.busqueda.create({
    data: {
      ...fields,
      idContacto,
      caracteristicas: { connect: caracteristicas.map((id) => ({ id })) },
    },
    include: { caracteristicas: true },
  });
}

async function crearConsulta({ user, data }) {
  assertSupportedUser(user);
  await getContact(user, data.idContacto);
  if (data.idPropiedad !== undefined && data.idPropiedad !== null) {
    await getProperty(user, data.idPropiedad);
  }
  const canal = await prisma.canal.findUnique({
    where: { id: data.idCanal },
    select: { id: true },
  });
  if (!canal) throw errorWithStatus(400, 'El canal indicado no existe');
  return prisma.consulta.create({
    data: {
      ...data,
      idUsuario: user.id,
      fecha: data.fecha ? new Date(data.fecha) : undefined,
    },
    include: {
      contacto: { include: { personaFisica: true, personaJuridica: true } },
      propiedad: true,
      canal: true,
    },
  });
}

async function listarConsultas({ user }) {
  const where = ownedWhere(user);
  return prisma.consulta.findMany({
    where,
    include: {
      contacto: { include: { personaFisica: true, personaJuridica: true } },
      propiedad: true,
      canal: true,
      usuario: { select: { id: true, nombreUsuario: true } },
    },
    orderBy: { fecha: 'desc' },
  });
}

async function crearPropiedad({ user, data }) {
  assertSupportedUser(user);
  const { propietarios, caracteristicas = [], ...fields } = data;
  for (const owner of propietarios) await getContact(user, owner.idContacto);
  await requireIdsExist(
    prisma.caracteristica,
    caracteristicas,
    'Una o más características no existen'
  );
  return prisma.propiedad.create({
    data: {
      ...fields,
      idUsuario: user.id,
      fechaAlta: fields.fechaAlta
        ? new Date(`${fields.fechaAlta}T00:00:00.000Z`)
        : undefined,
      propietarios: {
        create: propietarios.map(({ idContacto, porcentaje }) => ({ idContacto, porcentaje })),
      },
      caracteristicas: { connect: caracteristicas.map((id) => ({ id })) },
    },
    include: {
      propietarios: { include: { contacto: { include: { personaFisica: true, personaJuridica: true } } } },
      caracteristicas: true,
    },
  });
}

async function listarPropiedades({ user, query }) {
  const where = {
    ...ownedWhere(user),
    ...(query.tipoPropiedad ? { tipoPropiedad: query.tipoPropiedad } : {}),
    ...(query.estado ? { estado: query.estado } : {}),
    ...(query.localidad ? { localidad: { contains: query.localidad } } : {}),
  };
  return prisma.propiedad.findMany({
    where,
    include: { propietarios: true, caracteristicas: true },
    orderBy: { fechaAlta: 'desc' },
  });
}

async function obtenerPropiedad({ user, id }) {
  await getProperty(user, id);
  return prisma.propiedad.findUnique({
    where: { id },
    include: {
      usuario: { select: { id: true, nombreUsuario: true } },
      propietarios: {
        include: { contacto: { include: { personaFisica: true, personaJuridica: true } } },
      },
      caracteristicas: true,
      documentaciones: true,
      operaciones: true,
    },
  });
}

async function actualizarPropiedad({ user, id, data }) {
  await getProperty(user, id);
  const { propietarios, caracteristicas, fechaAlta, ...fields } = data;
  if (propietarios) {
    for (const owner of propietarios) await getContact(user, owner.idContacto);
  }
  if (caracteristicas) {
    await requireIdsExist(
      prisma.caracteristica,
      caracteristicas,
      'Una o más características no existen'
    );
  }
  return prisma.$transaction(async (tx) => {
    if (propietarios) {
      await tx.propPropietario.deleteMany({ where: { idPropiedad: id } });
      if (propietarios.length) {
        await tx.propPropietario.createMany({
          data: propietarios.map(({ idContacto, porcentaje }) => ({
            idPropiedad: id,
            idContacto,
            porcentaje,
          })),
        });
      }
    }
    const relationData = {};
    if (caracteristicas) {
      relationData.caracteristicas = {
        set: caracteristicas.map((caracteristicaId) => ({ id: caracteristicaId })),
      };
    }
    return tx.propiedad.update({
      where: { id },
      data: {
        ...fields,
        ...(fechaAlta ? { fechaAlta: new Date(`${fechaAlta}T00:00:00.000Z`) } : {}),
        ...relationData,
      },
      include: { propietarios: true, caracteristicas: true },
    });
  });
}

async function crearVisita({ user, data }) {
  assertSupportedUser(user);
  await getContact(user, data.idContacto);
  await getProperty(user, data.idPropiedad);
  return prisma.visita.create({
    data: {
      ...data,
      idUsuario: user.id,
      fechaHora: data.fechaHora ? new Date(data.fechaHora) : undefined,
    },
    include: { contacto: true, propiedad: true },
  });
}

async function crearOperacion({ user, data }) {
  assertSupportedUser(user);
  await getProperty(user, data.idPropiedad);
  if (data.idCliente !== undefined && data.idCliente !== null) {
    await getContact(user, data.idCliente);
  }
  const etapa = await prisma.etapaOperacion.findUnique({ where: { id: data.idEtapa } });
  if (!etapa) throw errorWithStatus(400, 'La etapa indicada no existe');
  if (etapa.tipoOperacion !== 'AMBAS' && etapa.tipoOperacion !== data.tipoOperacion) {
    throw errorWithStatus(400, 'La etapa no corresponde al tipo de operación');
  }
  if (isDropStage(etapa.descripcion) && !data.idMotivoBaja) {
    throw errorWithStatus(400, 'Debe indicar el motivo de baja');
  }
  if (data.idMotivoBaja) {
    const motivo = await prisma.motivoBaja.findUnique({
      where: { id: data.idMotivoBaja },
      select: { id: true },
    });
    if (!motivo) throw errorWithStatus(400, 'El motivo de baja indicado no existe');
  }
  return prisma.operacion.create({
    data: {
      ...data,
      idUsuario: user.id,
      ...dateFields(data, ['fechaFirmaAutorizacion', 'fechaVencAutorizacion', 'fechaCierre']),
    },
    include: { propiedad: true, etapa: true, cliente: true },
  });
}

function dateFields(data, fields) {
  return Object.fromEntries(
    fields.filter((field) => data[field] !== undefined).map((field) => [field, data[field] ? new Date(`${data[field]}T00:00:00.000Z`) : null])
  );
}

async function listarOperaciones({ user, query }) {
  return prisma.operacion.findMany({
    where: {
      ...ownedWhere(user),
      ...(query.tipoOperacion ? { tipoOperacion: query.tipoOperacion } : {}),
      ...(query.idEtapa ? { idEtapa: query.idEtapa } : {}),
    },
    include: { propiedad: true, etapa: true, motivoBaja: true, cliente: true },
    orderBy: { fechaAlta: 'desc' },
  });
}

function isDropStage(description) {
  const normalized = description.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /baja|caid|cancel|desist|perdid|no concret|fracas|fallid/i.test(normalized);
}

async function cambiarEtapaOperacion({ user, id, data }) {
  const operation = await getOperation(user, id);
  const etapa = await prisma.etapaOperacion.findUnique({ where: { id: data.idEtapa } });
  if (!etapa) throw errorWithStatus(400, 'La etapa indicada no existe');
  if (etapa.tipoOperacion !== 'AMBAS' && etapa.tipoOperacion !== operation.tipoOperacion) {
    throw errorWithStatus(400, 'La etapa no corresponde al tipo de operación');
  }
  if (isDropStage(etapa.descripcion) && !data.idMotivoBaja) {
    throw errorWithStatus(400, 'Debe indicar el motivo de baja');
  }
  if (data.idMotivoBaja) {
    const motivo = await prisma.motivoBaja.findUnique({
      where: { id: data.idMotivoBaja },
      select: { id: true },
    });
    if (!motivo) throw errorWithStatus(400, 'El motivo de baja indicado no existe');
  }
  return prisma.operacion.update({
    where: { id },
    data: {
      idEtapa: data.idEtapa,
      idMotivoBaja: isDropStage(etapa.descripcion) ? data.idMotivoBaja : null,
      ...(data.fechaCierre ? { fechaCierre: new Date(`${data.fechaCierre}T00:00:00.000Z`) } : {}),
    },
    include: { etapa: true, motivoBaja: true },
  });
}

async function crearOferta({ user, idOperacion, data }) {
  await getOperation(user, idOperacion);
  const contacto = await prisma.contacto.findUnique({
    where: { id: data.idContacto },
    select: { id: true },
  });
  if (!contacto) throw errorWithStatus(400, 'El contacto indicado no existe');
  return prisma.oferta.create({
    data: {
      ...data,
      idOperacion,
      fecha: new Date(`${data.fecha}T00:00:00.000Z`),
    },
    include: { contacto: true },
  });
}

async function crearContrato({ user, idOperacion, data }) {
  const operation = await getOperation(user, idOperacion);
  if (operation.tipoOperacion !== 'ALQUILER') {
    throw errorWithStatus(400, 'Solo se pueden crear contratos para operaciones de alquiler');
  }
  await requireIdsExist(prisma.contacto, data.garantes, 'Uno o más garantes no existen');
  const { garantes, ...contractData } = data;
  return prisma.$transaction(async (tx) => {
    const ultimo = await tx.contratoAlquiler.findFirst({
      where: { idOperacion },
      orderBy: { nroRenovacion: 'desc' },
    });
    if (ultimo) {
      await tx.contratoAlquiler.update({
        where: { id: ultimo.id },
        data: { estado: 'RENOVADO' },
      });
    }
    return tx.contratoAlquiler.create({
      data: {
        ...contractData,
        idOperacion,
        nroRenovacion: ultimo ? ultimo.nroRenovacion + 1 : 0,
        ...dateFields(contractData, ['fechaFirma', 'fechaInicio', 'fechaVencimiento', 'fechaRescision']),
        garantes: { connect: garantes.map((id) => ({ id })) },
      },
      include: { garantes: true, operacion: true },
    });
  });
}

async function listarContratos({ user, query }) {
  assertSupportedUser(user);
  return prisma.contratoAlquiler.findMany({
    where: {
      ...(canManageAll(user) ? {} : { operacion: { idUsuario: user.id } }),
      ...(query.estado ? { estado: query.estado } : {}),
      ...(query.vencimientoDesde || query.vencimientoHasta
        ? {
            fechaVencimiento: {
              ...(query.vencimientoDesde
                ? { gte: new Date(`${query.vencimientoDesde}T00:00:00.000Z`) }
                : {}),
              ...(query.vencimientoHasta
                ? { lte: new Date(`${query.vencimientoHasta}T23:59:59.999Z`) }
                : {}),
            },
          }
        : {}),
    },
    include: { operacion: { include: { propiedad: true, etapa: true } }, garantes: true },
    orderBy: { fechaVencimiento: 'asc' },
  });
}

async function obtenerMenu({ user }) {
  assertSupportedUser(user);
  const perfiles = await prisma.perfilUsuario.findMany({
    where: { idUsuario: user.id },
    select: { idPerfil: true },
  });
  const permisos = await prisma.perfilPrograma.findMany({
    where: { idPerfil: { in: perfiles.map(({ idPerfil }) => idPerfil) }, puedeVer: true },
    include: { programa: { include: { menu: true } } },
  });
  const programas = new Map();
  for (const permiso of permisos) {
    const programa = permiso.programa;
    const existing = programas.get(programa.id);
    programas.set(programa.id, {
      id: programa.id,
      nombre: programa.nombre,
      ruta: programa.ruta,
      orden: programa.orden,
      puedeVer: true,
      puedeCrear: Boolean(existing?.puedeCrear || permiso.puedeCrear),
      puedeEditar: Boolean(existing?.puedeEditar || permiso.puedeEditar),
      puedeEliminar: Boolean(existing?.puedeEliminar || permiso.puedeEliminar),
      menu: programa.menu,
    });
  }
  const menus = new Map();
  for (const programa of programas.values()) {
    const { menu, ...programaData } = programa;
    if (!menus.has(menu.id)) {
      menus.set(menu.id, {
        id: menu.id,
        nombre: menu.nombre,
        orden: menu.orden,
        icono: menu.icono,
        programas: [],
      });
    }
    menus.get(menu.id).programas.push(programaData);
  }
  return [...menus.values()]
    .map((menu) => ({
      ...menu,
      programas: menu.programas.sort((a, b) => a.orden - b.orden),
    }))
    .sort((a, b) => a.orden - b.orden);
}

async function obtenerCatalogos() {
  const [etapas, canales, caracteristicas, roles, motivosBaja] = await Promise.all([
    prisma.etapaOperacion.findMany({ orderBy: { orden: 'asc' } }),
    prisma.canal.findMany({ orderBy: { descripcion: 'asc' } }),
    prisma.caracteristica.findMany({ orderBy: { descripcion: 'asc' } }),
    prisma.rol.findMany({ orderBy: { descripcionRol: 'asc' } }),
    prisma.motivoBaja.findMany({ orderBy: { descripcion: 'asc' } }),
  ]);
  return { etapas, canales, caracteristicas, roles, motivosBaja };
}

module.exports = {
  crearInteraccion,
  listarInteracciones,
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
  errorWithStatus,
};
