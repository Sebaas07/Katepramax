-- CreateTable
CREATE TABLE `sesiones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `refresh_hash` VARCHAR(255) NOT NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `ip` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expira_en` DATETIME(3) NOT NULL,
    `usuario_id` INTEGER NOT NULL,

    INDEX `sesiones_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sesiones` ADD CONSTRAINT `sesiones_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
