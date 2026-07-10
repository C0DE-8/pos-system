START TRANSACTION;

ALTER TABLE `members`
  ADD COLUMN IF NOT EXISTS `member_status` enum('active','pending','inactive') NOT NULL DEFAULT 'active' AFTER `mobile_wallet_notifications`,
  ADD COLUMN IF NOT EXISTS `registered_source` varchar(50) DEFAULT 'staff' AFTER `member_status`,
  ADD COLUMN IF NOT EXISTS `verified_at` datetime DEFAULT NULL AFTER `registered_source`,
  ADD KEY `idx_members_email_business` (`business_id`, `email`),
  ADD KEY `idx_members_status_business` (`business_id`, `member_status`);

UPDATE `members`
SET `member_status` = 'active'
WHERE `member_status` IS NULL OR `member_status` = '';

ALTER TABLE `customer_orders`
  ADD COLUMN IF NOT EXISTS `member_id` int(11) DEFAULT NULL AFTER `customer_email`,
  ADD COLUMN IF NOT EXISTS `wallet_payment` decimal(12,2) NOT NULL DEFAULT 0.00 AFTER `discount`,
  ADD COLUMN IF NOT EXISTS `payment_method` enum('pay_at_counter','wallet','card','transfer') NOT NULL DEFAULT 'pay_at_counter' AFTER `currency`,
  ADD KEY `idx_customer_orders_member_id` (`member_id`);

CREATE TABLE IF NOT EXISTS `customer_reservations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `reservation_code` varchar(80) NOT NULL,
  `member_id` int(11) DEFAULT NULL,
  `customer_name` varchar(150) DEFAULT NULL,
  `customer_phone` varchar(50) DEFAULT NULL,
  `customer_email` varchar(150) DEFAULT NULL,
  `session_type` varchar(80) NOT NULL DEFAULT 'game_session',
  `party_size` int(11) NOT NULL DEFAULT 1,
  `reservation_date` date NOT NULL,
  `reservation_time` time NOT NULL,
  `duration_minutes` int(11) NOT NULL DEFAULT 60,
  `notes` text DEFAULT NULL,
  `payment_method` enum('pay_at_counter','wallet','card','transfer') NOT NULL DEFAULT 'pay_at_counter',
  `wallet_payment` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customer_reservations_code` (`reservation_code`),
  KEY `idx_customer_reservations_business_branch` (`business_id`, `branch_id`),
  KEY `idx_customer_reservations_member_id` (`member_id`),
  KEY `idx_customer_reservations_date` (`reservation_date`, `reservation_time`),
  CONSTRAINT `customer_reservations_member_fk`
    FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'customer_orders'
    AND CONSTRAINT_NAME = 'customer_orders_member_fk'
);

SET @add_fk_sql := IF(
  @fk_exists = 0,
  'ALTER TABLE `customer_orders` ADD CONSTRAINT `customer_orders_member_fk` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE SET NULL',
  'SELECT 1'
);

PREPARE add_fk_stmt FROM @add_fk_sql;
EXECUTE add_fk_stmt;
DEALLOCATE PREPARE add_fk_stmt;

COMMIT;
