-- CreateTable
CREATE TABLE `envios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sede_origen_id` INTEGER NOT NULL,
    `sede_destino_id` INTEGER NOT NULL,
    `creado_por` INTEGER NOT NULL,
    `confirmado_por` INTEGER NULL,
    `estado` ENUM('Pendiente', 'Confirmado', 'ConNovedad') NOT NULL DEFAULT 'Pendiente',
    `observaciones` TEXT NULL,
    `observacion_recepcion` TEXT NULL,
    `fecha_envio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_confirmacion` DATETIME(3) NULL,

    INDEX `envios_sede_destino_id_estado_idx`(`sede_destino_id`, `estado`),
    INDEX `envios_sede_origen_id_idx`(`sede_origen_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `envio_detalles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `envio_id` INTEGER NOT NULL,
    `producto_id` INTEGER NOT NULL,
    `cantidad_enviada` INTEGER NOT NULL,
    `cantidad_recibida` INTEGER NULL,
    `observacion` VARCHAR(500) NULL,

    INDEX `envio_detalles_envio_id_idx`(`envio_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `envios` ADD CONSTRAINT `envios_sede_origen_id_fkey` FOREIGN KEY (`sede_origen_id`) REFERENCES `sedes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `envios` ADD CONSTRAINT `envios_sede_destino_id_fkey` FOREIGN KEY (`sede_destino_id`) REFERENCES `sedes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `envios` ADD CONSTRAINT `envios_creado_por_fkey` FOREIGN KEY (`creado_por`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `envios` ADD CONSTRAINT `envios_confirmado_por_fkey` FOREIGN KEY (`confirmado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `envio_detalles` ADD CONSTRAINT `envio_detalles_envio_id_fkey` FOREIGN KEY (`envio_id`) REFERENCES `envios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `envio_detalles` ADD CONSTRAINT `envio_detalles_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`codigo`) ON DELETE RESTRICT ON UPDATE CASCADE;
