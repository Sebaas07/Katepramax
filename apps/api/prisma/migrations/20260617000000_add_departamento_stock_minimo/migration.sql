-- AlterTable: Add departamento and stock_minimo to productos
ALTER TABLE `productos`
  ADD COLUMN IF NOT EXISTS `departamento` VARCHAR(100) NULL DEFAULT 'Otros',
  ADD COLUMN IF NOT EXISTS `stock_minimo` INT NOT NULL DEFAULT 0;
