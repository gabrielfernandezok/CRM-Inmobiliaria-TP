require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { seedCatalogs } = require('./seedCatalogs');

const prisma = new PrismaClient();
const requiredProfileNames = ['Administrador', 'Corredor/Gerente', 'Agente'];

async function seedExistingDatabase() {
  await prisma.$transaction(async (tx) => {
    const profiles = await tx.perfil.findMany({
      where: { nombre: { in: requiredProfileNames } },
      select: { id: true, nombre: true },
    });
    const profileByName = new Map(profiles.map((profile) => [profile.nombre, profile]));
    const missingProfiles = requiredProfileNames.filter((name) => !profileByName.has(name));
    if (missingProfiles.length) {
      throw new Error(
        `Faltan perfiles para cargar catálogos: ${missingProfiles.join(', ')}. Ejecutá primero npx prisma db seed.`
      );
    }

    await seedCatalogs(tx, profileByName);
  });
}

seedExistingDatabase()
  .then(() => {
    console.log('Catálogos, programas y permisos iniciales cargados sin modificar usuarios.');
  })
  .catch((error) => {
    console.error('Error al cargar catálogos:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
