-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Apr 14, 2026 at 10:07 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `arena_pro_pos`
--

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('sporty','consumable','service','other') NOT NULL DEFAULT 'other',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `type`, `created_at`, `updated_at`) VALUES
(1, 'Snooker', 'other', '2026-03-16 08:33:37', '2026-03-16 08:33:37'),
(2, 'Paintball', 'other', '2026-03-16 08:33:37', '2026-03-16 08:33:37'),
(3, 'Ball', 'sporty', '2026-03-16 08:34:59', '2026-03-16 08:34:59'),
(4, 'wine', 'consumable', '2026-03-16 08:35:11', '2026-03-16 08:35:11'),
(5, 'rice', 'consumable', '2026-03-16 08:35:16', '2026-03-16 08:35:16');

-- --------------------------------------------------------

--
-- Table structure for table `clock_events`
--

CREATE TABLE `clock_events` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `event_type` enum('in','out') NOT NULL,
  `event_time` datetime DEFAULT current_timestamp(),
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clock_events`
--

INSERT INTO `clock_events` (`id`, `user_id`, `event_type`, `event_time`, `created_at`) VALUES
(1, 2, 'in', '2026-03-09 18:01:37', '2026-03-09 20:08:34'),
(2, 2, 'in', '2026-03-09 18:03:46', '2026-03-09 20:08:34'),
(3, 2, 'in', '2026-03-09 18:03:56', '2026-03-09 20:08:34'),
(4, 2, 'in', '2026-03-09 18:35:46', '2026-03-09 20:08:34'),
(5, 2, 'out', '2026-03-09 19:01:43', '2026-03-09 20:08:34'),
(6, 3, 'in', '2026-03-09 19:02:15', '2026-03-09 20:08:34'),
(7, 3, 'out', '2026-03-09 19:02:21', '2026-03-09 20:08:34'),
(8, 4, 'in', '2026-03-09 19:02:46', '2026-03-09 20:08:34'),
(9, 2, 'in', '2026-03-09 19:08:40', '2026-03-09 20:08:34'),
(10, 2, 'in', '2026-03-09 20:04:00', '2026-03-09 20:08:34'),
(11, 2, 'in', '2026-03-10 03:14:38', '2026-03-10 03:14:38'),
(12, 2, 'out', '2026-03-10 03:29:43', '2026-03-10 03:29:43'),
(13, 5, 'in', '2026-03-10 03:29:53', '2026-03-10 03:29:53'),
(14, 5, 'out', '2026-03-10 03:30:31', '2026-03-10 03:30:31'),
(15, 3, 'in', '2026-03-10 03:31:32', '2026-03-10 03:31:32'),
(16, 3, 'out', '2026-03-10 03:31:47', '2026-03-10 03:31:47'),
(17, 2, 'in', '2026-03-10 03:32:14', '2026-03-10 03:32:14'),
(18, 2, 'in', '2026-03-16 08:31:43', '2026-03-16 08:31:43'),
(19, 2, 'in', '2026-03-19 03:30:17', '2026-03-19 03:30:17'),
(20, 2, 'in', '2026-03-19 16:36:34', '2026-03-19 16:36:34'),
(21, 2, 'in', '2026-03-19 18:23:05', '2026-03-19 18:23:05'),
(22, 2, 'in', '2026-04-04 02:15:51', '2026-04-04 02:15:51'),
(23, 2, 'in', '2026-04-06 03:31:43', '2026-04-06 03:31:43'),
(24, 2, 'in', '2026-04-10 07:06:52', '2026-04-10 07:06:52');

-- --------------------------------------------------------

--
-- Table structure for table `courts`
--

CREATE TABLE `courts` (
  `id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `icon` varchar(20) DEFAULT '?',
  `type` varchar(100) NOT NULL,
  `mode` enum('sports','dining') DEFAULT 'sports',
  `status` enum('available','occupied') DEFAULT 'available',
  `linked_product_id` int(11) DEFAULT NULL,
  `current_customer` varchar(150) DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `duration_minutes` int(11) DEFAULT NULL,
  `end_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `gift_cards`
--

CREATE TABLE `gift_cards` (
  `id` int(11) NOT NULL,
  `code` varchar(80) NOT NULL,
  `customer` varchar(150) DEFAULT NULL,
  `balance` decimal(12,2) DEFAULT 0.00,
  `active` tinyint(1) DEFAULT 1,
  `issued_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `kds_orders`
