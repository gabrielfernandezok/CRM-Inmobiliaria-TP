require('dotenv').config();

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { seedCatalogs } = require('./seedCatalogs');

const prisma = new PrismaClient();

const profiles = [
  ['Administrador', 'Administra usuarios y la configuración del sistema.'],
  ['Corredor/Gerente', 'Supervisa la gestión integral de la inmobiliaria.'],
  ['Agente', 'Gestiona sus contactos y operaciones asignados.'],
];

const roleNames = [
  'Propietario',
  'Inquilino',
  'Interesado',
  'Garante',
  'Empleado',
  'Proveedor',
];

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta configurar la variable de entorno ${name}.`);
  }
  return value;
}

function loadAdminData() {
  const dni = Number(requiredEnv('ADMIN_DNI'));
  if (!Number.isSafeInteger(dni) || dni < 1 || dni > 2147483647) {
    throw new Error('ADMIN_DNI debe ser un entero positivo válido para MySQL Int.');
  }

  const fechaNac = requiredEnv('ADMIN_FECHA_NAC');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNac)) {
    throw new Error('ADMIN_FECHA_NAC debe tener formato YYYY-MM-DD.');
  }
  const parsedDate = new Date(`${fechaNac}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== fechaNac) {
    throw new Error('ADMIN_FECHA_NAC debe ser una fecha válida.');
  }

  const sexo = requiredEnv('ADMIN_SEXO');
  if (!['F', 'M', 'X'].includes(sexo)) {
    throw new Error('ADMIN_SEXO debe ser F, M o X.');
  }

  const contrasena = requiredEnv('ADMIN_CONTRASENA');
  if (contrasena.length < 8) {
    throw new Error('ADMIN_CONTRASENA debe tener al menos 8 caracteres.');
  }

  const mail = requiredEnv('ADMIN_MAIL').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    throw new Error('ADMIN_MAIL debe ser un correo electrónico válido.');
  }

  return {
    nombreUsuario: requiredEnv('ADMIN_NOMBRE_USUARIO'),
    mail,
    contrasena,
    apellido: requiredEnv('ADMIN_APELLIDO'),
    nombres: requiredEnv('ADMIN_NOMBRES'),
    dni,
    fechaNac: parsedDate,
    sexo,
  };
}

async function seed() {
  const adminData = loadAdminData();

  await prisma.$transaction(async (tx) => {
    const perfilByName = new Map();
    for (const [nombre, descripcion] of profiles) {
      const perfil = await tx.perfil.upsert({
        where: { nombre },
        create: { nombre, descripcion },
        update: { descripcion },
      });
      perfilByName.set(nombre, perfil);
    }

    const roleByName = new Map();
    for (const descripcionRol of roleNames) {
      const rol = await tx.rol.upsert({
        where: { descripcionRol },
        create: { descripcionRol },
        update: {},
      });
      roleByName.set(descripcionRol, rol);
    }

    await seedCatalogs(tx, perfilByName);

    const [userByName, userByMail, personByDni] = await Promise.all([
      tx.usuario.findUnique({
        where: { nombreUsuario: adminData.nombreUsuario },
        include: { personaFisica: true },
      }),
      tx.usuario.findUnique({
        where: { mail: adminData.mail },
        include: { personaFisica: true },
      }),
      tx.personaFisica.findUnique({
        where: { dni: adminData.dni },
      }),
    ]);

    if (userByName && userByMail && userByName.id !== userByMail.id) {
      throw new Error('ADMIN_NOMBRE_USUARIO y ADMIN_MAIL pertenecen a usuarios distintos.');
    }

    const existingUser = userByName || userByMail;
    if (
      existingUser &&
      (existingUser.nombreUsuario !== adminData.nombreUsuario ||
        existingUser.mail.toLowerCase() !== adminData.mail ||
        existingUser.personaFisica.dni !== adminData.dni)
    ) {
      throw new Error(
        'Los datos ADMIN_* coinciden parcialmente con otro usuario. Revisá nombre de usuario, mail y DNI.'
      );
    }

    if (existingUser && personByDni && existingUser.idPersonaFisica !== personByDni.id) {
      throw new Error('ADMIN_DNI ya pertenece a otra persona física.');
    }

    const hashedPassword = await bcrypt.hash(adminData.contrasena, 10);
    const personaFisica = await tx.personaFisica.upsert({
      where: { dni: adminData.dni },
      create: {
        apellido: adminData.apellido,
        nombres: adminData.nombres,
        dni: adminData.dni,
        fechaNac: adminData.fechaNac,
        sexo: adminData.sexo,
        contacto: {
          create: {
            tipoPersona: 'FISICA',
            activo: true,
          },
        },
      },
      update: {
        apellido: adminData.apellido,
        nombres: adminData.nombres,
        fechaNac: adminData.fechaNac,
        sexo: adminData.sexo,
      },
    });

    const contacto = await tx.contacto.findUnique({
      where: { id: personaFisica.id },
      select: { tipoPersona: true },
    });
    if (!contacto || contacto.tipoPersona !== 'FISICA') {
      throw new Error('El DNI del administrador no está asociado a un contacto físico.');
    }

    const usuario = await tx.usuario.upsert({
      where: { nombreUsuario: adminData.nombreUsuario },
      create: {
        idPersonaFisica: personaFisica.id,
        nombreUsuario: adminData.nombreUsuario,
        mail: adminData.mail,
        contrasena: hashedPassword,
        estado: 'ACTIVO',
      },
      update: {
        mail: adminData.mail,
        contrasena: hashedPassword,
        estado: 'ACTIVO',
      },
    });

    const adminProfile = perfilByName.get('Administrador');
    await tx.perfilUsuario.upsert({
      where: {
        idUsuario_idPerfil: {
          idUsuario: usuario.id,
          idPerfil: adminProfile.id,
        },
      },
      create: {
        idUsuario: usuario.id,
        idPerfil: adminProfile.id,
      },
      update: {},
    });

    const empleadoRole = roleByName.get('Empleado');
    await tx.contactoRol.upsert({
      where: {
        idContacto_idRol: {
          idContacto: personaFisica.id,
          idRol: empleadoRole.id,
        },
      },
      create: {
        idContacto: personaFisica.id,
        idRol: empleadoRole.id,
      },
      update: {},
    });
  });

  console.log('Seed completado: perfiles, roles, catálogos, permisos y usuario Administrador verificados.');
}

seed()
  .catch((error) => {
    console.error('Error al ejecutar el seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
