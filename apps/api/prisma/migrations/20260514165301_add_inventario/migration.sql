-- CreateTable
CREATE TABLE `inventario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha` DATE NOT NULL,
    `semana` INTEGER NOT NULL,
    `sede_id` INTEGER NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `costo` DECIMAL(15, 2) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inventario_fecha_semana_idx`(`fecha`, `semana`),
    INDEX `inventario_sede_id_idx`(`sede_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ingresos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha` DATETIME(3) NOT NULL,
    `semana` INTEGER NOT NULL,
    `sedeId` INTEGER NOT NULL,
    `efectivo` DECIMAL(15, 2) NOT NULL,
    `cuentas` DECIMAL(15, 2) NOT NULL,
    `total` DECIMAL(15, 2) NOT NULL,
    `observacion` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ingresos_fecha_semana_idx`(`fecha`, `semana`),
    INDEX `ingresos_sedeId_idx`(`sedeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `inventario` ADD CONSTRAINT `inventario_sede_id_fkey` FOREIGN KEY (`sede_id`) REFERENCES `sedes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingresos` ADD CONSTRAINT `ingresos_sedeId_fkey` FOREIGN KEY (`sedeId`) REFERENCES `sedes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
