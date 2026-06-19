-- AlterTable
ALTER TABLE `inventarios` ADD COLUMN `nota` TEXT NULL,
    ADD COLUMN `tipo` VARCHAR(20) NOT NULL DEFAULT 'entrada';
