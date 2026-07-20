-- AlterTable
ALTER TABLE `asignaciones_entrega` ADD COLUMN `abono_deuda` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `monto_efectivo` DECIMAL(12, 2) NULL,
    ADD COLUMN `monto_transferencia` DECIMAL(12, 2) NULL,
    MODIFY `metodo_pago` ENUM('Efectivo', 'Transferencia', 'Mixto', 'Parcial', 'Credito') NULL;
