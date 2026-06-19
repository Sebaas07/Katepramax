/*
  Warnings:

  - You are about to drop the column `costo` on the `inventarios` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `inventarios` DROP COLUMN `costo`,
    ADD COLUMN `costo_unitario` DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
