START TRANSACTION;

ALTER TABLE `member_wallet_transactions`
  DROP FOREIGN KEY `fk_wallet_transactions_member`;

ALTER TABLE `member_wallet_transactions`
  MODIFY `member_id` int(11) DEFAULT NULL;

ALTER TABLE `member_wallet_transactions`
  ADD CONSTRAINT `fk_wallet_transactions_member`
    FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE SET NULL;

COMMIT;
