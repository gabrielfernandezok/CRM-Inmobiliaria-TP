const prismaMock = {
  contacto: {},
  propiedad: {},
  propPropietario: {},
  operacion: {},
  caracteristica: {},
  interaccion: {},
  busqueda: {},
  canal: {},
  consulta: {},
  visita: {},
  etapaOperacion: {},
  motivoBaja: {},
  oferta: {},
  contratoAlquiler: {},
  perfilUsuario: {},
  perfilPrograma: {},
  menu: {},
  programa: {},
  rol: {},
  $transaction: jest.fn(),
};

for (const model of Object.values(prismaMock)) {
  if (model && typeof model === 'object' && !Array.isArray(model)) {
    for (const method of [
      'findFirst',
      'findUnique',
      'findMany',
      'create',
      'update',
      'deleteMany',
      'createMany',
    ]) {
      model[method] = jest.fn();
    }
  }
}

global.__crmPrismaMock = prismaMock;
jest.mock('../src/config/prisma', () => global.__crmPrismaMock);

const service = require('../src/services/crmService');

const agent = { id: 7, perfiles: ['Agente'] };
const admin = { id: 1, perfiles: ['Administrador'] };
const unsupportedUser = { id: 8, perfiles: ['Invitado'] };

function resetPrisma() {
  for (const model of Object.values(prismaMock)) {
    if (model && typeof model === 'object' && !Array.isArray(model)) {
      for (const method of Object.values(model)) method.mockReset();
    }
  }
  prismaMock.$transaction.mockReset();

  prismaMock.contacto.findFirst.mockImplementation(({ where }) =>
    where.idUsuario === undefined || where.idUsuario === agent.id
      ? { id: where.id, idUsuario: agent.id, tipoPersona: 'FISICA' }
      : null
  );
  prismaMock.contacto.findMany.mockImplementation(({ where }) =>
    (where.id?.in || []).map((id) => ({ id }))
  );
  prismaMock.contacto.findUnique.mockResolvedValue({ id: 10, tipoPersona: 'FISICA' });
  prismaMock.propiedad.findFirst.mockResolvedValue({ id: 20, idUsuario: agent.id });
  prismaMock.operacion.findFirst.mockResolvedValue({
    id: 30,
    idUsuario: agent.id,
    tipoOperacion: 'ALQUILER',
  });
  prismaMock.caracteristica.findMany.mockImplementation(({ where }) =>
    (where.id.in || []).map((id) => ({ id }))
  );
  prismaMock.etapaOperacion.findUnique.mockResolvedValue({
    id: 3,
    descripcion: 'En seguimiento',
    tipoOperacion: 'AMBAS',
  });
  prismaMock.motivoBaja.findUnique.mockResolvedValue({ id: 2 });
  prismaMock.contratoAlquiler.findFirst.mockResolvedValue(null);
  prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
}

beforeEach(resetPrisma);

