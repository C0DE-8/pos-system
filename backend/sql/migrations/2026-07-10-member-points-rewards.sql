START TRANSACTION;

ALTER TABLE `members`
  ADD COLUMN IF NOT EXISTS `lifetime_points` int(11) NOT NULL DEFAULT 0 AFTER `points`,
  ADD COLUMN IF NOT EXISTS `reward_badge` varchar(50) DEFAULT 'Starter' AFTER `lifetime_points`;

CREATE TABLE IF NOT EXISTS `member_points_ledger` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `member_id` int(11) DEFAULT NULL,
  `transaction_type` enum('earn','redeem','adjust') NOT NULL,
  `points` int(11) NOT NULL,
  `points_before` int(11) NOT NULL,
  `points_after` int(11) NOT NULL,
  `source` varchar(50) NOT NULL DEFAULT 'manual',
  `reference` varchar(120) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `business_id` int(11) DEFAULT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_points_ledger_member_id` (`member_id`),
  KEY `idx_points_ledger_business_id` (`business_id`),
  KEY `idx_points_ledger_created_at` (`created_at`),
  CONSTRAINT `fk_points_ledger_member`
    FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_points_ledger_user`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `pending_carts`
  ADD COLUMN IF NOT EXISTS `wallet_payment` decimal(12,2) NOT NULL DEFAULT 0.00 AFTER `giftcard_discount`,
  ADD COLUMN IF NOT EXISTS `wallet_debited_at` datetime DEFAULT NULL AFTER `wallet_payment`,
  ADD COLUMN IF NOT EXISTS `wallet_debit_source` varchar(50) DEFAULT NULL AFTER `wallet_debited_at`,
  ADD COLUMN IF NOT EXISTS `reward_points_redeemed` int(11) NOT NULL DEFAULT 0 AFTER `loyalty_discount`,
  ADD COLUMN IF NOT EXISTS `points_earned` int(11) NOT NULL DEFAULT 0 AFTER `wallet_payment`,
  ADD COLUMN IF NOT EXISTS `points_awarded_at` datetime DEFAULT NULL AFTER `points_earned`,
  ADD COLUMN IF NOT EXISTS `points_award_source` varchar(50) DEFAULT NULL AFTER `points_awarded_at`;

ALTER TABLE `sales`
  ADD COLUMN IF NOT EXISTS `wallet_payment` decimal(12,2) NOT NULL DEFAULT 0.00 AFTER `giftcard_discount`,
  ADD COLUMN IF NOT EXISTS `reward_points_redeemed` int(11) NOT NULL DEFAULT 0 AFTER `loyalty_discount`,
  ADD COLUMN IF NOT EXISTS `points_earned` int(11) NOT NULL DEFAULT 0 AFTER `wallet_payment`;

UPDATE `members`
SET
  `lifetime_points` = GREATEST(COALESCE(`lifetime_points`, 0), COALESCE(`points`, 0)),
  `reward_badge` = CASE
    WHEN GREATEST(COALESCE(`lifetime_points`, 0), COALESCE(`points`, 0)) >= 5000 THEN 'Legend'
    WHEN GREATEST(COALESCE(`lifetime_points`, 0), COALESCE(`points`, 0)) >= 2500 THEN 'Champion'
    WHEN GREATEST(COALESCE(`lifetime_points`, 0), COALESCE(`points`, 0)) >= 1000 THEN 'Pro'
    WHEN GREATEST(COALESCE(`lifetime_points`, 0), COALESCE(`points`, 0)) >= 250 THEN 'Rising Star'
    ELSE 'Starter'
  END;

COMMIT;
