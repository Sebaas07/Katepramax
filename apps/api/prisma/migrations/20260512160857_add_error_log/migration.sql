-- CreateTable
CREATE TABLE `error_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mensaje` TEXT NOT NULL,
    `stack` TEXT NULL,
    `metodo` VARCHAR(10) NULL,
    `url` VARCHAR(255) NULL,
    `usuario_id` INTEGER NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
