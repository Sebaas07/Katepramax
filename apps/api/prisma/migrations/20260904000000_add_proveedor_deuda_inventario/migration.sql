-- AlterTable
ALTER TABLE `inventarios` ADD COLUMN `proveedor_id` INTEGER NULL,
ADD COLUMN `deuda` DECIMAL(15, 2) NULL;

-- CreateIndex
CREATE INDEX `inventarios_proveedor_id_fkey` ON `inventarios`(`proveedor_id`);

-- AddForeignKey
ALTER TABLE `inventarios` ADD CONSTRAINT `inventarios_proveedor_id_fkey` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;