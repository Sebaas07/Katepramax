-- AlterTable
ALTER TABLE `sedes` ADD COLUMN `bodega_id` INTEGER NULL,
    ADD COLUMN `tipo` ENUM('Bodega', 'Oficina') NOT NULL DEFAULT 'Bodega';

-- AddForeignKey
ALTER TABLE `sedes` ADD CONSTRAINT `sedes_bodega_id_fkey` FOREIGN KEY (`bodega_id`) REFERENCES `sedes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
