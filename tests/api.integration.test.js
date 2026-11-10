const mockPrisma = {
  usuario: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  personaFisica: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  perfil: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  rol: {
    upsert: jest.fn(),
  },
  contacto: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  contactoRol: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  perfilUsuario: {
    create: jest.fn(),
    createMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../src/config/prisma', () => mockPrisma);

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');

const testPassword = 'ClaveSegura123';
const testSecret = 'test-secret-for-integration-tests';

function makeUser(id, nombreUsuario, perfil, contrasena) {
  return {
    id,
    nombreUsuario,
    mail: `${nombreUsuario}@example.com`,
    contrasena,
    estado: 'ACTIVO',
    perfiles: [{ idPerfil: id, perfil: { id, nombre: perfil } }],
  };
}

function makeContact(id, idUsuario) {
  return {
    id,
    idUsuario,
    tipoPersona: 'FISICA',
    cuitCuil: null,
    telefono: '1122334455',
    mail: `contacto${id}@example.com`,
    domicilio: 'Calle 123',
    localidad: 'Buenos Aires',
    fechaAlta: new Date('2026-01-01T00:00:00.000Z'),
    observaciones: null,
    activo: true,
    personaFisica: {
      id,
      apellido: 'Pérez',
      nombres: 'Ana',
      dni: 20000000 + id,
      fechaNac: new Date('1990-01-01T00:00:00.000Z'),
      sexo: 'F',
    },
    personaJuridica: null,
    roles: [],
    propiedades: [],
  };
}

describe('API REST - integración HTTP', () => {
  let agent;
  let otherAgent;
  let admin;

  beforeAll(async () => {
    process.env.JWT_SECRET = testSecret;
    const hashedPassword = await bcrypt.hash(testPassword, 4);
    agent = makeUser(1, 'agente1', 'Agente', hashedPassword);
    otherAgent = makeUser(2, 'agente2', 'Agente', hashedPassword);
    admin = makeUser(3, 'admin', 'Administrador', hashedPassword);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
    mockPrisma.usuario.findUnique.mockImplementation(({ where }) => {
      return [agent, otherAgent, admin].find((user) => user.id === where.id) || null;
    });
    mockPrisma.usuario.findFirst.mockResolvedValue(null);
    mockPrisma.personaFisica.findUnique.mockResolvedValue(null);
    mockPrisma.contacto.findMany.mockResolvedValue([]);
    mockPrisma.contacto.findUnique.mockResolvedValue(null);
    mockPrisma.contacto.findFirst.mockResolvedValue(null);
    mockPrisma.contactoRol.findMany.mockResolvedValue([]);
  });

  function tokenFor(user) {
    return jwt.sign({ sub: user.id }, testSecret, { expiresIn: '1h' });
  }

  function as(user) {
    return { Authorization: `Bearer ${tokenFor(user)}` };
  }

  test('POST /auth/registro crea la cuenta y no devuelve la contraseña', async () => {
    const createdContact = { id: 21, tipoPersona: 'FISICA', activo: true };
    const createdPerson = {
      id: 21,
      apellido: 'López',
      nombres: 'María',
      dni: 30123456,
      fechaNac: new Date('1994-04-03T00:00:00.000Z'),
      sexo: 'F',
    };
    const createdUser = makeUser(21, 'maria', 'Agente', 'hash');
    mockPrisma.perfil.findUnique.mockResolvedValue({ id: 1, nombre: 'Agente' });
    mockPrisma.rol.upsert.mockResolvedValue({ id: 1, descripcionRol: 'Empleado' });
    mockPrisma.contacto.create.mockResolvedValue(createdContact);
    mockPrisma.contactoRol.create.mockResolvedValue({});
    mockPrisma.personaFisica.create.mockResolvedValue(createdPerson);
    mockPrisma.usuario.create.mockResolvedValue(createdUser);
    mockPrisma.usuario.findUnique.mockResolvedValue({
      ...createdUser,
      perfiles: [{ perfil: { nombre: 'Agente' } }],
    });

    const response = await request(app).post('/auth/registro').send({
      nombreUsuario: 'maria',
      mail: 'MARIA@example.com',
      contrasena: testPassword,
      apellido: 'López',
      nombres: 'María',
      dni: 30123456,
      fechaNac: '1994-04-03',
      sexo: 'F',
    });

    expect(response.status).toBe(201);
    expect(response.body.nombreUsuario).toBe('maria');
    expect(response.body.perfiles).toContain('Agente');
    expect(response.body).not.toHaveProperty('contrasena');
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  test('POST /auth/login acepta credenciales válidas y devuelve un JWT', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(agent);
    mockPrisma.usuario.update.mockResolvedValue(agent);

    const response = await request(app).post('/auth/login').send({
      nombreUsuario: 'agente1',
      contrasena: testPassword,
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.nombreUsuario).toBe('agente1');
    expect(response.body.user).not.toHaveProperty('contrasena');
    expect(mockPrisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: agent.id } })
    );
  });

  test('POST /auth/login devuelve 401 para credenciales incorrectas', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue(null);

    const response = await request(app).post('/auth/login').send({
      nombreUsuario: 'no-existe',
      contrasena: testPassword,
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Credenciales inválidas');
  });

  test('POST /auth/login rechaza a un usuario INACTIVO con 403', async () => {
    mockPrisma.usuario.findFirst.mockResolvedValue({ ...agent, estado: 'INACTIVO' });

    const response = await request(app).post('/auth/login').send({
      nombreUsuario: 'agente1',
      contrasena: testPassword,
    });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Usuario inactivo');
    expect(mockPrisma.usuario.update).not.toHaveBeenCalled();
  });

  test('GET /contactos devuelve 401 si falta el token', async () => {
    const response = await request(app).get('/contactos');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Token no proporcionado');
    expect(mockPrisma.contacto.findMany).not.toHaveBeenCalled();
  });

  test('POST /contactos devuelve 400 si faltan datos obligatorios', async () => {
    const response = await request(app)
      .post('/contactos')
      .set(as(agent))
      .send({ tipoPersona: 'FISICA', nombres: 'Sin apellido' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Datos inválidos');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test('los cuerpos inválidos de todos los endpoints de escritura se rechazan antes del controlador', async () => {
    const cases = [
      ['POST', '/auth/registro', {}, null],
      ['POST', '/auth/login', {}, null],
      ['POST', '/contactos', {}, agent],
      ['PATCH', '/contactos/5', {}, agent],
      ['POST', '/contactos/5/interacciones', {}, agent],
      ['POST', '/contactos/5/busquedas', {}, agent],
      ['POST', '/consultas', {}, agent],
      ['POST', '/propiedades', {}, agent],
      ['PATCH', '/propiedades/5', {}, agent],
      ['POST', '/visitas', {}, agent],
      ['POST', '/operaciones', {}, agent],
      ['PATCH', '/operaciones/5/etapa', {}, agent],
      ['POST', '/operaciones/5/ofertas', {}, agent],
      ['POST', '/operaciones/5/contratos', {}, agent],
      ['PUT', '/usuarios/5/perfiles', {}, admin],
      ['PUT', '/perfiles/1/programas', {}, admin],
    ];

    for (const [method, path, body, user] of cases) {
      const call = request(app)[method.toLowerCase()](path);
      if (user) call.set(as(user));
      const response = await call.send(body);
      expect({ method, path, status: response.status, message: response.body.message }).toEqual({
        method,
        path,
        status: 400,
        message: 'Datos inválidos',
      });
    }

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.contacto.create).not.toHaveBeenCalled();
    expect(mockPrisma.usuario.create).not.toHaveBeenCalled();
  });

  test('las fechas inválidas de registro y contacto se rechazan con mensajes en español', async () => {
    const registerResponse = await request(app).post('/auth/registro').send({
      nombreUsuario: 'fecha-mal',
      mail: 'fecha@example.com',
      contrasena: testPassword,
      apellido: 'Prueba',
      nombres: 'Fecha',
      dni: 30123457,
      fechaNac: '2026-02-31',
      sexo: 'F',
    });
    expect(registerResponse.status).toBe(400);
    expect(registerResponse.body.errors.map((error) => error.message)).toContain('La fecha no es válida');
    expect(mockPrisma.usuario.findFirst).not.toHaveBeenCalled();

    const contactResponse = await request(app)
      .post('/contactos')
      .set(as(agent))
      .send({
        tipoPersona: 'FISICA',
        apellido: 'Prueba',
        nombres: 'Fecha',
        dni: 30123457,
        fechaNac: '2026-02-31',
        sexo: 'F',
      });
    expect(contactResponse.status).toBe(400);
    expect(contactResponse.body.errors.map((error) => error.message)).toContain('La fecha no es válida');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test('la fecha del representante y un PATCH vacío se rechazan en la validación del body', async () => {
    const legalContactResponse = await request(app)
      .post('/contactos')
      .set(as(agent))
      .send({
        tipoPersona: 'JURIDICA',
        razonSocial: 'Empresa de prueba',
        tipoSocietario: 'SA',
        fechaConstitucion: '2020-01-01',
        representantes: [{ dni: 20123456, cargo: 'Apoderado', fechaDesde: '2026-02-31' }],
      });
    expect(legalContactResponse.status).toBe(400);
    expect(legalContactResponse.body.errors.map((error) => error.message)).toContain(
      'La fecha no es válida'
    );

    const emptyPatchResponse = await request(app)
      .patch('/contactos/5')
      .set(as(agent))
      .send({});
    expect(emptyPatchResponse.status).toBe(400);
    expect(emptyPatchResponse.body.errors.map((error) => error.message)).toContain(
      'Debe enviar al menos un campo para modificar'
    );
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test('GET /contactos lista los contactos propios del agente', async () => {
    mockPrisma.contacto.findMany.mockResolvedValue([makeContact(11, agent.id)]);

    const response = await request(app).get('/contactos?activo=true').set(as(agent));

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ id: 11, nombre: 'Pérez Ana' });
    expect(mockPrisma.contacto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ idUsuario: agent.id, activo: true }),
      })
    );
  });

  test('POST /contactos crea un contacto con el agente autenticado como dueño', async () => {
    const createdContact = { id: 15, idUsuario: agent.id, tipoPersona: 'FISICA', activo: true };
    mockPrisma.contacto.create.mockResolvedValue(createdContact);
    mockPrisma.personaFisica.create.mockResolvedValue({
      id: 15,
      apellido: 'Gómez',
      nombres: 'Luis',
      dni: 25123456,
      fechaNac: new Date('1988-05-06T00:00:00.000Z'),
      sexo: 'M',
    });

    const response = await request(app)
      .post('/contactos')
      .set(as(agent))
      .send({
        tipoPersona: 'FISICA',
        apellido: 'Gómez',
        nombres: 'Luis',
        dni: 25123456,
        fechaNac: '1988-05-06',
        sexo: 'M',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: 15,
      idUsuario: agent.id,
      nombre: 'Gómez Luis',
    });
    expect(mockPrisma.contacto.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ idUsuario: agent.id }),
      })
    );
  });

  test('POST /contactos devuelve 409 al repetir DNI o CUIT', async () => {
    mockPrisma.personaFisica.findUnique.mockResolvedValueOnce({ id: 8 });
    const duplicateDniResponse = await request(app)
      .post('/contactos')
      .set(as(agent))
      .send({
        tipoPersona: 'FISICA',
        apellido: 'Repetido',
        nombres: 'DNI',
        dni: 20000008,
        fechaNac: '1990-01-01',
        sexo: 'F',
      });

    expect(duplicateDniResponse.status).toBe(409);
    expect(duplicateDniResponse.body.message).toBe('El contacto ya está registrado');

    mockPrisma.personaFisica.findUnique.mockResolvedValueOnce(null);
    mockPrisma.contacto.findUnique.mockResolvedValueOnce({ id: 9, cuitCuil: '20-12345678-9' });
    const duplicateCuitResponse = await request(app)
      .post('/contactos')
      .set(as(agent))
      .send({
        tipoPersona: 'FISICA',
        apellido: 'Repetido',
        nombres: 'CUIT',
        dni: 30123458,
        fechaNac: '1990-01-01',
        sexo: 'F',
        cuitCuil: '20-12345678-9',
      });

    expect(duplicateCuitResponse.status).toBe(409);
    expect(duplicateCuitResponse.body.message).toBe('El contacto ya está registrado');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test('un Agente recibe 403 al eliminar contactos o asignar perfiles', async () => {
    const deleteResponse = await request(app)
      .delete('/contactos/5')
      .set(as(agent));
    expect(deleteResponse.status).toBe(403);
    expect(deleteResponse.body.message).toBe('No tiene permisos para esta acción');

    const assignResponse = await request(app)
      .put('/usuarios/5/perfiles')
      .set(as(agent))
      .send({ perfiles: [2] });
    expect(assignResponse.status).toBe(403);
    expect(assignResponse.body.message).toBe('No tiene permisos para esta acción');
    expect(mockPrisma.contacto.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.perfilUsuario?.createMany).not.toHaveBeenCalled();
  });

  test('GET /contactos/:id devuelve 404 si el contacto no existe', async () => {
    mockPrisma.contacto.findUnique.mockResolvedValue(null);

    const response = await request(app).get('/contactos/999').set(as(agent));

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Recurso no encontrado');
  });

  test('GET /contactos/:id no permite al agente ver el contacto de otro agente', async () => {
    mockPrisma.contacto.findUnique.mockResolvedValue(makeContact(12, otherAgent.id));

    const response = await request(app).get('/contactos/12').set(as(agent));

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Recurso no encontrado');
  });

  test('PATCH /contactos/:id no permite al agente modificar el contacto de otro agente', async () => {
    mockPrisma.contacto.findUnique.mockResolvedValue(makeContact(12, otherAgent.id));

    const response = await request(app)
      .patch('/contactos/12')
      .set(as(agent))
      .send({ telefono: '1199998888' });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Recurso no encontrado');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.contacto.update).not.toHaveBeenCalled();
    expect(mockPrisma.personaFisica.update).not.toHaveBeenCalled();
  });

  test('PATCH /contactos/:id actualiza un contacto propio', async () => {
    const ownContact = makeContact(13, agent.id);
    mockPrisma.contacto.findUnique
      .mockResolvedValueOnce(ownContact)
      .mockResolvedValueOnce({ ...ownContact, telefono: '1188776655' });

    const response = await request(app)
      .patch('/contactos/13')
      .set(as(agent))
      .send({ telefono: '1188776655' });

    expect(response.status).toBe(200);
    expect(response.body.telefono).toBe('1188776655');
    expect(mockPrisma.contacto.update).toHaveBeenCalledWith({
      where: { id: 13 },
      data: { telefono: '1188776655' },
    });
  });
});
