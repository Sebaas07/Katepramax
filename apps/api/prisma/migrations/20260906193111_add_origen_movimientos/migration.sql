-- AlterTable
ALTER TABLE `egresos` ADD COLUMN `id_referencia` INTEGER NULL,
    ADD COLUMN `origen` VARCHAR(30) NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE `ingresos` ADD COLUMN `id_referencia` INTEGER NULL,
    ADD COLUMN `origen` VARCHAR(30) NOT NULL DEFAULT 'manual';

-- CreateIndex
CREATE INDEX `egresos_origen_id_referencia_idx` ON `egresos`(`origen`, `id_referencia`);

-- CreateIndex
CREATE INDEX `ingresos_origen_id_referencia_idx` ON `ingresos`(`origen`, `id_referencia`);
