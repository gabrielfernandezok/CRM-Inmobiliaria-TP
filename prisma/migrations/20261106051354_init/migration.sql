-- CreateTable
CREATE TABLE `Contacto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idUsuario` INTEGER NULL,
    `tipoPersona` ENUM('FISICA', 'JURIDICA') NOT NULL,
    `cuitCuil` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `mail` VARCHAR(191) NULL,
    `domicilio` VARCHAR(191) NULL,
    `localidad` VARCHAR(191) NULL,
    `fechaAlta` DATE NOT NULL DEFAULT (CURRENT_DATE),
    `observaciones` TEXT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Contacto_cuitCuil_key`(`cuitCuil`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PersonaFisica` (
    `id` INTEGER NOT NULL,
    `apellido` VARCHAR(191) NOT NULL,
    `nombres` VARCHAR(191) NOT NULL,
    `dni` INTEGER NOT NULL,
    `fechaNac` DATE NOT NULL,
    `sexo` ENUM('F', 'M', 'X') NOT NULL,

    UNIQUE INDEX `PersonaFisica_dni_key`(`dni`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PersonaJuridica` (
    `id` INTEGER NOT NULL,
    `razonSocial` VARCHAR(191) NOT NULL,
    `nombreFantasia` VARCHAR(191) NULL,
    `tipoSocietario` ENUM('SA', 'SRL', 'SAS', 'COOPERATIVA') NOT NULL,
    `fechaConstitucion` DATE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Representante` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idPersonaJuridica` INTEGER NOT NULL,
    `idPersonaFisica` INTEGER NOT NULL,
    `cargo` VARCHAR(191) NOT NULL,
    `fechaDesde` DATE NOT NULL,
    `fechaHasta` DATE NULL,
    `esPrincipal` BOOLEAN NOT NULL,
    `documentacionRespaldo` VARCHAR(191) NULL,

    INDEX `Representante_idPersonaJuridica_idx`(`idPersonaJuridica`),
    INDEX `Representante_idPersonaFisica_idx`(`idPersonaFisica`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Rol` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcionRol` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Rol_descripcionRol_key`(`descripcionRol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactoRol` (
    `idContacto` INTEGER NOT NULL,
    `idRol` INTEGER NOT NULL,

    PRIMARY KEY (`idContacto`, `idRol`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idPersonaFisica` INTEGER NOT NULL,
    `nombreUsuario` VARCHAR(191) NOT NULL,
    `mail` VARCHAR(191) NOT NULL,
    `contrasena` VARCHAR(191) NOT NULL,
    `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL,
    `ultimoAcceso` DATETIME(3) NULL,

    UNIQUE INDEX `Usuario_idPersonaFisica_key`(`idPersonaFisica`),
    UNIQUE INDEX `Usuario_nombreUsuario_key`(`nombreUsuario`),
    UNIQUE INDEX `Usuario_mail_key`(`mail`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Perfil` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Perfil_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PerfilUsuario` (
    `idUsuario` INTEGER NOT NULL,
    `idPerfil` INTEGER NOT NULL,

    PRIMARY KEY (`idUsuario`, `idPerfil`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Menu` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,
    `icono` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Programa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idMenu` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `ruta` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PerfilPrograma` (
    `idPerfil` INTEGER NOT NULL,
    `idPrograma` INTEGER NOT NULL,
    `puedeVer` BOOLEAN NOT NULL DEFAULT false,
    `puedeCrear` BOOLEAN NOT NULL DEFAULT false,
    `puedeEditar` BOOLEAN NOT NULL DEFAULT false,
    `puedeEliminar` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`idPerfil`, `idPrograma`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Canal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcion` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Canal_descripcion_key`(`descripcion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Consulta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idContacto` INTEGER NOT NULL,
    `idPropiedad` INTEGER NULL,
    `idUsuario` INTEGER NOT NULL,
    `idCanal` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `mensaje` TEXT NOT NULL,
    `estado` ENUM('PENDIENTE', 'EN_SEGUIMIENTO', 'CERRADA') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Visita` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idContacto` INTEGER NOT NULL,
    `idPropiedad` INTEGER NOT NULL,
    `idUsuario` INTEGER NOT NULL,
    `fechaHora` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resultado` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Busqueda` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idContacto` INTEGER NOT NULL,
    `tipoOperacion` ENUM('COMPRA', 'ALQUILER') NOT NULL,
    `tipoPropiedad` ENUM('CASA', 'DEPARTAMENTO', 'TERRENO', 'LOCAL', 'OFICINA') NOT NULL,
    `presupuestoMax` DECIMAL(14, 2) NULL,
    `moneda` ENUM('USD', 'ARS') NULL,
    `zona` VARCHAR(191) NULL,
    `ambientes` INTEGER NULL,
    `dormitorios` INTEGER NULL,
    `antiguedadMax` INTEGER NULL,
    `requiereCredito` BOOLEAN NULL DEFAULT false,
    `activa` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Interaccion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idContacto` INTEGER NOT NULL,
    `idUsuario` INTEGER NOT NULL,
    `idOperacion` INTEGER NULL,
    `tipoInteraccion` ENUM('SEGUIMIENTO', 'ENTREVISTA_CAPTACION') NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `medio` ENUM('LLAMADA', 'WHATSAPP', 'MAIL', 'EN_PERSONA') NOT NULL,
    `resultado` VARCHAR(191) NOT NULL,
    `notas` TEXT NULL,
    `proximaAccion` VARCHAR(191) NULL,
    `fechaProxContacto` DATE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Propiedad` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idUsuario` INTEGER NOT NULL,
    `tipoPropiedad` ENUM('CASA', 'DEPARTAMENTO', 'TERRENO', 'LOCAL', 'OFICINA') NOT NULL,
    `direccion` VARCHAR(191) NOT NULL,
    `localidad` VARCHAR(191) NULL,
    `esPH` BOOLEAN NOT NULL DEFAULT false,
    `ambientes` INTEGER NULL,
    `dormitorios` INTEGER NULL,
    `antiguedadAnios` INTEGER NULL,
    `superficie` DECIMAL(10, 2) NULL,
    `aptoCredito` ENUM('NO_ESPECIFICADO', 'APTO_CREDITO', 'NO_APTO_CREDITO') NOT NULL DEFAULT 'NO_ESPECIFICADO',
    `latitud` DECIMAL(9, 6) NULL,
    `longitud` DECIMAL(9, 6) NULL,
    `descripcion` TEXT NULL,
    `llaveEntregada` BOOLEAN NOT NULL DEFAULT false,
    `estado` ENUM('DISPONIBLE', 'RESERVADA', 'VENDIDA', 'ALQUILADA', 'RETIRADA') NOT NULL,
    `fechaAlta` DATE NOT NULL DEFAULT (CURRENT_DATE),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropPropietario` (
    `idPropiedad` INTEGER NOT NULL,
    `idContacto` INTEGER NOT NULL,
    `porcentaje` DECIMAL(5, 2) NOT NULL,

    PRIMARY KEY (`idPropiedad`, `idContacto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Documentacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idPropiedad` INTEGER NOT NULL,
    `tipoDocumento` ENUM('ESCRITURA', 'PLANO', 'REGLAMENTO_PH', 'COPIA_LLAVE', 'CERTIFICADO_DOMINIO') NOT NULL,
    `entregado` BOOLEAN NOT NULL DEFAULT false,
    `fechaEntrega` DATE NULL,
    `observaciones` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Caracteristica` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcion` VARCHAR(191) NOT NULL,
    `categoria` VARCHAR(191) NULL,

    UNIQUE INDEX `Caracteristica_descripcion_key`(`descripcion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EtapaOperacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcion` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,
    `tipoOperacion` ENUM('VENTA', 'ALQUILER', 'AMBAS') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MotivoBaja` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcion` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `MotivoBaja_descripcion_key`(`descripcion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Operacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idPropiedad` INTEGER NOT NULL,
    `idUsuario` INTEGER NOT NULL,
    `idEtapa` INTEGER NOT NULL,
    `idMotivoBaja` INTEGER NULL,
    `idCliente` INTEGER NULL,
    `tipoOperacion` ENUM('VENTA', 'ALQUILER') NOT NULL,
    `precioUSD` DECIMAL(14, 2) NULL,
    `precioARS` DECIMAL(14, 2) NULL,
    `montoCierre` DECIMAL(14, 2) NULL,
    `monedaCierre` ENUM('USD', 'ARS') NULL,
    `honorarios` DECIMAL(14, 2) NULL,
    `valorSugerido` DECIMAL(14, 2) NULL,
    `esExclusiva` BOOLEAN NULL,
    `fechaFirmaAutorizacion` DATE NULL,
    `fechaVencAutorizacion` DATE NULL,
    `fechaAlta` DATE NOT NULL DEFAULT (CURRENT_DATE),
    `fechaCierre` DATE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Oferta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idOperacion` INTEGER NOT NULL,
    `idContacto` INTEGER NOT NULL,
    `monto` DECIMAL(14, 2) NOT NULL,
    `moneda` ENUM('USD', 'ARS') NOT NULL,
    `fecha` DATE NOT NULL,
    `estado` ENUM('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CONTRAOFERTA') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContratoAlquiler` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idOperacion` INTEGER NOT NULL,
    `nroRenovacion` INTEGER NOT NULL,
    `fechaFirma` DATE NOT NULL,
    `fechaInicio` DATE NOT NULL,
    `fechaVencimiento` DATE NOT NULL,
    `montoAlquiler` DECIMAL(14, 2) NOT NULL,
    `moneda` ENUM('USD', 'ARS') NOT NULL,
    `frecuenciaAjuste` ENUM('TRIMESTRAL', 'SEMESTRAL', 'ANUAL') NOT NULL,
    `indiceAjuste` ENUM('IPC', 'ICL', 'PORCENTAJE_FIJO', 'MONTO_FIJO') NOT NULL,
    `depositoGarantia` DECIMAL(14, 2) NOT NULL,
    `diasAviso` INTEGER NOT NULL,
    `estado` ENUM('VIGENTE', 'POR_VENCER', 'VENCIDO', 'RENOVADO', 'RESCINDIDO') NOT NULL,
    `fechaRescision` DATE NULL,

    UNIQUE INDEX `ContratoAlquiler_idOperacion_nroRenovacion_key`(`idOperacion`, `nroRenovacion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ContratoAlquilerGarante` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_ContratoAlquilerGarante_AB_unique`(`A`, `B`),
    INDEX `_ContratoAlquilerGarante_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_BusquedaToCaracteristica` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_BusquedaToCaracteristica_AB_unique`(`A`, `B`),
    INDEX `_BusquedaToCaracteristica_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CaracteristicaToPropiedad` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_CaracteristicaToPropiedad_AB_unique`(`A`, `B`),
    INDEX `_CaracteristicaToPropiedad_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Contacto` ADD CONSTRAINT `Contacto_idUsuario_fkey` FOREIGN KEY (`idUsuario`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PersonaFisica` ADD CONSTRAINT `PersonaFisica_id_fkey` FOREIGN KEY (`id`) REFERENCES `Contacto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PersonaJuridica` ADD CONSTRAINT `PersonaJuridica_id_fkey` FOREIGN KEY (`id`) REFERENCES `Contacto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Representante` ADD CONSTRAINT `Representante_idPersonaJuridica_fkey` FOREIGN KEY (`idPersonaJuridica`) REFERENCES `PersonaJuridica`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Representante` ADD CONSTRAINT `Representante_idPersonaFisica_fkey` FOREIGN KEY (`idPersonaFisica`) REFERENCES `PersonaFisica`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactoRol` ADD CONSTRAINT `ContactoRol_idContacto_fkey` FOREIGN KEY (`idContacto`) REFERENCES `Contacto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactoRol` ADD CONSTRAINT `ContactoRol_idRol_fkey` FOREIGN KEY (`idRol`) REFERENCES `Rol`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_idPersonaFisica_fkey` FOREIGN KEY (`idPersonaFisica`) REFERENCES `PersonaFisica`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PerfilUsuario` ADD CONSTRAINT `PerfilUsuario_idUsuario_fkey` FOREIGN KEY (`idUsuario`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PerfilUsuario` ADD CONSTRAINT `PerfilUsuario_idPerfil_fkey` FOREIGN KEY (`idPerfil`) REFERENCES `Perfil`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Programa` ADD CONSTRAINT `Programa_idMenu_fkey` FOREIGN KEY (`idMenu`) REFERENCES `Menu`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PerfilPrograma` ADD CONSTRAINT `PerfilPrograma_idPerfil_fkey` FOREIGN KEY (`idPerfil`) REFERENCES `Perfil`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PerfilPrograma` ADD CONSTRAINT `PerfilPrograma_idPrograma_fkey` FOREIGN KEY (`idPrograma`) REFERENCES `Programa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Consulta` ADD CONSTRAINT `Consulta_idContacto_fkey` FOREIGN KEY (`idContacto`) REFERENCES `Contacto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Consulta` ADD CONSTRAINT `Consulta_idPropiedad_fkey` FOREIGN KEY (`idPropiedad`) REFERENCES `Propiedad`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Consulta` ADD CONSTRAINT `Consulta_idUsuario_fkey` FOREIGN KEY (`idUsuario`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Consulta` ADD CONSTRAINT `Consulta_idCanal_fkey` FOREIGN KEY (`idCanal`) REFERENCES `Canal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Visita` ADD CONSTRAINT `Visita_idContacto_fkey` FOREIGN KEY (`idContacto`) REFERENCES `Contacto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Visita` ADD CONSTRAINT `Visita_idPropiedad_fkey` FOREIGN KEY (`idPropiedad`) REFERENCES `Propiedad`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Visita` ADD CONSTRAINT `Visita_idUsuario_fkey` FOREIGN KEY (`idUsuario`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Busqueda` ADD CONSTRAINT `Busqueda_idContacto_fkey` FOREIGN KEY (`idContacto`) REFERENCES `Contacto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interaccion` ADD CONSTRAINT `Interaccion_idContacto_fkey` FOREIGN KEY (`idContacto`) REFERENCES `Contacto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interaccion` ADD CONSTRAINT `Interaccion_idUsuario_fkey` FOREIGN KEY (`idUsuario`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interaccion` ADD CONSTRAINT `Interaccion_idOperacion_fkey` FOREIGN KEY (`idOperacion`) REFERENCES `Operacion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Propiedad` ADD CONSTRAINT `Propiedad_idUsuario_fkey` FOREIGN KEY (`idUsuario`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropPropietario` ADD CONSTRAINT `PropPropietario_idPropiedad_fkey` FOREIGN KEY (`idPropiedad`) REFERENCES `Propiedad`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropPropietario` ADD CONSTRAINT `PropPropietario_idContacto_fkey` FOREIGN KEY (`idContacto`) REFERENCES `Contacto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Documentacion` ADD CONSTRAINT `Documentacion_idPropiedad_fkey` FOREIGN KEY (`idPropiedad`) REFERENCES `Propiedad`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Operacion` ADD CONSTRAINT `Operacion_idPropiedad_fkey` FOREIGN KEY (`idPropiedad`) REFERENCES `Propiedad`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Operacion` ADD CONSTRAINT `Operacion_idUsuario_fkey` FOREIGN KEY (`idUsuario`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Operacion` ADD CONSTRAINT `Operacion_idEtapa_fkey` FOREIGN KEY (`idEtapa`) REFERENCES `EtapaOperacion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Operacion` ADD CONSTRAINT `Operacion_idMotivoBaja_fkey` FOREIGN KEY (`idMotivoBaja`) REFERENCES `MotivoBaja`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Operacion` ADD CONSTRAINT `Operacion_idCliente_fkey` FOREIGN KEY (`idCliente`) REFERENCES `Contacto`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Oferta` ADD CONSTRAINT `Oferta_idOperacion_fkey` FOREIGN KEY (`idOperacion`) REFERENCES `Operacion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Oferta` ADD CONSTRAINT `Oferta_idContacto_fkey` FOREIGN KEY (`idContacto`) REFERENCES `Contacto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContratoAlquiler` ADD CONSTRAINT `ContratoAlquiler_idOperacion_fkey` FOREIGN KEY (`idOperacion`) REFERENCES `Operacion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ContratoAlquilerGarante` ADD CONSTRAINT `_ContratoAlquilerGarante_A_fkey` FOREIGN KEY (`A`) REFERENCES `Contacto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ContratoAlquilerGarante` ADD CONSTRAINT `_ContratoAlquilerGarante_B_fkey` FOREIGN KEY (`B`) REFERENCES `ContratoAlquiler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_BusquedaToCaracteristica` ADD CONSTRAINT `_BusquedaToCaracteristica_A_fkey` FOREIGN KEY (`A`) REFERENCES `Busqueda`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_BusquedaToCaracteristica` ADD CONSTRAINT `_BusquedaToCaracteristica_B_fkey` FOREIGN KEY (`B`) REFERENCES `Caracteristica`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CaracteristicaToPropiedad` ADD CONSTRAINT `_CaracteristicaToPropiedad_A_fkey` FOREIGN KEY (`A`) REFERENCES `Caracteristica`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CaracteristicaToPropiedad` ADD CONSTRAINT `_CaracteristicaToPropiedad_B_fkey` FOREIGN KEY (`B`) REFERENCES `Propiedad`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
