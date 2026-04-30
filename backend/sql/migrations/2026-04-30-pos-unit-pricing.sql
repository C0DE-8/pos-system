START TRANSACTION;

SET @pul_price_col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'product_unit_levels'
    AND COLUMN_NAME = 'price'
);

SET @pul_price_col_sql := IF(
  @pul_price_col_exists = 0,
  'ALTER TABLE `product_unit_levels` ADD COLUMN `price` decimal(12,2) NOT NULL DEFAULT 0.00 AFTER `conversion_factor`',
  'SELECT 1'
);

PREPARE pul_price_col_stmt FROM @pul_price_col_sql;
EXECUTE pul_price_col_stmt;
DEALLOCATE PREPARE pul_price_col_stmt;

SET @pending_cart_unit_level_col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'pending_cart_items'
    AND COLUMN_NAME = 'unit_level_id'
);

SET @pending_cart_unit_level_col_sql := IF(
  @pending_cart_unit_level_col_exists = 0,
  'ALTER TABLE `pending_cart_items` ADD COLUMN `unit_level_id` int(11) DEFAULT NULL AFTER `product_id`',
  'SELECT 1'
);

PREPARE pending_cart_unit_level_col_stmt FROM @pending_cart_unit_level_col_sql;
EXECUTE pending_cart_unit_level_col_stmt;
DEALLOCATE PREPARE pending_cart_unit_level_col_stmt;

SET @pending_cart_unit_label_col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'pending_cart_items'
    AND COLUMN_NAME = 'unit_label'
);

SET @pending_cart_unit_label_col_sql := IF(
  @pending_cart_unit_label_col_exists = 0,
  'ALTER TABLE `pending_cart_items` ADD COLUMN `unit_label` varchar(100) DEFAULT NULL AFTER `unit_level_id`',
  'SELECT 1'
);

PREPARE pending_cart_unit_label_col_stmt FROM @pending_cart_unit_label_col_sql;
EXECUTE pending_cart_unit_label_col_stmt;
DEALLOCATE PREPARE pending_cart_unit_label_col_stmt;

SET @pending_cart_unit_short_name_col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'pending_cart_items'
    AND COLUMN_NAME = 'unit_short_name'
);

SET @pending_cart_unit_short_name_col_sql := IF(
  @pending_cart_unit_short_name_col_exists = 0,
  'ALTER TABLE `pending_cart_items` ADD COLUMN `unit_short_name` varchar(50) DEFAULT NULL AFTER `unit_label`',
  'SELECT 1'
);

PREPARE pending_cart_unit_short_name_col_stmt FROM @pending_cart_unit_short_name_col_sql;
EXECUTE pending_cart_unit_short_name_col_stmt;
DEALLOCATE PREPARE pending_cart_unit_short_name_col_stmt;

SET @sale_items_unit_level_col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sale_items'
    AND COLUMN_NAME = 'unit_level_id'
);

SET @sale_items_unit_level_col_sql := IF(
  @sale_items_unit_level_col_exists = 0,
  'ALTER TABLE `sale_items` ADD COLUMN `unit_level_id` int(11) DEFAULT NULL AFTER `product_id`',
  'SELECT 1'
);

PREPARE sale_items_unit_level_col_stmt FROM @sale_items_unit_level_col_sql;
EXECUTE sale_items_unit_level_col_stmt;
DEALLOCATE PREPARE sale_items_unit_level_col_stmt;

SET @sale_items_unit_label_col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sale_items'
    AND COLUMN_NAME = 'unit_label'
);

SET @sale_items_unit_label_col_sql := IF(
  @sale_items_unit_label_col_exists = 0,
  'ALTER TABLE `sale_items` ADD COLUMN `unit_label` varchar(100) DEFAULT NULL AFTER `unit_level_id`',
  'SELECT 1'
);

PREPARE sale_items_unit_label_col_stmt FROM @sale_items_unit_label_col_sql;
EXECUTE sale_items_unit_label_col_stmt;
DEALLOCATE PREPARE sale_items_unit_label_col_stmt;

SET @sale_items_unit_short_name_col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sale_items'
    AND COLUMN_NAME = 'unit_short_name'
);

SET @sale_items_unit_short_name_col_sql := IF(
  @sale_items_unit_short_name_col_exists = 0,
  'ALTER TABLE `sale_items` ADD COLUMN `unit_short_name` varchar(50) DEFAULT NULL AFTER `unit_label`',
  'SELECT 1'
);

PREPARE sale_items_unit_short_name_col_stmt FROM @sale_items_unit_short_name_col_sql;
EXECUTE sale_items_unit_short_name_col_stmt;
DEALLOCATE PREPARE sale_items_unit_short_name_col_stmt;

COMMIT;
