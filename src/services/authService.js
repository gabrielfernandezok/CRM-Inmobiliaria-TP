const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

function sanitizeUser(usuario) {
  const { contrasena, ...safeUser } = usuario;
  return safeUser;
}

async function registerUser(data) {
  const nombreUsuario = data.nombreUsuario.trim();
  const mail = data.mail.trim().toLowerCase();
  const dni = Number(data.dni);

  const existingUser = await prisma.usuario.findFirst({
    where: {
      OR: [{ nombreUsuario }, { mail }],
    },
  });

  if (existingUser) {
    const error = new Error('El contacto ya está registrado');
    error.statusCode = 409;
    throw error;
  }

  const existingPersona = await prisma.personaFisica.findUnique({
    where: { dni },
  });

  if (existingPersona) {
    const error = new Error('El contacto ya está registrado');
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(data.contrasena, 10);

  return prisma.$transaction(async (tx) => {
    let perfilAgente = await tx.perfil.findUnique({
      where: { nombre: 'Agente' },
    });

    if (!perfilAgente) {
      perfilAgente = await tx.perfil.create({
        data: {
          nombre: 'Agente',
          descripcion: 'Perfil base de agente',
        },
      });
    }

    const rolEmpleado = await tx.rol.upsert({
      where: { descripcionRol: 'Empleado' },
      create: { descripcionRol: 'Empleado' },
      update: {},
    });

    const contacto = await tx.contacto.create({
      data: {
        tipoPersona: 'FISICA',
        activo: true,
      },
    });

    await tx.contactoRol.create({
      data: {
        idContacto: contacto.id,
        idRol: rolEmpleado.id,
      },
    });

    const personaFisica = await tx.personaFisica.create({
      data: {
        id: contacto.id,
        apellido: data.apellido.trim(),
        nombres: data.nombres.trim(),
        dni,
        fechaNac: new Date(data.fechaNac),
        sexo: data.sexo,
      },
    });

    const usuario = await tx.usuario.create({
      data: {
        idPersonaFisica: personaFisica.id,
        nombreUsuario,
        mail,
        contrasena: hashedPassword,
        estado: 'ACTIVO',
      },
    });

    await tx.perfilUsuario.create({
      data: {
        idUsuario: usuario.id,
        idPerfil: perfilAgente.id,
      },
    });

    const usuarioConPerfiles = await tx.usuario.findUnique({
      where: { id: usuario.id },
      include: {
        perfiles: {
          include: {
            perfil: true,
          },
        },
      },
    });

    return sanitizeUser({
      ...usuarioConPerfiles,
      perfiles: usuarioConPerfiles.perfiles.map((perfilUsuario) => perfilUsuario.perfil.nombre),
    });
  });
}

async function loginUser({ nombreUsuario, mail, contrasena }) {
  const credential = (nombreUsuario || mail || '').trim();
  const user = await prisma.usuario.findFirst({
    where: {
      OR: [{ nombreUsuario: credential }, { mail: credential.toLowerCase() }],
    },
    include: {
      perfiles: {
        include: {
          perfil: true,
        },
      },
    },
  });

  if (!user) {
    const error = new Error('Credenciales inválidas');
    error.statusCode = 401;
    throw error;
  }

  const isValidPassword = await bcrypt.compare(contrasena, user.contrasena);

  if (!isValidPassword) {
    const error = new Error('Credenciales inválidas');
    error.statusCode = 401;
    throw error;
  }

  if (user.estado !== 'ACTIVO') {
    const error = new Error('Usuario inactivo');
    error.statusCode = 403;
    throw error;
  }

  const perfiles = user.perfiles.map((perfilUsuario) => perfilUsuario.perfil.nombre);
  const token = jwt.sign(
    {
      sub: user.id,
      perfiles,
    },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '8h' }
  );

  const updatedUser = await prisma.usuario.update({
    where: { id: user.id },
    data: { ultimoAcceso: new Date() },
    include: {
      perfiles: {
        include: {
          perfil: true,
        },
      },
    },
  });

  return {
    token,
    user: sanitizeUser({
      ...updatedUser,
      perfiles: updatedUser.perfiles.map((perfilUsuario) => perfilUsuario.perfil.nombre),
    }),
  };
}

module.exports = { registerUser, loginUser };
