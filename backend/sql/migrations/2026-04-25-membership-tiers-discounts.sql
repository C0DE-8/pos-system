START TRANSACTION;

CREATE TABLE IF NOT EXISTS `membership_tiers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `discount_pct` decimal(10,2) NOT NULL DEFAULT 0.00,
  `business_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_membership_tier_name_per_business` (`business_id`,`name`),
  KEY `idx_membership_tiers_business_id` (`business_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `members`
  MODIFY `tier` varchar(150) DEFAULT NULL,
  ADD COLUMN `membership_tier_id` int(11) DEFAULT NULL AFTER `tier`,
  ADD KEY `idx_members_membership_tier_id` (`membership_tier_id`);

ALTER TABLE `pending_carts`
  ADD COLUMN `member_id` int(11) DEFAULT NULL AFTER `customer`,
  ADD COLUMN `membership_tier_id` int(11) DEFAULT NULL AFTER `member_id`,
  ADD COLUMN `membership_tier_name` varchar(150) DEFAULT NULL AFTER `membership_tier_id`,
  ADD COLUMN `membership_discount_pct` decimal(10,2) NOT NULL DEFAULT 0.00 AFTER `membership_tier_name`,
  ADD COLUMN `membership_discount` decimal(12,2) NOT NULL DEFAULT 0.00 AFTER `membership_discount_pct`,
  ADD KEY `idx_pending_carts_member_id` (`member_id`),
  ADD KEY `idx_pending_carts_membership_tier_id` (`membership_tier_id`);

ALTER TABLE `sales`
  ADD COLUMN `member_id` int(11) DEFAULT NULL AFTER `customer`,
  ADD COLUMN `membership_tier_id` int(11) DEFAULT NULL AFTER `member_id`,
  ADD COLUMN `membership_tier_name` varchar(150) DEFAULT NULL AFTER `membership_tier_id`,
  ADD COLUMN `membership_discount_pct` decimal(10,2) NOT NULL DEFAULT 0.00 AFTER `membership_tier_name`,
  ADD COLUMN `membership_discount` decimal(12,2) NOT NULL DEFAULT 0.00 AFTER `membership_discount_pct`,
  ADD KEY `idx_sales_member_id` (`member_id`),
  ADD KEY `idx_sales_membership_tier_id` (`membership_tier_id`);

INSERT INTO `membership_tiers` (`name`, `discount_pct`, `business_id`)
SELECT seed.name, seed.discount_pct, seed.business_id
FROM (
  SELECT `id` AS business_id, 'Regular' AS name, 0.00 AS discount_pct
  FROM `businesses`
  UNION ALL
  SELECT `id` AS business_id, 'VIP' AS name, 0.00 AS discount_pct
  FROM `businesses`
  UNION ALL
  SELECT DISTINCT `business_id`, TRIM(`tier`) AS name, 0.00 AS discount_pct
  FROM `members`
  WHERE `business_id` IS NOT NULL
    AND `tier` IS NOT NULL
    AND TRIM(`tier`) <> ''
    AND LOWER(TRIM(`tier`)) <> 'walk-in'
) seed
LEFT JOIN `membership_tiers` mt
  ON mt.`business_id` = seed.`business_id`
 AND LOWER(mt.`name`) = LOWER(seed.`name`)
WHERE seed.`business_id` IS NOT NULL
  AND mt.`id` IS NULL;

UPDATE `members` m
LEFT JOIN `membership_tiers` mt
  ON mt.`business_id` = m.`business_id`
 AND LOWER(mt.`name`) = LOWER(TRIM(m.`tier`))
SET m.`membership_tier_id` = mt.`id`
WHERE m.`membership_tier_id` IS NULL
  AND m.`tier` IS NOT NULL
  AND TRIM(m.`tier`) <> ''
  AND LOWER(TRIM(m.`tier`)) <> 'walk-in';

UPDATE `members` m
LEFT JOIN `membership_tiers` mt
  ON mt.`id` = m.`membership_tier_id`
SET m.`tier` = mt.`name`
WHERE m.`membership_tier_id` IS NOT NULL
  AND mt.`id` IS NOT NULL;

ALTER TABLE `members`
  ADD CONSTRAINT `members_ibfk_membership_tier`
    FOREIGN KEY (`membership_tier_id`) REFERENCES `membership_tiers` (`id`) ON DELETE SET NULL;

ALTER TABLE `pending_carts`
  ADD CONSTRAINT `pending_carts_ibfk_member`
    FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `pending_carts_ibfk_membership_tier`
    FOREIGN KEY (`membership_tier_id`) REFERENCES `membership_tiers` (`id`) ON DELETE SET NULL;

ALTER TABLE `sales`
  ADD CONSTRAINT `sales_ibfk_member`
    FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `sales_ibfk_membership_tier`
    FOREIGN KEY (`membership_tier_id`) REFERENCES `membership_tiers` (`id`) ON DELETE SET NULL;

COMMIT;
