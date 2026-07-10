START TRANSACTION;

CREATE TABLE IF NOT EXISTS `member_challenges` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(160) NOT NULL,
  `description` text DEFAULT NULL,
  `challenge_type` enum('visit_count','spend_amount','product_count','category_count','points_earned','manual') NOT NULL DEFAULT 'visit_count',
  `target_value` decimal(12,2) NOT NULL DEFAULT 1.00,
  `bonus_points` int(11) NOT NULL DEFAULT 0,
  `badge_name` varchar(80) DEFAULT NULL,
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `business_id` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_member_challenges_business` (`business_id`),
  KEY `idx_member_challenges_active` (`is_active`),
  KEY `idx_member_challenges_dates` (`starts_at`, `ends_at`),
  CONSTRAINT `fk_member_challenges_user`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `member_challenge_completions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `challenge_id` int(11) NOT NULL,
  `member_id` int(11) DEFAULT NULL,
  `progress_value` decimal(12,2) NOT NULL DEFAULT 0.00,
  `completed_at` datetime NOT NULL DEFAULT current_timestamp(),
  `reward_awarded_at` datetime DEFAULT NULL,
  `note` text DEFAULT NULL,
  `business_id` int(11) DEFAULT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_member_challenge_completion` (`challenge_id`, `member_id`),
  KEY `idx_challenge_completions_member` (`member_id`),
  KEY `idx_challenge_completions_business` (`business_id`),
  CONSTRAINT `fk_member_challenge_completion_challenge`
    FOREIGN KEY (`challenge_id`) REFERENCES `member_challenges` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_member_challenge_completion_member`
    FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_member_challenge_completion_user`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

COMMIT;
