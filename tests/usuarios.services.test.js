const mockPrisma = {
  perfil: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  usuario: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  perfilUsuario: {
    count: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  perfilPrograma: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  programa: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../src/config/prisma', () => mockPrisma);

const service = require('../src/services/usuariosService');

const admin = { id: 1, perfiles: ['Administrador'] };
const manager = { id: 2, perfiles: ['Corredor/Gerente'] };

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
});

describe('servicios administrativos', () => {
  test('lista perfiles y usuarios omitiendo contraseñas', async () => {
    mockPrisma.perfil.findMany.mockResolvedValue([{ id: 1, nombre: 'Agente' }]);
    await expect(service.listarPerfiles()).resolves.toEqual([{ id: 1, nombre: 'Agente' }]);

    mockPrisma.usuario.findMany.mockResolvedValue([
      {
        id: 5,
        nombreUsuario: 'agente',
        contrasena: 'no-debe-exponerse',
        perfiles: [{ perfil: { nombre: 'Agente' } }],
      },
    ]);
    const users = await service.listarUsuarios();
    expect(users[0]).toEqual({
      id: 5,
      nombreUsuario: 'agente',
      perfiles: ['Agente'],
    });
    expect(users[0]).not.toHaveProperty('contrasena');
  });

  test('actualiza perfiles de un usuario y devuelve una respuesta segura', async () => {
    mockPrisma.usuario.findUnique
      .mockResolvedValueOnce({ id: 5, perfiles: [] })
      .mockResolvedValueOnce({
        id: 5,
        idPersonaFisica: 8,
        nombreUsuario: 'agente',
        mail: 'agente@example.com',
        estado: 'ACTIVO',
        ultimoAcceso: null,
        perfiles: [{ perfil: { nombre: 'Agente' } }],
      });
    mockPrisma.perfil.findMany.mockResolvedValue([{ id: 3, nombre: 'Agente' }]);

    const result = await service.actualizarPerfilesUsuario({
      actor: admin,
      idUsuario: 5,
      idsPerfiles: [3],
    });
    expect(result.perfiles).toEqual(['Agente']);
    expect(result).not.toHaveProperty('contrasena');
    expect(mockPrisma.perfilUsuario.deleteMany).toHaveBeenCalledWith({
      where: { idUsuario: 5 },
    });
    expect(mockPrisma.perfilUsuario.createMany).toHaveBeenCalledWith({
      data: [{ idUsuario: 5, idPerfil: 3 }],
    });
  });

  test('rechaza usuario inexistente, autoedición e ids de perfil desconocidos', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.actualizarPerfilesUsuario({ actor: admin, idUsuario: 5, idsPerfiles: [3] })
    ).rejects.toMatchObject({ statusCode: 404 });

    mockPrisma.usuario.findUnique.mockResolvedValueOnce({ id: admin.id, perfiles: [] });
    await expect(
      service.actualizarPerfilesUsuario({ actor: admin, idUsuario: admin.id, idsPerfiles: [3] })
    ).rejects.toMatchObject({ statusCode: 403 });

    mockPrisma.usuario.findUnique.mockResolvedValueOnce({ id: 5, perfiles: [] });
    mockPrisma.perfil.findMany.mockResolvedValue([]);
    await expect(
      service.actualizarPerfilesUsuario({ actor: admin, idUsuario: 5, idsPerfiles: [99] })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('limita a gerentes al asignar perfiles y protege al último administrador', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValueOnce({
      id: 5,
      perfiles: [{ idPerfil: 1, perfil: { nombre: 'Administrador' } }],
    });
    mockPrisma.perfil.findMany.mockResolvedValue([{ id: 3, nombre: 'Agente' }]);
    await expect(
      service.actualizarPerfilesUsuario({ actor: manager, idUsuario: 5, idsPerfiles: [3] })
    ).rejects.toMatchObject({ statusCode: 403 });

    mockPrisma.usuario.findUnique.mockResolvedValueOnce({
      id: 5,
      perfiles: [{ idPerfil: 1, perfil: { nombre: 'Administrador' } }],
    });
    mockPrisma.perfil.findMany.mockResolvedValue([{ id: 3, nombre: 'Agente' }]);
    mockPrisma.perfilUsuario.count.mockResolvedValue(1);
    await expect(
      service.actualizarPerfilesUsuario({ actor: admin, idUsuario: 5, idsPerfiles: [3] })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  test('convierte conflictos de concurrencia en respuesta de conflicto', async () => {
    mockPrisma.$transaction.mockRejectedValue({ code: 'P2034' });
    await expect(
      service.actualizarPerfilesUsuario({ actor: admin, idUsuario: 5, idsPerfiles: [3] })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  test('reemplaza permisos de programas de un perfil', async () => {
    mockPrisma.perfil.findUnique
      .mockResolvedValueOnce({ id: 2 })
      .mockResolvedValueOnce({
        id: 2,
        nombre: 'Agente',
        programas: [{ idPrograma: 4, puedeVer: true }],
      });
    mockPrisma.programa.findMany.mockResolvedValue([{ id: 4 }]);

    const result = await service.actualizarProgramasPerfil({
      idPerfil: 2,
      programas: [
        {
          idPrograma: 4,
          puedeVer: true,
          puedeCrear: false,
          puedeEditar: true,
          puedeEliminar: false,
        },
      ],
    });
    expect(result.programas).toHaveLength(1);
    expect(mockPrisma.perfilPrograma.deleteMany).toHaveBeenCalledWith({
      where: { idPerfil: 2 },
    });
    expect(mockPrisma.perfilPrograma.createMany).toHaveBeenCalledWith({
      data: [
        {
          idPerfil: 2,
          idPrograma: 4,
          puedeVer: true,
          puedeCrear: false,
          puedeEditar: true,
          puedeEliminar: false,
        },
      ],
    });
  });

  test('devuelve 404 o 400 al asignar programas inválidos', async () => {
    mockPrisma.perfil.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.actualizarProgramasPerfil({ idPerfil: 99, programas: [] })
    ).rejects.toMatchObject({ statusCode: 404 });

    mockPrisma.perfil.findUnique.mockResolvedValueOnce({ id: 2 });
    mockPrisma.programa.findMany.mockResolvedValue([]);
    await expect(
      service.actualizarProgramasPerfil({
        idPerfil: 2,
        programas: [
          {
            idPrograma: 4,
            puedeVer: true,
            puedeCrear: false,
            puedeEditar: false,
            puedeEliminar: false,
          },
        ],
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
