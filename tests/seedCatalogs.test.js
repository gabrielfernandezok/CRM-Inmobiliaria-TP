const { seedCatalogs } = require('../prisma/seedCatalogs');

function createTransactionMock() {
  let nextMenuId = 0;
  let nextProgramId = 0;
  return {
    menu: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(({ data }) => ({ id: ++nextMenuId, ...data })),
      update: jest.fn(),
    },
    programa: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(({ data }) => ({ id: ++nextProgramId, ...data })),
      update: jest.fn(),
    },
    perfilPrograma: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    canal: { upsert: jest.fn().mockResolvedValue({}) },
    caracteristica: { upsert: jest.fn().mockResolvedValue({}) },
    motivoBaja: { upsert: jest.fn().mockResolvedValue({}) },
    etapaOperacion: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn(),
    },
  };
}

test('carga programas y catálogos con permisos iniciales sin sobrescribir permisos existentes', async () => {
  const tx = createTransactionMock();
  const profileByName = new Map([
    ['Administrador', { id: 1 }],
    ['Corredor/Gerente', { id: 2 }],
    ['Agente', { id: 3 }],
  ]);

  const programs = await seedCatalogs(tx, profileByName);

  expect(programs).toHaveLength(5);
  expect(tx.menu.create).toHaveBeenCalledTimes(2);
  expect(tx.programa.create).toHaveBeenCalledTimes(5);
  expect(tx.perfilPrograma.upsert).toHaveBeenCalledTimes(15);
  expect(tx.perfilPrograma.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { idPerfil_idPrograma: { idPerfil: 3, idPrograma: 1 } },
      create: {
        idPerfil: 3,
        idPrograma: 1,
        puedeVer: true,
        puedeCrear: true,
        puedeEditar: true,
        puedeEliminar: false,
      },
      update: {},
    })
  );
  expect(tx.perfilPrograma.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { idPerfil_idPrograma: { idPerfil: 1, idPrograma: 1 } },
      create: expect.objectContaining({ puedeEliminar: true }),
      update: {},
    })
  );
  expect(tx.canal.upsert).toHaveBeenCalledTimes(5);
  expect(tx.caracteristica.upsert).toHaveBeenCalledTimes(6);
  expect(tx.motivoBaja.upsert).toHaveBeenCalledTimes(3);
  expect(tx.etapaOperacion.create).toHaveBeenCalledTimes(5);
});
