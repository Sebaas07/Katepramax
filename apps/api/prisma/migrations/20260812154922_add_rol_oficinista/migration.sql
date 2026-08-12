-- AlterTable
ALTER TABLE `usuarios` MODIFY `rol` ENUM('Admin', 'AdminBogota', 'Oficinista', 'Bodega', 'Entregador') NOT NULL;
