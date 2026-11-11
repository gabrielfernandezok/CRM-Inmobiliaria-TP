const menuDefinitions = [
  {
    nombre: 'CRM',
    orden: 1,
    programas: [
      { nombre: 'Contactos', ruta: '/contactos', orden: 1 },
      { nombre: 'Consultas', ruta: '/consultas', orden: 2 },
    ],
  },
  {
    nombre: 'Inmobiliaria',
    orden: 2,
    programas: [
      { nombre: 'Propiedades', ruta: '/propiedades', orden: 1 },
      { nombre: 'Operaciones', ruta: '/operaciones', orden: 2 },
      { nombre: 'Contratos', ruta: '/contratos', orden: 3 },
    ],
  },
];

const catalogDefinitions = {
  canales: ['Sitio web', 'Teléfono', 'WhatsApp', 'Correo electrónico', 'Presencial'],
  caracteristicas: ['Balcón', 'Cochera', 'Patio', 'Terraza', 'Piscina', 'Apto profesional'],
  motivosBaja: ['Cliente desistió', 'Propiedad retirada', 'No se concretó la operación'],
  etapas: ['Nueva', 'En gestión', 'En negociación', 'Cerrada', 'Caída'],
};

function defaultPermissions(profileName, route) {
  const canManage = profileName === 'Administrador' || profileName === 'Corredor/Gerente';
  const canWorkRecords = profileName === 'Agente';
  const canView = canManage || canWorkRecords;
  const canCreate = canView;
  const canEdit = canView;
  const canDelete = route === '/contactos' && canManage;

  return {
    puedeVer: canView,
    puedeCrear: canCreate,
    puedeEditar: canEdit,
    puedeEliminar: canDelete,
  };
}

async function seedCatalogs(tx, profileByName) {
  const programs = [];
  for (const menuDefinition of menuDefinitions) {
    const existingMenu = await tx.menu.findFirst({
      where: { nombre: menuDefinition.nombre },
      select: { id: true },
    });
    const menu = existingMenu
      ? await tx.menu.update({
          where: { id: existingMenu.id },
          data: { orden: menuDefinition.orden },
        })
      : await tx.menu.create({
          data: { nombre: menuDefinition.nombre, orden: menuDefinition.orden },
        });

    for (const programDefinition of menuDefinition.programas) {
      const existingProgram = await tx.programa.findFirst({
        where: { idMenu: menu.id, ruta: programDefinition.ruta },
        select: { id: true },
      });
      const program = existingProgram
        ? await tx.programa.update({
            where: { id: existingProgram.id },
            data: { nombre: programDefinition.nombre, orden: programDefinition.orden },
          })
        : await tx.programa.create({
            data: {
              idMenu: menu.id,
              nombre: programDefinition.nombre,
              ruta: programDefinition.ruta,
              orden: programDefinition.orden,
            },
          });
      programs.push(program);

      for (const [profileName, profile] of profileByName) {
        await tx.perfilPrograma.upsert({
          where: {
            idPerfil_idPrograma: {
              idPerfil: profile.id,
              idPrograma: program.id,
            },
          },
          create: {
            idPerfil: profile.id,
            idPrograma: program.id,
            ...defaultPermissions(profileName, programDefinition.ruta),
          },
          update: {},
        });
      }
    }
  }

  for (const descripcion of catalogDefinitions.canales) {
    await tx.canal.upsert({
      where: { descripcion },
      create: { descripcion },
      update: {},
    });
  }

  for (const descripcion of catalogDefinitions.caracteristicas) {
    await tx.caracteristica.upsert({
      where: { descripcion },
      create: { descripcion },
      update: {},
    });
  }

  for (const descripcion of catalogDefinitions.motivosBaja) {
    await tx.motivoBaja.upsert({
      where: { descripcion },
      create: { descripcion },
      update: {},
    });
  }

  for (const descripcion of catalogDefinitions.etapas) {
    const existingStage = await tx.etapaOperacion.findFirst({
      where: { descripcion, tipoOperacion: 'AMBAS' },
      select: { id: true },
    });
    if (existingStage) {
      await tx.etapaOperacion.update({
        where: { id: existingStage.id },
        data: { orden: catalogDefinitions.etapas.indexOf(descripcion) + 1 },
      });
    } else {
      await tx.etapaOperacion.create({
        data: {
          descripcion,
          orden: catalogDefinitions.etapas.indexOf(descripcion) + 1,
          tipoOperacion: 'AMBAS',
        },
      });
    }
  }

  return programs;
}

module.exports = { seedCatalogs, defaultPermissions, menuDefinitions, catalogDefinitions };
