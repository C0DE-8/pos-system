START TRANSACTION;

CREATE TABLE IF NOT EXISTS `product_units` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `short_name` varchar(30) DEFAULT NULL,
  `business_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_product_units_name_per_business` (`business_id`,`name`),
  KEY `idx_product_units_business_id` (`business_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `product_units` (`name`, `short_name`, `business_id`)
SELECT seed.`name`, seed.`short_name`, seed.`business_id`
FROM (
  SELECT `id` AS business_id, 'Piece' AS name, 'pc' AS short_name
  FROM `businesses`
  UNION ALL
  SELECT `id` AS business_id, 'Pack' AS name, 'pack' AS short_name
  FROM `businesses`
  UNION ALL
  SELECT `id` AS business_id, 'Carton' AS name, 'ctn' AS short_name
  FROM `businesses`
) seed
LEFT JOIN `product_units` pu
  ON pu.`business_id` = seed.`business_id`
 AND LOWER(pu.`name`) = LOWER(seed.`name`)
WHERE pu.`id` IS NULL;

ALTER TABLE `products`
  ADD COLUMN IF NOT EXISTS `product_unit_id` int(11) DEFAULT NULL AFTER `category_id`,
  ADD KEY IF NOT EXISTS `idx_products_product_unit_id` (`product_unit_id`);

SET @products_unit_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND CONSTRAINT_NAME = 'products_ibfk_product_unit'
);

SET @products_unit_fk_sql := IF(
  @products_unit_fk_exists = 0,
  'ALTER TABLE `products` ADD CONSTRAINT `products_ibfk_product_unit` FOREIGN KEY (`product_unit_id`) REFERENCES `product_units` (`id`) ON DELETE SET NULL',
  'SELECT 1'
);

PREPARE products_unit_fk_stmt FROM @products_unit_fk_sql;
EXECUTE products_unit_fk_stmt;
DEALLOCATE PREPARE products_unit_fk_stmt;

COMMIT;
