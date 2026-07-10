START TRANSACTION;

ALTER TABLE `members`
  ADD COLUMN IF NOT EXISTS `birthday` date DEFAULT NULL AFTER `email`,
  ADD COLUMN IF NOT EXISTS `preferences` text DEFAULT NULL AFTER `birthday`,
  ADD COLUMN IF NOT EXISTS `offer_notes` text DEFAULT NULL AFTER `preferences`,
  ADD COLUMN IF NOT EXISTS `mobile_wallet_notifications` tinyint(1) NOT NULL DEFAULT 1 AFTER `offer_notes`,
  ADD COLUMN IF NOT EXISTS `last_offer_sent_at` datetime DEFAULT NULL AFTER `mobile_wallet_notifications`;

COMMIT;
