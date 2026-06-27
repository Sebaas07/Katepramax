-- CreateTable
CREATE TABLE `sedes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accion` VARCHAR(100) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuario_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_completo` VARCHAR(255) NOT NULL,
    `usuario` VARCHAR(50) NOT NULL,
    `clave` VARCHAR(255) NOT NULL,
    `correo` VARCHAR(150) NOT NULL,
    `telefono` VARCHAR(20) NOT NULL,
    `rol` ENUM('Admin', 'Bodega', 'AdminBogota', 'Entregador') NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ultimo_acceso` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sede_id` INTEGER NOT NULL,

    UNIQUE INDEX `usuarios_usuario_key`(`usuario`),
    UNIQUE INDEX `usuarios_correo_key`(`correo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `inventarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha` DATETIME(3) NOT NULL,
    `semana` INTEGER NOT NULL,
    `cantidad_ingresada` INTEGER NOT NULL DEFAULT 0,
    `costo_unitario` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `tipo` VARCHAR(20) NOT NULL DEFAULT 'entrada',
    `nota` TEXT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sede_id` INTEGER NOT NULL,
    `producto_id` INTEGER NOT NULL,

    INDEX `inventarios_sede_id_producto_id_fecha_idx`(`sede_id`, `producto_id`, `fecha`),
    INDEX `inventarios_semana_idx`(`semana`),
    INDEX `inventarios_fecha_idx`(`fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productos` (
    `codigo` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcion` VARCHAR(255) NOT NULL,
    `precio_costo` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `precio_venta` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `precio_mayoreo` DECIMAL(12, 2) NULL,
    `porcentaje_ganancia` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `departamento` VARCHAR(100) NULL DEFAULT 'Otros',
    `stock_minimo` INTEGER NOT NULL DEFAULT 0,
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
    `producto_id` INTEGER NOT NULL,
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
CREATE TABLE `historial_estados_pedido` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pedido_id` INTEGER NOT NULL,
    `estado` ENUM('Pendiente', 'Asignado', 'Entregado', 'Cancelado') NOT NULL,
    `cambiado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuario_id` INTEGER NULL,

    INDEX `historial_estados_pedido_pedido_id_idx`(`pedido_id`),
    INDEX `historial_estados_pedido_cambiado_en_idx`(`cambiado_en`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedidos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cliente_id` INTEGER NOT NULL,
    `sede_id` INTEGER NOT NULL,
    `estado` ENUM('Pendiente', 'Asignado', 'Entregado', 'Cancelado') NOT NULL DEFAULT 'Pendiente',
    `direccion` VARCHAR(255) NULL,
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
    `producto_id` INTEGER NOT NULL,
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

-- CreateTable
CREATE TABLE `ingresos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha` DATETIME(3) NOT NULL,
    `semana` INTEGER NOT NULL,
    `sedeId` INTEGER NOT NULL,
    `efectivo` DECIMAL(15, 2) NOT NULL,
    `cuentas` DECIMAL(15, 2) NOT NULL,
    `total` DECIMAL(15, 2) NOT NULL,
    `observacion` TEXT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ingresos_fecha_semana_idx`(`fecha`, `semana`),
    INDEX `ingresos_sedeId_idx`(`sedeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `egresos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha` DATE NOT NULL,
    `semana` INTEGER NOT NULL,
    `concepto` VARCHAR(200) NOT NULL,
    `total` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `observacion` VARCHAR(500) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sede_id` INTEGER NOT NULL,

    INDEX `egresos_fecha_semana_idx`(`fecha`, `semana`),
    INDEX `egresos_sede_id_idx`(`sede_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `abonos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha` DATE NOT NULL,
    `semana` INTEGER NOT NULL,
    `valor_pagado` DECIMAL(15, 2) NOT NULL,
    `observacion` VARCHAR(500) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `proveedor_id` INTEGER NOT NULL,
    `sede_id` INTEGER NOT NULL,

    INDEX `abonos_fecha_semana_idx`(`fecha`, `semana`),
    INDEX `abonos_proveedor_id_idx`(`proveedor_id`),
    INDEX `abonos_sede_id_idx`(`sede_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cartera` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha` DATE NOT NULL,
    `semana` INTEGER NOT NULL,
    `saldo_dia` DECIMAL(15, 2) NOT NULL,
    `saldo_anterior` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `variacion` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sede_id` INTEGER NOT NULL,

    INDEX `cartera_semana_idx`(`semana`),
    INDEX `cartera_fecha_idx`(`fecha`),
    UNIQUE INDEX `cartera_sede_id_fecha_key`(`sede_id`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `logs` ADD CONSTRAINT `logs_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_sede_id_fkey` FOREIGN KEY (`sede_id`) REFERENCES `sedes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sesiones` ADD CONSTRAINT `sesiones_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE `historial_estados_pedido` ADD CONSTRAINT `historial_estados_pedido_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historial_estados_pedido` ADD CONSTRAINT `historial_estados_pedido_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_sede_id_fkey` FOREIGN KEY (`sede_id`) REFERENCES `sedes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_creado_por_fkey` FOREIGN KEY (`creado_por`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedido_detalles` ADD CONSTRAINT `pedido_detalles_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedido_detalles` ADD CONSTRAINT `pedido_detalles_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`codigo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignaciones_entrega` ADD CONSTRAINT `asignaciones_entrega_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignaciones_entrega` ADD CONSTRAINT `asignaciones_entrega_entregador_id_fkey` FOREIGN KEY (`entregador_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignaciones_entrega` ADD CONSTRAINT `asignaciones_entrega_asignado_por_fkey` FOREIGN KEY (`asignado_por`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingresos` ADD CONSTRAINT `ingresos_sedeId_fkey` FOREIGN KEY (`sedeId`) REFERENCES `sedes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `egresos` ADD CONSTRAINT `egresos_sede_id_fkey` FOREIGN KEY (`sede_id`) REFERENCES `sedes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `abonos` ADD CONSTRAINT `abonos_proveedor_id_fkey` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `abonos` ADD CONSTRAINT `abonos_sede_id_fkey` FOREIGN KEY (`sede_id`) REFERENCES `sedes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cartera` ADD CONSTRAINT `cartera_sede_id_fkey` FOREIGN KEY (`sede_id`) REFERENCES `sedes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