describe('servicios CRM', () => {
  test('registra una interacción y vincula el usuario autenticado', async () => {
    prismaMock.interaccion.create.mockResolvedValue({ id: 1 });
    const result = await service.crearInteraccion({
      user: agent,
      idContacto: 10,
      data: {
        tipoInteraccion: 'SEGUIMIENTO',
        medio: 'LLAMADA',
        resultado: 'Respondió',
        fecha: '2026-01-02T10:00:00.000Z',
        fechaProxContacto: '2026-01-10',
      },
    });
    expect(result.id).toBe(1);
    expect(prismaMock.interaccion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          idContacto: 10,
          idUsuario: agent.id,
          fechaProxContacto: new Date('2026-01-10T00:00:00.000Z'),
        }),
      })
    );
  });

  test('rechaza la interacción vinculada a una operación ajena', async () => {
    prismaMock.operacion.findFirst.mockResolvedValue(null);
    await expect(
      service.crearInteraccion({
        user: agent,
        idContacto: 10,
        data: { idOperacion: 99 },
      })
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(prismaMock.interaccion.create).not.toHaveBeenCalled();
  });

  test('un agente no puede crear ni listar interacciones del contacto de otro agente', async () => {
    prismaMock.contacto.findFirst.mockResolvedValue(null);

    await expect(
      service.crearInteraccion({
        user: agent,
        idContacto: 99,
        data: { tipoInteraccion: 'SEGUIMIENTO', medio: 'LLAMADA', resultado: 'Intento' },
      })
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.listarInteracciones({ user: agent, idContacto: 99 })).rejects.toMatchObject({
      statusCode: 404,
    });

    expect(prismaMock.interaccion.create).not.toHaveBeenCalled();
    expect(prismaMock.interaccion.findMany).not.toHaveBeenCalled();
  });

  test('lista interacciones del contacto accesible', async () => {
    prismaMock.interaccion.findMany.mockResolvedValue([{ id: 4 }]);
    await expect(service.listarInteracciones({ user: agent, idContacto: 10 })).resolves.toEqual([
      { id: 4 },
    ]);
  });

  test('crea búsquedas con características y rechaza ids inexistentes', async () => {
    prismaMock.busqueda.create.mockResolvedValue({ id: 5 });
    const result = await service.crearBusqueda({
      user: agent,
      idContacto: 10,
      data: { tipoOperacion: 'COMPRA', caracteristicas: [1, 2] },
    });
    expect(result.id).toBe(5);
    expect(prismaMock.busqueda.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          idContacto: 10,
          caracteristicas: { connect: [{ id: 1 }, { id: 2 }] },
        }),
      })
    );

    prismaMock.caracteristica.findMany.mockResolvedValue([]);
    await expect(
      service.crearBusqueda({
        user: agent,
        idContacto: 10,
        data: { caracteristicas: [44] },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('crea y lista consultas, validando canal y propiedad', async () => {
    prismaMock.canal.findUnique.mockResolvedValue({ id: 2 });
    prismaMock.consulta.create.mockResolvedValue({ id: 6 });
    await service.crearConsulta({
      user: agent,
      data: { idContacto: 10, idPropiedad: 20, idCanal: 2, mensaje: 'Consulta', estado: 'PENDIENTE' },
    });
    expect(prismaMock.consulta.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ idUsuario: agent.id, idContacto: 10 }),
      })
    );
    prismaMock.consulta.findMany.mockResolvedValue([]);
    await service.listarConsultas({ user: agent });
    expect(prismaMock.consulta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idUsuario: agent.id } })
    );

    prismaMock.canal.findUnique.mockResolvedValue(null);
    await expect(
      service.crearConsulta({
        user: agent,
        data: { idContacto: 10, idCanal: 99, mensaje: 'x', estado: 'PENDIENTE' },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rechaza empresas como contacto de consultas y visitas', async () => {
    prismaMock.contacto.findFirst.mockResolvedValue({
      id: 10,
      idUsuario: agent.id,
      tipoPersona: 'JURIDICA',
    });

    await expect(
      service.crearConsulta({
        user: agent,
        data: { idContacto: 10, idCanal: 2, mensaje: 'Consulta', estado: 'PENDIENTE' },
      })
    ).rejects.toMatchObject({ statusCode: 400, message: 'Debe seleccionar una persona física' });
    await expect(
      service.crearVisita({
        user: agent,
        data: { idContacto: 10, idPropiedad: 20 },
      })
    ).rejects.toMatchObject({ statusCode: 400, message: 'Debe seleccionar una persona física' });

    expect(prismaMock.consulta.create).not.toHaveBeenCalled();
    expect(prismaMock.visita.create).not.toHaveBeenCalled();
  });

  test('un agente solo lista sus consultas y no puede crear una con contacto o propiedad ajenos', async () => {
    prismaMock.consulta.findMany.mockResolvedValue([]);
    await service.listarConsultas({ user: agent });
    expect(prismaMock.consulta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idUsuario: agent.id } })
    );

    prismaMock.contacto.findFirst.mockResolvedValue(null);
    await expect(
      service.crearConsulta({
        user: agent,
        data: { idContacto: 99, idCanal: 1, mensaje: 'Consulta', estado: 'PENDIENTE' },
      })
    ).rejects.toMatchObject({ statusCode: 404 });

    prismaMock.contacto.findFirst.mockResolvedValue({
      id: 10,
      idUsuario: agent.id,
      tipoPersona: 'FISICA',
    });
    prismaMock.propiedad.findFirst.mockResolvedValue(null);
    await expect(
      service.crearConsulta({
        user: agent,
        data: {
          idContacto: 10,
          idPropiedad: 99,
          idCanal: 1,
          mensaje: 'Consulta',
          estado: 'PENDIENTE',
        },
      })
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(prismaMock.consulta.create).not.toHaveBeenCalled();
  });

  test('crea y filtra propiedades por propietario agente', async () => {
    prismaMock.propiedad.create.mockResolvedValue({ id: 20 });
    const data = {
      tipoPropiedad: 'CASA',
      direccion: 'Calle 1',
      estado: 'DISPONIBLE',
      fechaAlta: '2026-01-01',
      propietarios: [{ idContacto: 10, porcentaje: '100' }],
      caracteristicas: [1],
    };
    await service.crearPropiedad({ user: agent, data });
    expect(prismaMock.propiedad.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          idUsuario: agent.id,
          fechaAlta: new Date('2026-01-01T00:00:00.000Z'),
          propietarios: { create: [{ idContacto: 10, porcentaje: '100' }] },
        }),
      })
    );

    prismaMock.propiedad.findMany.mockResolvedValue([{ id: 20 }]);
    await service.listarPropiedades({
      user: agent,
      query: { tipoPropiedad: 'CASA', estado: 'DISPONIBLE', localidad: 'Centro' },
    });
    expect(prismaMock.propiedad.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          idUsuario: agent.id,
          tipoPropiedad: 'CASA',
          estado: 'DISPONIBLE',
          localidad: { contains: 'Centro' },
        },
      })
    );
  });

  test('obtiene propiedad propia y actualiza campos, propietarios y características', async () => {
    prismaMock.propiedad.findUnique.mockResolvedValue({ id: 20 });
    await service.obtenerPropiedad({ user: agent, id: 20 });
    prismaMock.propiedad.update.mockResolvedValue({ id: 20, estado: 'RESERVADA' });
    const result = await service.actualizarPropiedad({
      user: agent,
      id: 20,
      data: {
        estado: 'RESERVADA',
        fechaAlta: '2026-02-01',
        propietarios: [{ idContacto: 10, porcentaje: '100' }],
        caracteristicas: [2],
      },
    });
    expect(result.estado).toBe('RESERVADA');
    expect(prismaMock.propPropietario.deleteMany).toHaveBeenCalledWith({
      where: { idPropiedad: 20 },
    });
    expect(prismaMock.propPropietario.createMany).toHaveBeenCalled();
    expect(prismaMock.propiedad.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'RESERVADA',
          caracteristicas: { set: [{ id: 2 }] },
        }),
      })
    );
  });

  test('un agente no puede ver ni modificar una propiedad de otro agente', async () => {
    prismaMock.propiedad.findFirst.mockResolvedValue(null);

    await expect(service.obtenerPropiedad({ user: agent, id: 99 })).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(
      service.actualizarPropiedad({ user: agent, id: 99, data: { estado: 'RESERVADA' } })
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(prismaMock.propiedad.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.propiedad.update).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  test('registra visitas y abre operaciones con validaciones de etapa', async () => {
    prismaMock.visita.create.mockResolvedValue({ id: 9 });
    await service.crearVisita({
      user: agent,
      data: { idContacto: 10, idPropiedad: 20, fechaHora: '2026-01-01T10:00:00.000Z' },
    });
    expect(prismaMock.visita.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ idUsuario: agent.id, idContacto: 10, idPropiedad: 20 }),
      })
    );

    prismaMock.operacion.create.mockResolvedValue({ id: 30 });
    await service.crearOperacion({
      user: agent,
      data: { idPropiedad: 20, idCliente: 10, idEtapa: 3, tipoOperacion: 'ALQUILER' },
    });
    expect(prismaMock.operacion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ idUsuario: agent.id }),
      })
    );

    prismaMock.etapaOperacion.findUnique.mockResolvedValue(null);
    await expect(
      service.crearOperacion({
        user: agent,
        data: { idPropiedad: 20, idEtapa: 99, tipoOperacion: 'ALQUILER' },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('un agente no puede registrar visitas a contacto o propiedad ajenos', async () => {
    prismaMock.contacto.findFirst.mockResolvedValue(null);
    await expect(
      service.crearVisita({
        user: agent,
        data: { idContacto: 99, idPropiedad: 20 },
      })
    ).rejects.toMatchObject({ statusCode: 404 });

    prismaMock.contacto.findFirst.mockResolvedValue({
      id: 10,
      idUsuario: agent.id,
      tipoPersona: 'FISICA',
    });
    prismaMock.propiedad.findFirst.mockResolvedValue(null);
    await expect(
      service.crearVisita({
        user: agent,
        data: { idContacto: 10, idPropiedad: 99 },
      })
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(prismaMock.visita.create).not.toHaveBeenCalled();
  });

  test('lista visitas de una propiedad accesible y rechaza propiedades ajenas', async () => {
    prismaMock.visita.findMany.mockResolvedValue([{ id: 5, idPropiedad: 20 }]);
    await expect(
      service.listarVisitasPropiedad({ user: agent, idPropiedad: 20 })
    ).resolves.toEqual([{ id: 5, idPropiedad: 20 }]);
    expect(prismaMock.visita.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idPropiedad: 20 },
        orderBy: [{ fechaHora: 'desc' }, { id: 'desc' }],
      })
    );

    prismaMock.propiedad.findFirst.mockResolvedValue(null);
    await expect(
      service.listarVisitasPropiedad({ user: agent, idPropiedad: 99 })
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(prismaMock.visita.findMany).toHaveBeenCalledTimes(1);
  });

  test('lista operaciones y cambia etapa, exigiendo motivo para baja', async () => {
    prismaMock.operacion.findMany.mockResolvedValue([{ id: 30 }]);
    await service.listarOperaciones({
      user: agent,
      query: { tipoOperacion: 'ALQUILER', idEtapa: 3 },
    });
    expect(prismaMock.operacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idUsuario: agent.id, tipoOperacion: 'ALQUILER', idEtapa: 3 },
      })
    );

    prismaMock.operacion.update.mockResolvedValue({ id: 30 });
    await service.cambiarEtapaOperacion({
      user: agent,
      id: 30,
      data: { idEtapa: 3, fechaCierre: '2026-03-01' },
    });
    expect(prismaMock.operacion.update).toHaveBeenCalled();

    prismaMock.etapaOperacion.findUnique.mockResolvedValue({
      id: 4,
      descripcion: 'Caída de operación',
      tipoOperacion: 'ALQUILER',
    });
    await expect(
      service.cambiarEtapaOperacion({ user: agent, id: 30, data: { idEtapa: 4 } })
    ).rejects.toMatchObject({ statusCode: 400 });
    await service.cambiarEtapaOperacion({
      user: agent,
      id: 30,
      data: { idEtapa: 4, idMotivoBaja: 2 },
    });
    expect(prismaMock.operacion.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ idMotivoBaja: 2 }),
      })
    );
  });

  test('un agente no puede cambiar la etapa ni crear ofertas o contratos en operación ajena', async () => {
    prismaMock.operacion.findFirst.mockResolvedValue(null);

    await expect(
      service.cambiarEtapaOperacion({ user: agent, id: 99, data: { idEtapa: 3 } })
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      service.crearOferta({
        user: agent,
        idOperacion: 99,
        data: { idContacto: 10, monto: '500', moneda: 'ARS', fecha: '2026-01-01' },
      })
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      service.crearContrato({
        user: agent,
        idOperacion: 99,
        data: { garantes: [] },
      })
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(prismaMock.operacion.update).not.toHaveBeenCalled();
    expect(prismaMock.oferta.create).not.toHaveBeenCalled();
    expect(prismaMock.contratoAlquiler.create).not.toHaveBeenCalled();
  });

  test('registra ofertas y crea contratos iniciales y renovaciones', async () => {
    prismaMock.oferta.create.mockResolvedValue({ id: 1 });
    await service.crearOferta({
      user: agent,
      idOperacion: 30,
      data: { idContacto: 10, monto: '1000', moneda: 'USD', fecha: '2026-01-01' },
    });

    expect(prismaMock.oferta.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          idOperacion: 30,
          fecha: new Date('2026-01-01T00:00:00.000Z'),
        }),
      })
    );

    const contract = {
      fechaFirma: '2026-01-01',
      fechaInicio: '2026-01-01',
      fechaVencimiento: '2027-01-01',
      fechaRescision: null,
      montoAlquiler: '1000',
      moneda: 'ARS',
      frecuenciaAjuste: 'ANUAL',
      indiceAjuste: 'IPC',
      depositoGarantia: '1000',
      diasAviso: 30,
      estado: 'VIGENTE',
      garantes: [10],
    };
    prismaMock.contratoAlquiler.create.mockResolvedValue({ nroRenovacion: 0 });
    await service.crearContrato({ user: agent, idOperacion: 30, data: contract });
    expect(prismaMock.contratoAlquiler.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nroRenovacion: 0,
          garantes: { connect: [{ id: 10 }] },
          fechaFirma: new Date('2026-01-01T00:00:00.000Z'),
        }),
      })
    );

    prismaMock.contratoAlquiler.findFirst.mockResolvedValue({ id: 8, nroRenovacion: 0 });
    await service.crearContrato({ user: agent, idOperacion: 30, data: contract });
    expect(prismaMock.contratoAlquiler.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: { estado: 'RENOVADO' },
    });
    expect(prismaMock.contratoAlquiler.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nroRenovacion: 1 }),
      })
    );
  });

  test('rechaza empresas como garantes de contratos', async () => {
    prismaMock.contacto.findFirst.mockResolvedValue({
      id: 10,
      idUsuario: agent.id,
      tipoPersona: 'JURIDICA',
    });
    await expect(
      service.crearContrato({
        user: agent,
        idOperacion: 30,
        data: { garantes: [10] },
      })
    ).rejects.toMatchObject({ statusCode: 400, message: 'Debe seleccionar una persona física' });
    expect(prismaMock.contratoAlquiler.create).not.toHaveBeenCalled();
  });

  test('traduce una colisión de nroRenovacion único a conflicto 409', async () => {
    prismaMock.contratoAlquiler.create.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['idOperacion', 'nroRenovacion'] },
    });
    await expect(
      service.crearContrato({
        user: agent,
        idOperacion: 30,
        data: {
          fechaFirma: '2026-01-01',
          fechaInicio: '2026-01-01',
          fechaVencimiento: '2027-01-01',
          montoAlquiler: '1000',
          moneda: 'ARS',
          frecuenciaAjuste: 'ANUAL',
          indiceAjuste: 'IPC',
          depositoGarantia: '1000',
          diasAviso: 30,
          estado: 'VIGENTE',
          garantes: [],
        },
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Ya existe un contrato con ese número de renovación para la operación',
    });
  });

  test('filtra contratos, arma el menú por permisos y devuelve catálogos', async () => {
    prismaMock.contratoAlquiler.findMany.mockResolvedValue([]);
    await service.listarContratos({
      user: agent,
      query: {
        estado: 'VIGENTE',
        vencimientoDesde: '2026-01-01',
        vencimientoHasta: '2026-12-31',
      },
    });
    expect(prismaMock.contratoAlquiler.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          operacion: { idUsuario: agent.id },
          estado: 'VIGENTE',
        }),
      })
    );

    prismaMock.perfilUsuario.findMany.mockResolvedValue([{ idPerfil: 4 }]);
    prismaMock.perfilPrograma.findMany.mockResolvedValue([
      {
        puedeCrear: false,
        puedeEditar: false,
        puedeEliminar: false,
        programa: {
          id: 5,
          nombre: 'Contactos',
          ruta: '/contactos',
          orden: 2,
          menu: { id: 1, nombre: 'CRM', orden: 1, icono: null },
        },
      },
      {
        puedeCrear: true,
        puedeEditar: true,
        puedeEliminar: false,
        programa: {
          id: 5,
          nombre: 'Contactos',
          ruta: '/contactos',
          orden: 2,
          menu: { id: 1, nombre: 'CRM', orden: 1, icono: null },
        },
      },
    ]);
    const menu = await service.obtenerMenu({ user: agent });
    expect(menu[0].programas[0]).toMatchObject({
      nombre: 'Contactos',
      puedeVer: true,
      puedeCrear: true,
      puedeEditar: true,
    });

    prismaMock.etapaOperacion.findMany.mockResolvedValue([]);
    prismaMock.canal.findMany.mockResolvedValue([]);
    prismaMock.caracteristica.findMany.mockResolvedValue([]);
    prismaMock.rol.findMany.mockResolvedValue([]);
    prismaMock.motivoBaja.findMany.mockResolvedValue([]);
    await expect(service.obtenerCatalogos()).resolves.toEqual({
      etapas: [],
      canales: [],
      caracteristicas: [],
      roles: [],
      motivosBaja: [],
    });
  });

  test('rechaza usuarios sin perfil y devuelve 404 para recursos ajenos', async () => {
    await expect(service.listarConsultas({ user: unsupportedUser })).rejects.toMatchObject({
      statusCode: 403,
    });
    prismaMock.contacto.findFirst.mockResolvedValue(null);
    await expect(service.crearInteraccion({ user: agent, idContacto: 99, data: {} })).rejects.toMatchObject({
      statusCode: 404,
    });
    prismaMock.propiedad.findFirst.mockResolvedValue(null);
    await expect(service.obtenerPropiedad({ user: agent, id: 99 })).rejects.toMatchObject({
      statusCode: 404,
    });
    prismaMock.operacion.findFirst.mockResolvedValue(null);
    await expect(service.crearOferta({ user: agent, idOperacion: 99, data: {} })).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
