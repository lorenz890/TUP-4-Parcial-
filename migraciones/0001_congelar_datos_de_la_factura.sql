ALTER TABLE `factura_items` ADD `codigo` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `facturas` ADD `cliente_nombre` text;--> statement-breakpoint
ALTER TABLE `facturas` ADD `cliente_tipo_doc` text;--> statement-breakpoint
ALTER TABLE `facturas` ADD `cliente_nro_doc` text;--> statement-breakpoint
ALTER TABLE `facturas` ADD `cliente_domicilio` text;
--> statement-breakpoint
-- Las facturas que ya existen se rellenan con los datos ACTUALES del cliente y del producto:
-- es lo mejor que se puede hacer, porque lo que había antes de la migración no se guardó.
UPDATE `facturas` SET
  `cliente_nombre` = (SELECT `nombre` FROM `clientes` WHERE `clientes`.`id` = `facturas`.`cliente_id`),
  `cliente_tipo_doc` = (SELECT `tipo_doc` FROM `clientes` WHERE `clientes`.`id` = `facturas`.`cliente_id`),
  `cliente_nro_doc` = (SELECT `nro_doc` FROM `clientes` WHERE `clientes`.`id` = `facturas`.`cliente_id`),
  `cliente_domicilio` = (SELECT `domicilio` FROM `clientes` WHERE `clientes`.`id` = `facturas`.`cliente_id`)
WHERE `cliente_id` IS NOT NULL;--> statement-breakpoint
UPDATE `factura_items` SET
  `codigo` = (SELECT `codigo` FROM `productos` WHERE `productos`.`id` = `factura_items`.`producto_id`);
