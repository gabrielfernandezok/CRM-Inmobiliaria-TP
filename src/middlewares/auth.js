const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

function hasAnyProfile(perfiles, allowedProfiles) {
  const set = new Set((perfiles || []).map((perfil) => perfil.toLowerCase()));
  return allowedProfiles.some((perfil) => set.has(perfil.toLowerCase()));
}

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : null;

    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');

    const user = await prisma.usuario.findUnique({
      where: { id: Number(payload.sub) },
      include: {
        perfiles: {
          include: {
            perfil: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Usuario no válido' });
    }

    req.user = {
      id: user.id,
      perfiles: user.perfiles.map((perfilUsuario) => perfilUsuario.perfil.nombre),
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

function requireProfiles(...allowedProfiles) {
  return (req, res, next) => {
    const perfiles = req.user?.perfiles || [];

    if (hasAnyProfile(perfiles, allowedProfiles)) {
      return next();
    }

    return res.status(403).json({ message: 'No tiene permisos para esta acción' });
  };
}

module.exports = { requireAuth, requireProfiles, hasAnyProfile };
