-- CreateTable
CREATE TABLE `egresos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha` DATE NOT NULL,
    `semana` INTEGER NOT NULL,
    `concepto` VARCHAR(200) NOT NULL,
    `total` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `observacion` VARCHAR(500) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sede_id` INTEGER NOT NULL,

    INDEX `egresos_fecha_semana_idx`(`fecha`, `semana`),
    INDEX `egresos_sede_id_idx`(`sede_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `abonos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha` DATE NOT NULL,
    `semana` INTEGER NOT NULL,
    `valor_pagado` DECIMAL(15, 2) NOT NULL,
    `observacion` VARCHAR(500) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `proveedor_id` INTEGER NOT NULL,
    `sede_id` INTEGER NOT NULL,

    INDEX `abonos_fecha_semana_idx`(`fecha`, `semana`),
    INDEX `abonos_proveedor_id_idx`(`proveedor_id`),
    INDEX `abonos_sede_id_idx`(`sede_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `egresos` ADD CONSTRAINT `egresos_sede_id_fkey` FOREIGN KEY (`sede_id`) REFERENCES `sedes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `abonos` ADD CONSTRAINT `abonos_proveedor_id_fkey` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `abonos` ADD CONSTRAINT `abonos_sede_id_fkey` FOREIGN KEY (`sede_id`) REFERENCES `sedes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
