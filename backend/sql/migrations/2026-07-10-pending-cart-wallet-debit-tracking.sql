START TRANSACTION;

ALTER TABLE `pending_carts`
  ADD COLUMN IF NOT EXISTS `wallet_debited_at` datetime DEFAULT NULL AFTER `wallet_payment`,
  ADD COLUMN IF NOT EXISTS `wallet_debit_source` varchar(50) DEFAULT NULL AFTER `wallet_debited_at`;

COMMIT;
