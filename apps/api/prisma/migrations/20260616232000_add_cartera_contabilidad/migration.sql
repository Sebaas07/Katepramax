-- CreateTable
CREATE TABLE `cartera` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha` DATE NOT NULL,
    `semana` INTEGER NOT NULL,
    `saldo_dia` DECIMAL(15, 2) NOT NULL,
    `saldo_anterior` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `variacion` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sede_id` INTEGER NOT NULL,

    UNIQUE INDEX `cartera_sede_id_fecha_key`(`sede_id`, `fecha`),
    INDEX `cartera_semana_idx`(`semana`),
    INDEX `cartera_fecha_idx`(`fecha`),
    INDEX `cartera_sede_id_idx`(`sede_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cartera` ADD CONSTRAINT `cartera_sede_id_fkey` FOREIGN KEY (`sede_id`) REFERENCES `sedes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
