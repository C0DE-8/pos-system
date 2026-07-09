START TRANSACTION;

CREATE TABLE IF NOT EXISTS `membership_tier_category_discounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `membership_tier_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `discount_pct` decimal(10,2) NOT NULL DEFAULT 0.00,
  `business_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_tier_category_discount` (`membership_tier_id`,`category_id`),
  KEY `idx_tier_category_discounts_business_id` (`business_id`),
  KEY `idx_tier_category_discounts_category_id` (`category_id`),
  CONSTRAINT `fk_tier_category_discounts_tier`
    FOREIGN KEY (`membership_tier_id`) REFERENCES `membership_tiers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tier_category_discounts_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `membership_tier_category_discounts`
  (`membership_tier_id`, `category_id`, `discount_pct`, `business_id`)
SELECT mt.`id`, c.`id`, mt.`discount_pct`, mt.`business_id`
FROM `membership_tiers` mt
JOIN `categories` c
  ON c.`business_id` = mt.`business_id`
LEFT JOIN `membership_tier_category_discounts` mtcd
  ON mtcd.`membership_tier_id` = mt.`id`
 AND mtcd.`category_id` = c.`id`
WHERE mtcd.`id` IS NULL;

COMMIT;
