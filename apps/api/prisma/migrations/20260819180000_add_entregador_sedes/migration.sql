-- Tabla puente: un entregador puede estar asignado a varias bodegas.
CREATE TABLE `entregador_sedes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `entregador_id` INT NOT NULL,
  `sede_id` INT NOT NULL,

  UNIQUE INDEX `entregador_sedes_entregador_id_sede_id_key`(`entregador_id`, `sede_id`),
  INDEX `entregador_sedes_sede_id_idx`(`sede_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Retrocompatibilidad: todo entregador existente queda vinculado a su bodega
-- principal (usuarios.sede_id) para no perder la relación actual.
INSERT INTO `entregador_sedes` (`entregador_id`, `sede_id`)
SELECT `id`, `sede_id`
FROM `usuarios`
WHERE `rol` = 'Entregador'
  AND `activo` = 1
  AND NOT EXISTS (
    SELECT 1
    FROM `entregador_sedes` es
    WHERE es.`entregador_id` = `usuarios`.`id`
      AND es.`sede_id` = `usuarios`.`sede_id`
  );

ALTER TABLE `entregador_sedes`
  ADD CONSTRAINT `entregador_sedes_entregador_id_fkey`
    FOREIGN KEY (`entregador_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `entregador_sedes_sede_id_fkey`
    FOREIGN KEY (`sede_id`) REFERENCES `sedes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;