--

CREATE TABLE `kds_orders` (
  `id` int(11) NOT NULL,
  `ticket_name` varchar(120) DEFAULT NULL,
  `customer` varchar(150) DEFAULT NULL,
  `status` enum('new','in-progress','ready','done') DEFAULT 'new',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `kds_order_items`
--

CREATE TABLE `kds_order_items` (
  `id` int(11) NOT NULL,
  `kds_order_id` int(11) NOT NULL,
  `item_name` varchar(150) NOT NULL,
  `icon` varchar(20) DEFAULT NULL,
  `mods` text DEFAULT NULL,
  `done` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `members`
--

CREATE TABLE `members` (
  `id` int(11) NOT NULL,
  `member_code` varchar(30) NOT NULL,
  `name` varchar(150) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `tier` enum('Walk-in','Silver','Gold','Platinum') DEFAULT 'Walk-in',
  `points` int(11) DEFAULT 0,
  `visits` int(11) DEFAULT 0,
  `total_spent` decimal(12,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `modifier_groups`
--

CREATE TABLE `modifier_groups` (
  `id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `type` enum('single','multi') DEFAULT 'multi',
  `required_field` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `modifier_options`
--

CREATE TABLE `modifier_options` (
  `id` int(11) NOT NULL,
  `modifier_group_id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `price` decimal(12,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pending_carts`
--

CREATE TABLE `pending_carts` (
  `id` int(11) NOT NULL,
  `cart_code` varchar(100) NOT NULL,
  `customer` varchar(150) DEFAULT 'Walk-in',
  `cashier_id` int(11) NOT NULL,
  `shift_id` int(11) DEFAULT NULL,
  `subtotal` decimal(12,2) DEFAULT 0.00,
  `discount` decimal(12,2) DEFAULT 0.00,
  `loyalty_discount` decimal(12,2) DEFAULT 0.00,
  `giftcard_discount` decimal(12,2) DEFAULT 0.00,
  `tax` decimal(12,2) DEFAULT 0.00,
  `total` decimal(12,2) DEFAULT 0.00,
  `currency` varchar(10) DEFAULT 'NGN',
  `status` enum('pending','checked_out','cancelled') DEFAULT 'pending',
  `note` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pending_carts`
--

INSERT INTO `pending_carts` (`id`, `cart_code`, `customer`, `cashier_id`, `shift_id`, `subtotal`, `discount`, `loyalty_discount`, `giftcard_discount`, `tax`, `total`, `currency`, `status`, `note`, `created_at`, `updated_at`) VALUES
(2, 'PEND-1773246746989', 'Walk-in', 2, NULL, 2000.00, 0.00, 0.00, 0.00, 200.00, 2200.00, 'NGN', 'checked_out', 'mr sam ', '2026-03-11 09:32:27', '2026-03-11 09:33:35'),
(3, 'PEND-1773964375406', 'Walk-in', 2, NULL, 100.00, 0.00, 0.00, 0.00, 10.00, 110.00, 'NGN', 'checked_out', NULL, '2026-03-19 16:52:55', '2026-03-19 16:57:30'),
(4, 'PEND-1773968002056', 'Walk-in', 2, NULL, 100.00, 0.00, 0.00, 0.00, 10.00, 110.00, 'NGN', 'checked_out', NULL, '2026-03-19 17:53:22', '2026-03-19 17:54:55'),
(7, 'PEND-1775831157224', 'Walk-in', 2, NULL, 300.00, 0.00, 0.00, 0.00, 30.00, 330.00, 'NGN', 'checked_out', NULL, '2026-04-10 07:25:57', '2026-04-10 07:26:10');

-- --------------------------------------------------------

--
-- Table structure for table `pending_cart_items`
--

CREATE TABLE `pending_cart_items` (
  `id` int(11) NOT NULL,
  `pending_cart_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `item_name` varchar(255) NOT NULL,
  `icon` varchar(255) DEFAULT NULL,
  `item_type` enum('fixed','timed') DEFAULT 'fixed',
  `qty` int(11) DEFAULT 1,
  `unit_price` decimal(12,2) DEFAULT 0.00,
  `cost` decimal(12,2) DEFAULT 0.00,
  `item_discount_pct` decimal(10,2) DEFAULT 0.00,
  `session_start` datetime DEFAULT NULL,
  `session_end` datetime DEFAULT NULL,
  `elapsed_seconds` int(11) DEFAULT 0,
  `final_price` decimal(12,2) DEFAULT 0.00,
  `manage_stock` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pending_cart_items`
--

INSERT INTO `pending_cart_items` (`id`, `pending_cart_id`, `product_id`, `item_name`, `icon`, `item_type`, `qty`, `unit_price`, `cost`, `item_discount_pct`, `session_start`, `session_end`, `elapsed_seconds`, `final_price`, `manage_stock`, `created_at`, `updated_at`) VALUES
(2, 2, 1, ' Snooker Table', '🎱', 'timed', 1, 1000.00, 0.00, 0.00, '2026-03-11 09:23:46', NULL, 542, 500.00, 0, '2026-03-11 09:32:54', '2026-03-11 09:32:54'),
(3, 2, 1, ' Snooker Table', '🎱', 'timed', 1, 1000.00, 0.00, 0.00, '2026-03-11 09:32:48', NULL, 0, 500.00, 0, '2026-03-11 09:32:54', '2026-03-11 09:32:54'),
(4, 2, 1, ' Snooker Table', '🎱', 'timed', 1, 1000.00, 0.00, 0.00, '2026-03-11 09:32:48', NULL, 0, 500.00, 0, '2026-03-11 09:32:54', '2026-03-11 09:32:54'),
(5, 2, 1, ' Snooker Table', '🎱', 'timed', 1, 1000.00, 0.00, 0.00, '2026-03-11 09:32:48', NULL, 0, 500.00, 0, '2026-03-11 09:32:54', '2026-03-11 09:32:54'),
(6, 3, 2, 'rice', '📦', 'fixed', 1, 100.00, 2000.00, 0.00, NULL, NULL, 0, 100.00, 1, '2026-03-19 16:52:55', '2026-03-19 16:52:55'),
(7, 4, 2, 'rice', '📦', 'fixed', 1, 100.00, 2000.00, 0.00, NULL, NULL, 0, 100.00, 1, '2026-03-19 17:53:22', '2026-03-19 17:53:22'),
(12, 7, 2, 'rice', '📦', 'fixed', 2, 100.00, 2000.00, 0.00, NULL, NULL, 0, 200.00, 1, '2026-04-10 07:26:10', '2026-04-10 07:26:10'),
(13, 7, 3, 'meat', '📦', 'fixed', 1, 100.00, 2000.00, 0.00, NULL, NULL, 0, 100.00, 1, '2026-04-10 07:26:10', '2026-04-10 07:26:10');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `icon` varchar(20) DEFAULT '?',
  `category_id` int(11) DEFAULT NULL,
  `type` enum('timed','fixed','food','gear') NOT NULL DEFAULT 'fixed',
  `hourly_rate` decimal(12,2) DEFAULT 0.00,
  `price` decimal(12,2) DEFAULT 0.00,
  `cost` decimal(12,2) DEFAULT 0.00,
  `stock` int(11) DEFAULT NULL,
  `low_stock` int(11) NOT NULL DEFAULT 5,
  `modifier_group_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_unlimited` tinyint(1) NOT NULL DEFAULT 0,
  `consumable_type` enum('food','drink','other') DEFAULT NULL,
  `has_expiry` tinyint(1) NOT NULL DEFAULT 0,
  `expiry_date` date DEFAULT NULL,
  `shelf_life_days` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `name`, `icon`, `category_id`, `type`, `hourly_rate`, `price`, `cost`, `stock`, `low_stock`, `modifier_group_id`, `is_active`, `created_at`, `is_unlimited`, `consumable_type`, `has_expiry`, `expiry_date`, `shelf_life_days`) VALUES
(1, ' Snooker Table', '🎱', 1, 'timed', 1000.00, 0.00, 0.00, NULL, 0, NULL, 1, '2026-03-10 12:21:19', 1, NULL, 0, NULL, NULL),
(2, 'rice', '📦', 5, 'fixed', 0.00, 100.00, 2000.00, 0, 5, NULL, 1, '2026-03-16 15:36:26', 0, 'food', 1, '2026-04-07', 4),
(3, 'meat', '📦', 5, 'food', 0.00, 100.00, 2000.00, 0, 5, NULL, 1, '2026-03-16 15:36:26', 0, 'food', 1, '2026-04-07', 4);

-- --------------------------------------------------------

--
-- Table structure for table `purchase_orders`
--

CREATE TABLE `purchase_orders` (
  `id` int(11) NOT NULL,
  `po_code` varchar(80) NOT NULL,
  `supplier` varchar(150) NOT NULL,
  `total_amount` decimal(12,2) DEFAULT 0.00,
  `status` enum('pending','received','cancelled') DEFAULT 'pending',
  `created_by` int(11) NOT NULL,
  `received_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `received_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_order_items`
--

CREATE TABLE `purchase_order_items` (
  `id` int(11) NOT NULL,
  `purchase_order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `qty` int(11) NOT NULL,
  `cost` decimal(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales`
--

CREATE TABLE `sales` (
  `id` int(11) NOT NULL,
  `sale_code` varchar(50) NOT NULL,
  `customer` varchar(150) DEFAULT 'Walk-in',
  `cashier_id` int(11) NOT NULL,
  `shift_id` int(11) DEFAULT NULL,
  `subtotal` decimal(12,2) DEFAULT 0.00,
  `discount` decimal(12,2) DEFAULT 0.00,
  `loyalty_discount` decimal(12,2) DEFAULT 0.00,
  `giftcard_discount` decimal(12,2) DEFAULT 0.00,
  `tax` decimal(12,2) DEFAULT 0.00,
  `total` decimal(12,2) DEFAULT 0.00,
  `payment_method` varchar(50) NOT NULL,
  `currency` varchar(10) DEFAULT 'NGN',
  `status` enum('completed','refunded') DEFAULT 'completed',
  `refund_reason` text DEFAULT NULL,
  `sale_date` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sales`
--

INSERT INTO `sales` (`id`, `sale_code`, `customer`, `cashier_id`, `shift_id`, `subtotal`, `discount`, `loyalty_discount`, `giftcard_discount`, `tax`, `total`, `payment_method`, `currency`, `status`, `refund_reason`, `sale_date`) VALUES
(1, 'SALE-1773246815739', 'Walk-in', 2, NULL, 2000.00, 0.00, 0.00, 0.00, 200.00, 2200.00, 'card', 'NGN', 'completed', NULL, '2026-03-11 09:33:35'),
(2, 'SALE-1773964650505', 'Walk-in', 2, NULL, 100.00, 0.00, 0.00, 0.00, 10.00, 110.00, 'card', 'NGN', 'completed', NULL, '2026-03-19 16:57:30'),
(3, 'SALE-1773968095077', 'Walk-in', 2, NULL, 100.00, 0.00, 0.00, 0.00, 10.00, 110.00, 'transfer', 'NGN', 'refunded', 'test', '2026-03-19 17:54:55'),
(4, 'SALE-1775831111681', 'Walk-in', 2, NULL, 200.00, 0.00, 0.00, 0.00, 20.00, 220.00, 'card', 'NGN', 'completed', NULL, '2026-04-10 07:25:11'),
(5, 'SALE-1775831170911', 'Walk-in', 2, NULL, 300.00, 0.00, 0.00, 0.00, 30.00, 330.00, 'card', 'NGN', 'completed', NULL, '2026-04-10 07:26:10');

-- --------------------------------------------------------

--
-- Table structure for table `sale_items`
--

CREATE TABLE `sale_items` (
  `id` int(11) NOT NULL,
  `sale_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `item_name` varchar(150) NOT NULL,
  `icon` varchar(20) DEFAULT NULL,
  `item_type` varchar(50) DEFAULT NULL,
  `qty` int(11) DEFAULT 1,
  `unit_price` decimal(12,2) DEFAULT 0.00,
  `cost` decimal(12,2) DEFAULT 0.00,
  `item_discount_pct` decimal(10,2) DEFAULT 0.00,
  `session_start` datetime DEFAULT NULL,
  `session_end` datetime DEFAULT NULL,
  `elapsed_seconds` int(11) DEFAULT 0,
  `final_price` decimal(12,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sale_items`
--

INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `item_name`, `icon`, `item_type`, `qty`, `unit_price`, `cost`, `item_discount_pct`, `session_start`, `session_end`, `elapsed_seconds`, `final_price`) VALUES
(1, 1, 1, ' Snooker Table', '🎱', 'timed', 1, 1000.00, 0.00, 0.00, '2026-03-11 09:23:46', NULL, 542, 500.00),
(2, 1, 1, ' Snooker Table', '🎱', 'timed', 1, 1000.00, 0.00, 0.00, '2026-03-11 09:32:48', NULL, 0, 500.00),
(3, 1, 1, ' Snooker Table', '🎱', 'timed', 1, 1000.00, 0.00, 0.00, '2026-03-11 09:32:48', NULL, 0, 500.00),
(4, 1, 1, ' Snooker Table', '🎱', 'timed', 1, 1000.00, 0.00, 0.00, '2026-03-11 09:32:48', NULL, 0, 500.00),
(5, 2, 2, 'rice', '📦', 'fixed', 1, 100.00, 2000.00, 0.00, NULL, NULL, 0, 100.00),
(6, 3, 2, 'rice', '📦', 'fixed', 1, 100.00, 2000.00, 0.00, NULL, NULL, 0, 100.00),
(7, 4, 2, 'rice', '📦', 'fixed', 1, 100.00, 2000.00, 0.00, NULL, NULL, 0, 100.00),
(8, 4, 3, 'meat', '📦', 'fixed', 1, 100.00, 2000.00, 0.00, NULL, NULL, 0, 100.00),
(9, 5, 2, 'rice', '📦', 'fixed', 2, 100.00, 2000.00, 0.00, NULL, NULL, 0, 200.00),
(10, 5, 3, 'meat', '📦', 'fixed', 1, 100.00, 2000.00, 0.00, NULL, NULL, 0, 100.00);

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL,
  `currency` varchar(10) DEFAULT 'NGN',
  `tax_rate` decimal(10,2) DEFAULT 10.00,
  `biz_name` varchar(150) DEFAULT 'Arena Pro Game Center',
  `biz_addr` varchar(255) DEFAULT '123 Game Street, Lagos',
  `biz_phone` varchar(50) DEFAULT '+234 800 000 0000',
  `footer` text DEFAULT NULL,
  `low_stock` int(11) DEFAULT 5,
  `loyalty_earn_rate` decimal(10,2) DEFAULT 1.00,
  `loyalty_redeem_rate` decimal(10,2) DEFAULT 100.00,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expiry_alert_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `expiry_alert_days` int(11) NOT NULL DEFAULT 7
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `currency`, `tax_rate`, `biz_name`, `biz_addr`, `biz_phone`, `footer`, `low_stock`, `loyalty_earn_rate`, `loyalty_redeem_rate`, `updated_at`, `expiry_alert_enabled`, `expiry_alert_days`) VALUES
(1, 'NGN', 10.00, 'Arena Pro Game Center', '123 Game Street, Lagos', '+234 800 000 0000', 'Thank you for playing at Arena Pro!', 5, 1.00, 100.00, '2026-03-09 22:56:44', 1, 7);

-- --------------------------------------------------------

--
-- Table structure for table `shifts`
--

CREATE TABLE `shifts` (
  `id` int(11) NOT NULL,
  `shift_code` varchar(50) NOT NULL,
  `opened_by` int(11) NOT NULL,
  `open_time` datetime NOT NULL,
  `opening_float` decimal(12,2) DEFAULT 0.00,
  `open_note` text DEFAULT NULL,
  `closed_by` int(11) DEFAULT NULL,
  `closed_time` datetime DEFAULT NULL,
  `closing_cash` decimal(12,2) DEFAULT 0.00,
  `closing_note` text DEFAULT NULL,
  `status` enum('open','closed') DEFAULT 'open'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_history`
--

CREATE TABLE `stock_history` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `before_qty` int(11) NOT NULL,
  `after_qty` int(11) NOT NULL,
  `change_qty` int(11) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `by_user_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stock_history`
--

INSERT INTO `stock_history` (`id`, `product_id`, `before_qty`, `after_qty`, `change_qty`, `reason`, `by_user_id`, `created_at`) VALUES
(1, 2, 0, 1, 1, 'new items', 2, '2026-03-19 04:05:30'),
(2, 2, 10, 9, -1, 'Sale #2', 2, '2026-03-19 16:57:30'),
(3, 2, 9, 8, -1, 'Sale #3', 2, '2026-03-19 17:54:55'),
(4, 2, 8, 6, -2, 'Moved stock from store to warehouse', 2, '2026-03-21 03:05:37'),
(5, 2, 6, 7, 1, 'low on stock', 2, '2026-03-21 03:26:23'),
(6, 2, 2, 3, 1, 'Refund sale #3: test', 2, '2026-04-10 04:01:00'),
(7, 2, 3, 2, -1, 'Sale #4', 2, '2026-04-10 07:25:11'),
(8, 3, 2, 1, -1, 'Sale #4', 2, '2026-04-10 07:25:11'),
(9, 2, 2, 0, -2, 'Sale #5', 2, '2026-04-10 07:26:10'),
(10, 3, 1, 0, -1, 'Sale #5', 2, '2026-04-10 07:26:10');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `avatar` varchar(20) DEFAULT '?',
  `role` enum('admin','manager','cashier','viewer') NOT NULL DEFAULT 'cashier',
  `pin_hash` varchar(255) NOT NULL,
  `total_hours` decimal(10,2) DEFAULT 0.00,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `avatar`, `role`, `pin_hash`, `total_hours`, `is_active`, `created_at`, `updated_at`) VALUES
(2, 'Admin', 'admin@admin.com', '👤', 'admin', '$2b$10$w2Jm51Z5KwAJGV9CEaunu.NaZaHLrkDvCEE5ZGcM90wQn814zrMsm', 0.00, 1, '2026-03-10 00:55:13', '2026-03-09 20:02:17'),
(3, 'manager', 'md@gmail.com', '👤', 'manager', '$2b$10$w2Jm51Z5KwAJGV9CEaunu.NaZaHLrkDvCEE5ZGcM90wQn814zrMsm', 0.00, 1, '2026-03-10 00:55:13', '2026-03-09 20:02:17'),
(4, 'cashier', 'cash@gmail.com', '👤', 'cashier', '$2b$10$w2Jm51Z5KwAJGV9CEaunu.NaZaHLrkDvCEE5ZGcM90wQn814zrMsm', 0.00, 1, '2026-03-10 00:55:13', '2026-03-09 20:02:17'),
(5, 'viewer', 'viewer@gmail.com', '👤', 'viewer', '$2b$10$w2Jm51Z5KwAJGV9CEaunu.NaZaHLrkDvCEE5ZGcM90wQn814zrMsm', 0.00, 1, '2026-03-10 00:55:13', '2026-03-21 03:33:48'),
(6, 'user', NULL, '👤', 'cashier', '$2b$10$vInvPx3MuugwBnQEzkhjsuOP6hgi6ciDzoPF8CS7y88Sf7s4/dkHy', 0.00, 1, '2026-03-10 11:11:07', '2026-03-10 04:11:07');

-- --------------------------------------------------------

--
-- Table structure for table `user_permissions`
--

CREATE TABLE `user_permissions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `pos` tinyint(1) DEFAULT 0,
  `courts` tinyint(1) DEFAULT 0,
  `inventory` tinyint(1) DEFAULT 0,
  `sales` tinyint(1) DEFAULT 0,
  `members` tinyint(1) DEFAULT 0,
  `users` tinyint(1) DEFAULT 0,
  `settings` tinyint(1) DEFAULT 0,
  `stockAdj` tinyint(1) DEFAULT 0,
  `refunds` tinyint(1) DEFAULT 0,
  `shifts` tinyint(1) DEFAULT 0,
  `purchaseOrders` tinyint(1) DEFAULT 0,
  `analytics` tinyint(1) DEFAULT 0,
  `kds` tinyint(1) DEFAULT 0,
  `giftCards` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_permissions`
--

INSERT INTO `user_permissions` (`id`, `user_id`, `pos`, `courts`, `inventory`, `sales`, `members`, `users`, `settings`, `stockAdj`, `refunds`, `shifts`, `purchaseOrders`, `analytics`, `kds`, `giftCards`) VALUES
(2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1),
(3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
(4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
(5, 5, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
(6, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `warehouse_history`
--

CREATE TABLE `warehouse_history` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `movement_type` enum('add','remove','transfer_to_store','transfer_from_store','adjust') NOT NULL,
  `before_qty` int(11) NOT NULL DEFAULT 0,
  `change_qty` int(11) NOT NULL,
  `after_qty` int(11) NOT NULL DEFAULT 0,
  `reason` varchar(255) DEFAULT NULL,
  `by_user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `warehouse_history`
--

INSERT INTO `warehouse_history` (`id`, `product_id`, `movement_type`, `before_qty`, `change_qty`, `after_qty`, `reason`, `by_user_id`, `created_at`) VALUES
(1, 2, 'add', 0, 60, 60, 'new goods', 2, '2026-03-21 10:04:59'),
(2, 2, 'transfer_from_store', 60, 2, 62, 'Transferred stock from store to warehouse', 2, '2026-03-21 10:05:37'),
(3, 2, 'add', 62, 10, 72, 'new', 2, '2026-03-21 10:18:05'),
(4, 2, 'transfer_to_store', 72, -1, 71, 'low on stock', 2, '2026-03-21 10:26:23');

-- --------------------------------------------------------

--
-- Table structure for table `warehouse_stock`
--

CREATE TABLE `warehouse_stock` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `qty` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `warehouse_stock`
--

INSERT INTO `warehouse_stock` (`id`, `product_id`, `qty`, `created_at`, `updated_at`) VALUES
(1, 2, 71, '2026-03-21 10:04:59', '2026-03-21 10:26:23');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `clock_events`
--
ALTER TABLE `clock_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `courts`
--
ALTER TABLE `courts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `linked_product_id` (`linked_product_id`);

--
-- Indexes for table `gift_cards`
--
ALTER TABLE `gift_cards`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `kds_orders`
--
ALTER TABLE `kds_orders`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `kds_order_items`
--
ALTER TABLE `kds_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `kds_order_id` (`kds_order_id`);

--
-- Indexes for table `members`
--
ALTER TABLE `members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `member_code` (`member_code`);

--
-- Indexes for table `modifier_groups`
--
ALTER TABLE `modifier_groups`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `modifier_options`
--
ALTER TABLE `modifier_options`
  ADD PRIMARY KEY (`id`),
  ADD KEY `modifier_group_id` (`modifier_group_id`);

--
-- Indexes for table `pending_carts`
--
ALTER TABLE `pending_carts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cart_code` (`cart_code`),
  ADD KEY `cashier_id` (`cashier_id`),
  ADD KEY `shift_id` (`shift_id`);

--
-- Indexes for table `pending_cart_items`
--
ALTER TABLE `pending_cart_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `pending_cart_id` (`pending_cart_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `po_code` (`po_code`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `received_by` (`received_by`);

--
-- Indexes for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `purchase_order_id` (`purchase_order_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `sales`
--
ALTER TABLE `sales`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sale_code` (`sale_code`),
  ADD KEY `cashier_id` (`cashier_id`),
  ADD KEY `shift_id` (`shift_id`);

--
-- Indexes for table `sale_items`
--
ALTER TABLE `sale_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sale_id` (`sale_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `shifts`
--
ALTER TABLE `shifts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `shift_code` (`shift_code`),
  ADD KEY `opened_by` (`opened_by`),
  ADD KEY `closed_by` (`closed_by`);

--
-- Indexes for table `stock_history`
--
ALTER TABLE `stock_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `by_user_id` (`by_user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_permissions`
--
ALTER TABLE `user_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `warehouse_history`
--
ALTER TABLE `warehouse_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `by_user_id` (`by_user_id`);

--
-- Indexes for table `warehouse_stock`
--
ALTER TABLE `warehouse_stock`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `product_id` (`product_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `clock_events`
--
ALTER TABLE `clock_events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `courts`
--
ALTER TABLE `courts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `gift_cards`
--
ALTER TABLE `gift_cards`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `kds_orders`
--
ALTER TABLE `kds_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `kds_order_items`
--
ALTER TABLE `kds_order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `members`
--
ALTER TABLE `members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `modifier_groups`
--
ALTER TABLE `modifier_groups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `modifier_options`
--
ALTER TABLE `modifier_options`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pending_carts`
--
ALTER TABLE `pending_carts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `pending_cart_items`
--
ALTER TABLE `pending_cart_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales`
--
ALTER TABLE `sales`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `sale_items`
--
ALTER TABLE `sale_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `shifts`
--
ALTER TABLE `shifts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_history`
--
ALTER TABLE `stock_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `user_permissions`
--
ALTER TABLE `user_permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `warehouse_history`
--
ALTER TABLE `warehouse_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `warehouse_stock`
--
ALTER TABLE `warehouse_stock`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `clock_events`
--
ALTER TABLE `clock_events`
  ADD CONSTRAINT `clock_events_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `courts`
--
ALTER TABLE `courts`
  ADD CONSTRAINT `courts_ibfk_1` FOREIGN KEY (`linked_product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `kds_order_items`
--
ALTER TABLE `kds_order_items`
  ADD CONSTRAINT `kds_order_items_ibfk_1` FOREIGN KEY (`kds_order_id`) REFERENCES `kds_orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `modifier_options`
--
ALTER TABLE `modifier_options`
  ADD CONSTRAINT `modifier_options_ibfk_1` FOREIGN KEY (`modifier_group_id`) REFERENCES `modifier_groups` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pending_carts`
--
ALTER TABLE `pending_carts`
  ADD CONSTRAINT `pending_carts_ibfk_1` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `pending_carts_ibfk_2` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `pending_cart_items`
--
ALTER TABLE `pending_cart_items`
  ADD CONSTRAINT `pending_cart_items_ibfk_1` FOREIGN KEY (`pending_cart_id`) REFERENCES `pending_carts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `pending_cart_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD CONSTRAINT `purchase_order_items_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Constraints for table `sales`
--
ALTER TABLE `sales`
  ADD CONSTRAINT `sales_ibfk_1` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `sales_ibfk_2` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `sale_items`
--
ALTER TABLE `sale_items`
  ADD CONSTRAINT `sale_items_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `sale_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `shifts`
--
ALTER TABLE `shifts`
  ADD CONSTRAINT `shifts_ibfk_1` FOREIGN KEY (`opened_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `shifts_ibfk_2` FOREIGN KEY (`closed_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `stock_history`
--
ALTER TABLE `stock_history`
  ADD CONSTRAINT `stock_history_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `stock_history_ibfk_2` FOREIGN KEY (`by_user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `user_permissions`
--
ALTER TABLE `user_permissions`
  ADD CONSTRAINT `user_permissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `warehouse_history`
--
ALTER TABLE `warehouse_history`
  ADD CONSTRAINT `warehouse_history_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `warehouse_history_ibfk_2` FOREIGN KEY (`by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `warehouse_stock`
--
ALTER TABLE `warehouse_stock`
  ADD CONSTRAINT `warehouse_stock_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
