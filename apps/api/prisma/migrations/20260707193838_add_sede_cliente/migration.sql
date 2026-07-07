-- AlterTable
ALTER TABLE `clientes` ADD COLUMN `sede_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `clientes_sede_id_idx` ON `clientes`(`sede_id`);

-- AddForeignKey
ALTER TABLE `clientes` ADD CONSTRAINT `clientes_sede_id_fkey` FOREIGN KEY (`sede_id`) REFERENCES `sedes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
