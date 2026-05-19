/*
  Warnings:

  - You are about to drop the column `createdAt` on the `ingresos` table. All the data in the column will be lost.
  - You are about to drop the `inventario` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `inventario` DROP FOREIGN KEY `inventario_sede_id_fkey`;

-- AlterTable
ALTER TABLE `ingresos` DROP COLUMN `createdAt`,
    ADD COLUMN `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- DropTable
DROP TABLE `inventario`;

-- CreateTable
CREATE TABLE `inventarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha` DATETIME(3) NOT NULL,
    `semana` INTEGER NOT NULL,
    `cantidad_ingresada` INTEGER NOT NULL DEFAULT 0,
    `costo` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sede_id` INTEGER NOT NULL,
    `producto_id` VARCHAR(191) NOT NULL,

    INDEX `inventarios_semana_idx`(`semana`),
    INDEX `inventarios_fecha_idx`(`fecha`),
    UNIQUE INDEX `inventarios_sede_id_producto_id_fecha_key`(`sede_id`, `producto_id`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productos` (
    `codigo` VARCHAR(30) NOT NULL,
    `descripcion` VARCHAR(255) NOT NULL,
    `precio_costo` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `precio_venta` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `precio_mayoreo` DECIMAL(12, 2) NULL,
    `porcentaje_ganancia` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,
    `proveedor_id` INTEGER NULL,

    PRIMARY KEY (`codigo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_sedes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sede_id` INTEGER NOT NULL,
    `producto_id` VARCHAR(191) NOT NULL,
    `stock_actual` INTEGER NOT NULL DEFAULT 0,
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stock_sedes_sede_id_producto_id_key`(`sede_id`, `producto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proveedores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedidos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cliente_id` INTEGER NOT NULL,
    `estado` ENUM('Pendiente', 'Asignado', 'Entregado', 'Cancelado') NOT NULL DEFAULT 'Pendiente',
    `observaciones` TEXT NULL,
    `total_recibido` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,
    `creado_por` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedido_detalles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pedido_id` INTEGER NOT NULL,
    `producto_id` VARCHAR(191) NOT NULL,
    `producto_nombre` VARCHAR(255) NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `precio_unitario` DECIMAL(12, 2) NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asignaciones_entrega` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pedido_id` INTEGER NOT NULL,
    `entregador_id` INTEGER NOT NULL,
    `asignado_por` INTEGER NOT NULL,
    `asignado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmado_en` DATETIME(3) NULL,
    `monto_cobrado` DECIMAL(12, 2) NULL,
    `metodo_pago` ENUM('Efectivo', 'Transferencia') NULL,
    `observaciones_entrega` TEXT NULL,
    `estado` ENUM('Pendiente', 'EnRuta', 'Entregado', 'Fallido') NOT NULL DEFAULT 'Pendiente',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clientes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `limite_credito` DECIMAL(12, 2) NOT NULL DEFAULT 10000000.00,
    `saldo_deuda` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `telefono` VARCHAR(20) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    INDEX `clientes_nombre_idx`(`nombre`),
    INDEX `clientes_telefono_idx`(`telefono`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `inventarios` ADD CONSTRAINT `inventarios_sede_id_fkey` FOREIGN KEY (`sede_id`) REFERENCES `sedes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventarios` ADD CONSTRAINT `inventarios_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`codigo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `productos_proveedor_id_fkey` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_sedes` ADD CONSTRAINT `stock_sedes_sede_id_fkey` FOREIGN KEY (`sede_id`) REFERENCES `sedes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_sedes` ADD CONSTRAINT `stock_sedes_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`codigo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_creado_por_fkey` FOREIGN KEY (`creado_por`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedido_detalles` ADD CONSTRAINT `pedido_detalles_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedido_detalles` ADD CONSTRAINT `pedido_detalles_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`codigo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignaciones_entrega` ADD CONSTRAINT `asignaciones_entrega_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignaciones_entrega` ADD CONSTRAINT `asignaciones_entrega_entregador_id_fkey` FOREIGN KEY (`entregador_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignaciones_entrega` ADD CONSTRAINT `asignaciones_entrega_asignado_por_fkey` FOREIGN KEY (`asignado_por`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
