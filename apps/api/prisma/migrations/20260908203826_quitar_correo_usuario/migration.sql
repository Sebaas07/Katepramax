/*
  Warnings:

  - You are about to drop the column `correo` on the `usuarios` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[token_factura]` on the table `pedidos` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `usuarios_correo_key` ON `usuarios`;

-- AlterTable
ALTER TABLE `pedidos` ADD COLUMN `token_factura` VARCHAR(36) NULL;

-- AlterTable
ALTER TABLE `usuarios` DROP COLUMN `correo`;

-- CreateIndex
CREATE UNIQUE INDEX `pedidos_token_factura_key` ON `pedidos`(`token_factura`);
