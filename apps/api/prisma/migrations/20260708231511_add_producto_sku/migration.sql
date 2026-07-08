/*
  Warnings:

  - A unique constraint covering the columns `[sku]` on the table `productos` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sku` to the `productos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `productos` ADD COLUMN `sku` VARCHAR(30) NOT NULL;

-- CreateTable
CREATE TABLE `sku_contadores` (
    `prefijo` VARCHAR(10) NOT NULL,
    `ultimo_numero` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`prefijo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `productos_sku_key` ON `productos`(`sku`);
