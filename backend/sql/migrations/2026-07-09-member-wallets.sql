START TRANSACTION;

ALTER TABLE `members`
  ADD COLUMN IF NOT EXISTS `wallet_balance` decimal(12,2) NOT NULL DEFAULT 0.00 AFTER `membership_tier_id`,
  ADD COLUMN IF NOT EXISTS `wallet_token` varchar(80) DEFAULT NULL AFTER `wallet_balance`;

UPDATE `members`
SET `wallet_token` = CONCAT('WAL-', COALESCE(`business_id`, 0), '-', `id`, '-', LPAD(`id`, 6, '0'))
WHERE `wallet_token` IS NULL OR TRIM(`wallet_token`) = '';

ALTER TABLE `members`
  MODIFY `wallet_token` varchar(80) NOT NULL,
  ADD UNIQUE KEY `uniq_members_wallet_token` (`wallet_token`);

CREATE TABLE IF NOT EXISTS `member_wallet_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `member_id` int(11) NOT NULL,
  `wallet_token` varchar(80) NOT NULL,
  `transaction_type` enum('credit','debit','checkout') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `balance_before` decimal(12,2) NOT NULL,
  `balance_after` decimal(12,2) NOT NULL,
  `source` varchar(50) NOT NULL DEFAULT 'manual',
  `reference` varchar(120) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `business_id` int(11) DEFAULT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_wallet_transactions_member_id` (`member_id`),
  KEY `idx_wallet_transactions_wallet_token` (`wallet_token`),
  KEY `idx_wallet_transactions_business_id` (`business_id`),
  CONSTRAINT `fk_wallet_transactions_member`
    FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wallet_transactions_user`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `pending_carts`
  ADD COLUMN IF NOT EXISTS `wallet_payment` decimal(12,2) NOT NULL DEFAULT 0.00 AFTER `giftcard_discount`;

ALTER TABLE `sales`
  ADD COLUMN IF NOT EXISTS `wallet_payment` decimal(12,2) NOT NULL DEFAULT 0.00 AFTER `giftcard_discount`;

COMMIT;
