-- DropForeignKey
ALTER TABLE `inventarios` DROP FOREIGN KEY `inventarios_sede_id_fkey`;

-- DropIndex
DROP INDEX `inventarios_sede_id_producto_id_fecha_key` ON `inventarios`;

-- CreateIndex
CREATE INDEX `inventarios_sede_id_producto_id_fecha_idx` ON `inventarios`(`sede_id`, `producto_id`, `fecha`);

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
