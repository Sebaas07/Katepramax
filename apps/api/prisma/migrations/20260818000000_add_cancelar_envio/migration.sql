-- AlterTable: agregar soporte de cancelacion de envios entre sedes

-- Nuevo valor del enum de estado
ALTER TABLE `envios` MODIFY `estado` ENUM('Pendiente', 'Confirmado', 'ConNovedad', 'Cancelado') NOT NULL DEFAULT 'Pendiente';

-- Quien canceló y cuándo (auditoría)
ALTER TABLE `envios` ADD COLUMN `cancelado_por` INTEGER NULL;
ALTER TABLE `envios` ADD COLUMN `fecha_cancelacion` DATETIME(3) NULL;

-- AddForeignKey
ALTER TABLE `envios` ADD CONSTRAINT `envios_cancelado_por_fkey` FOREIGN KEY (`cancelado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;