START TRANSACTION;

CREATE TABLE IF NOT EXISTS `product_unit_levels` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `level` int(11) NOT NULL,
  `parent_level_id` int(11) DEFAULT NULL,
  `conversion_factor` int(11) NOT NULL DEFAULT 1,
  `is_smallest_unit` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_product_unit_level` (`product_id`,`level`),
  UNIQUE KEY `uniq_product_unit_once` (`product_id`,`unit_id`),
  KEY `idx_product_unit_levels_product_id` (`product_id`),
  KEY `idx_product_unit_levels_unit_id` (`unit_id`),
  KEY `idx_product_unit_levels_parent_level_id` (`parent_level_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET @pul_product_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'product_unit_levels'
    AND CONSTRAINT_NAME = 'fk_product_unit_levels_product'
);

SET @pul_product_fk_sql := IF(
  @pul_product_fk_exists = 0,
  'ALTER TABLE `product_unit_levels` ADD CONSTRAINT `fk_product_unit_levels_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE',
  'SELECT 1'
);

PREPARE pul_product_fk_stmt FROM @pul_product_fk_sql;
EXECUTE pul_product_fk_stmt;
DEALLOCATE PREPARE pul_product_fk_stmt;

SET @pul_unit_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'product_unit_levels'
    AND CONSTRAINT_NAME = 'fk_product_unit_levels_unit'
);

SET @pul_unit_fk_sql := IF(
  @pul_unit_fk_exists = 0,
  'ALTER TABLE `product_unit_levels` ADD CONSTRAINT `fk_product_unit_levels_unit` FOREIGN KEY (`unit_id`) REFERENCES `product_units` (`id`) ON DELETE RESTRICT',
  'SELECT 1'
);

PREPARE pul_unit_fk_stmt FROM @pul_unit_fk_sql;
EXECUTE pul_unit_fk_stmt;
DEALLOCATE PREPARE pul_unit_fk_stmt;

SET @pul_parent_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'product_unit_levels'
    AND CONSTRAINT_NAME = 'fk_product_unit_levels_parent'
);

SET @pul_parent_fk_sql := IF(
  @pul_parent_fk_exists = 0,
  'ALTER TABLE `product_unit_levels` ADD CONSTRAINT `fk_product_unit_levels_parent` FOREIGN KEY (`parent_level_id`) REFERENCES `product_unit_levels` (`id`) ON DELETE SET NULL',
  'SELECT 1'
);

PREPARE pul_parent_fk_stmt FROM @pul_parent_fk_sql;
EXECUTE pul_parent_fk_stmt;
DEALLOCATE PREPARE pul_parent_fk_stmt;

CREATE TABLE IF NOT EXISTS `unit_inventory` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `unit_level_id` int(11) NOT NULL,
  `qty` int(11) NOT NULL DEFAULT 0,
  `branch_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_unit_inventory_product_id` (`product_id`),
  KEY `idx_unit_inventory_level_id` (`unit_level_id`),
  KEY `idx_unit_inventory_branch_id` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET @ui_product_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'unit_inventory'
    AND CONSTRAINT_NAME = 'fk_unit_inventory_product'
);

SET @ui_product_fk_sql := IF(
  @ui_product_fk_exists = 0,
  'ALTER TABLE `unit_inventory` ADD CONSTRAINT `fk_unit_inventory_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE',
  'SELECT 1'
);

PREPARE ui_product_fk_stmt FROM @ui_product_fk_sql;
EXECUTE ui_product_fk_stmt;
DEALLOCATE PREPARE ui_product_fk_stmt;

SET @ui_level_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'unit_inventory'
    AND CONSTRAINT_NAME = 'fk_unit_inventory_level'
);

SET @ui_level_fk_sql := IF(
  @ui_level_fk_exists = 0,
  'ALTER TABLE `unit_inventory` ADD CONSTRAINT `fk_unit_inventory_level` FOREIGN KEY (`unit_level_id`) REFERENCES `product_unit_levels` (`id`) ON DELETE CASCADE',
  'SELECT 1'
);

PREPARE ui_level_fk_stmt FROM @ui_level_fk_sql;
EXECUTE ui_level_fk_stmt;
DEALLOCATE PREPARE ui_level_fk_stmt;

CREATE TABLE IF NOT EXISTS `unit_inventory_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `unit_level_id` int(11) NOT NULL,
  `before_qty` int(11) NOT NULL DEFAULT 0,
  `after_qty` int(11) NOT NULL DEFAULT 0,
  `change_qty` int(11) NOT NULL DEFAULT 0,
  `reason` varchar(255) DEFAULT NULL,
  `by_user_id` int(11) DEFAULT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_unit_inventory_history_product_id` (`product_id`),
  KEY `idx_unit_inventory_history_level_id` (`unit_level_id`),
  KEY `idx_unit_inventory_history_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET @uih_product_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'unit_inventory_history'
    AND CONSTRAINT_NAME = 'fk_unit_inventory_history_product'
);

SET @uih_product_fk_sql := IF(
  @uih_product_fk_exists = 0,
  'ALTER TABLE `unit_inventory_history` ADD CONSTRAINT `fk_unit_inventory_history_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE',
  'SELECT 1'
);

PREPARE uih_product_fk_stmt FROM @uih_product_fk_sql;
EXECUTE uih_product_fk_stmt;
DEALLOCATE PREPARE uih_product_fk_stmt;

SET @uih_level_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'unit_inventory_history'
    AND CONSTRAINT_NAME = 'fk_unit_inventory_history_level'
);

SET @uih_level_fk_sql := IF(
  @uih_level_fk_exists = 0,
  'ALTER TABLE `unit_inventory_history` ADD CONSTRAINT `fk_unit_inventory_history_level` FOREIGN KEY (`unit_level_id`) REFERENCES `product_unit_levels` (`id`) ON DELETE CASCADE',
  'SELECT 1'
);

PREPARE uih_level_fk_stmt FROM @uih_level_fk_sql;
EXECUTE uih_level_fk_stmt;
DEALLOCATE PREPARE uih_level_fk_stmt;

SET @products_has_unit_hierarchy_col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'has_unit_hierarchy'
);

SET @products_has_unit_hierarchy_col_sql := IF(
  @products_has_unit_hierarchy_col_exists = 0,
  'ALTER TABLE `products` ADD COLUMN `has_unit_hierarchy` tinyint(1) NOT NULL DEFAULT 0 AFTER `is_unlimited`',
  'SELECT 1'
);

PREPARE products_has_unit_hierarchy_col_stmt FROM @products_has_unit_hierarchy_col_sql;
EXECUTE products_has_unit_hierarchy_col_stmt;
DEALLOCATE PREPARE products_has_unit_hierarchy_col_stmt;

SET @products_has_unit_hierarchy_idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND INDEX_NAME = 'idx_products_has_unit_hierarchy'
);

SET @products_has_unit_hierarchy_idx_sql := IF(
  @products_has_unit_hierarchy_idx_exists = 0,
  'ALTER TABLE `products` ADD KEY `idx_products_has_unit_hierarchy` (`has_unit_hierarchy`)',
  'SELECT 1'
);

PREPARE products_has_unit_hierarchy_idx_stmt FROM @products_has_unit_hierarchy_idx_sql;
EXECUTE products_has_unit_hierarchy_idx_stmt;
DEALLOCATE PREPARE products_has_unit_hierarchy_idx_stmt;

COMMIT;
