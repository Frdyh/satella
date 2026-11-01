-- Normaliza los teléfonos de clientes existentes al formato de WhatsApp
-- (misma regla que src/utils/phone.js): solo dígitos y, si es un celular
-- colombiano de 10 dígitos, con indicativo 57. "311-444-1001" → "573114441001".
-- Debe ir ANTES del índice único y del cambio a VARCHAR(20).
-- Si dos clientes quedan con el mismo número, el índice único fallará:
-- en ese caso hay que corregir los duplicados a mano y volver a correr la migración.
UPDATE `Cliente` SET `telefono` = REGEXP_REPLACE(`telefono`, '[^0-9]', '') WHERE `telefono` IS NOT NULL;
UPDATE `Cliente` SET `telefono` = NULL WHERE `telefono` = '';
UPDATE `Cliente` SET `telefono` = CONCAT('57', `telefono`) WHERE `telefono` REGEXP '^3[0-9]{9}$';

-- AlterTable
ALTER TABLE `Cliente` MODIFY `telefono` VARCHAR(20) NULL;

-- AlterTable
ALTER TABLE `Envio` ADD COLUMN `repartidorId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Usuario` ADD COLUMN `telefono` VARCHAR(20) NULL;

-- CreateTable
CREATE TABLE `SesionChat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `telefono` VARCHAR(20) NOT NULL,
    `flujo` VARCHAR(30) NOT NULL,
    `paso` VARCHAR(50) NOT NULL,
    `contexto` JSON NOT NULL,
    `verificadoHasta` DATETIME(3) NULL,
    `intentosFallidos` INTEGER NOT NULL DEFAULT 0,
    `bloqueadoHasta` DATETIME(3) NULL,
    `ventanaHasta` DATETIME(3) NULL,
    `actualizadaEn` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SesionChat_telefono_key`(`telefono`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PinTemporal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuarioId` INTEGER NOT NULL,
    `hash` VARCHAR(255) NOT NULL,
    `expiraEn` DATETIME(3) NOT NULL,
    `usadoEn` DATETIME(3) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PinTemporal_usuarioId_idx`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConsentimientoDatos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `telefono` VARCHAR(20) NOT NULL,
    `clienteId` INTEGER NULL,
    `textoVersion` VARCHAR(20) NOT NULL,
    `aceptadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `wamid` VARCHAR(255) NULL,

    INDEX `ConsentimientoDatos_telefono_idx`(`telefono`),
    INDEX `ConsentimientoDatos_clienteId_idx`(`clienteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReporteProblema` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `envioId` INTEGER NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `tipo` VARCHAR(40) NOT NULL,
    `detalle` VARCHAR(500) NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'abierto',
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atendidoPorId` INTEGER NULL,

    INDEX `ReporteProblema_envioId_idx`(`envioId`),
    INDEX `ReporteProblema_usuarioId_idx`(`usuarioId`),
    INDEX `ReporteProblema_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MensajeProcesado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `wamid` VARCHAR(255) NOT NULL,
    `procesadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MensajeProcesado_wamid_key`(`wamid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Cliente_telefono_key` ON `Cliente`(`telefono`);

-- CreateIndex
CREATE INDEX `Envio_repartidorId_idx` ON `Envio`(`repartidorId`);

-- CreateIndex
CREATE UNIQUE INDEX `Usuario_telefono_key` ON `Usuario`(`telefono`);

-- AddForeignKey
ALTER TABLE `Envio` ADD CONSTRAINT `Envio_repartidorId_fkey` FOREIGN KEY (`repartidorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PinTemporal` ADD CONSTRAINT `PinTemporal_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConsentimientoDatos` ADD CONSTRAINT `ConsentimientoDatos_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReporteProblema` ADD CONSTRAINT `ReporteProblema_envioId_fkey` FOREIGN KEY (`envioId`) REFERENCES `Envio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReporteProblema` ADD CONSTRAINT `ReporteProblema_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReporteProblema` ADD CONSTRAINT `ReporteProblema_atendidoPorId_fkey` FOREIGN KEY (`atendidoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

