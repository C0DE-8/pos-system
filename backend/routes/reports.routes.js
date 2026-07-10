const express = require("express");
const { query } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");
const { ensureBusinessContext, isAdmin } = require("../utils/tenant");

const router = express.Router();
router.use(authenticateToken);

function dateRangeFromQuery(q = {}) {
  const now = new Date();
  const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
  const today = now.toISOString().slice(0, 10);

  const parseDateInput = (value) => {
    if (!value || typeof value !== "string") return null;
    const trimmed = value.trim();
    return dateOnlyRegex.test(trimmed) ? trimmed : null;
  };

  const startFromQuery = parseDateInput(q.start);
  const endFromQuery = parseDateInput(q.end);

  // Prefer explicit calendar date inputs when both are provided.
  if (startFromQuery && endFromQuery) {
    const [startDate, endDate] = startFromQuery <= endFromQuery
      ? [startFromQuery, endFromQuery]
      : [endFromQuery, startFromQuery];
    return { start: `${startDate} 00:00:00`, end: `${endDate} 23:59:59` };
  }

  if (q.range === "today") {
    return { start: `${today} 00:00:00`, end: `${today} 23:59:59` };
  }
  if (q.range === "7d") {
    const start = new Date(now.getTime() - 6 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    return { start: `${start} 00:00:00`, end: `${today} 23:59:59` };
  }
  if (q.range === "30d") {
    const start = new Date(now.getTime() - 29 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    return { start: `${start} 00:00:00`, end: `${today} 23:59:59` };
  }

  const fallbackStart = startFromQuery || endFromQuery || today;
  const fallbackEnd = endFromQuery || startFromQuery || today;
  const [startDate, endDate] = fallbackStart <= fallbackEnd
    ? [fallbackStart, fallbackEnd]
    : [fallbackEnd, fallbackStart];

  return { start: `${startDate} 00:00:00`, end: `${endDate} 23:59:59` };
}

function branchFilterSql(branchId) {
  return branchId ? { sql: " AND branch_id = ? ", params: [branchId] } : { sql: "", params: [] };
}

function aliasedBranchFilterSql(alias, branchId) {
  return branchId
    ? { sql: ` AND ${alias}.branch_id = ? `, params: [branchId] }
    : { sql: "", params: [] };
}

function requireAdminUser(req, res) {
  if (isAdmin(req.user)) return true;

  res.status(403).json({
    success: false,
    message: "Advanced analytics is available to admin users only"
  });
  return false;
}

router.get("/dashboard", requirePermission("analytics"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { start, end } = dateRangeFromQuery(req.query);
    const b = branchFilterSql(req.query.branch_id || req.user.branch_id);
    const scope = [req.user.business_id, start, end, ...b.params];
    const summary = await query(
      `SELECT
        COALESCE(SUM(total), 0) AS total_sales_amount,
        COUNT(*) AS total_orders_count,
        COALESCE(AVG(total), 0) AS average_order_value,
        COALESCE(SUM(CASE WHEN status='refunded' THEN total ELSE 0 END), 0) AS refunded_amount,
        COALESCE(SUM(discount + loyalty_discount + giftcard_discount), 0) AS discounts_total,
        COALESCE(SUM(tax), 0) AS tax_total
       FROM sales
       WHERE business_id = ? AND sale_date BETWEEN ? AND ? ${b.sql}`,
      scope
    );
    const paymentMethods = await query(
      `SELECT payment_method, COUNT(*) AS count, COALESCE(SUM(total),0) AS total
       FROM sales
       WHERE business_id = ? AND sale_date BETWEEN ? AND ? ${b.sql}
       GROUP BY payment_method
       ORDER BY total DESC`,
      scope
    );
    const topItems = await query(
      `SELECT si.item_name, SUM(si.qty) AS qty, SUM(si.final_price) AS revenue
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.business_id = ? AND s.sale_date BETWEEN ? AND ? ${b.sql.replace(/branch_id/g, "s.branch_id")}
       GROUP BY si.item_name
       ORDER BY qty DESC
       LIMIT 10`,
      scope
    );
    const lowStock = await query(
      `SELECT id, name, stock, low_stock
       FROM products
       WHERE business_id = ? AND is_active = 1 AND is_unlimited = 0 AND stock <= low_stock
       ORDER BY stock ASC
       LIMIT 10`,
      [req.user.business_id]
    );
    const pendingCustomerOrders = await query(
      `SELECT COUNT(*) AS count
       FROM customer_orders
       WHERE business_id = ? AND fulfillment_status IN ('pending','confirmed','preparing') ${b.sql}`,
      [req.user.business_id, ...b.params]
    );
    const readyKds = await query(
      `SELECT COUNT(*) AS count
       FROM kds_orders
       WHERE business_id = ? AND status = 'ready' ${b.sql}`,
      [req.user.business_id, ...b.params]
    );
    const activeCashiers = await query(
      `SELECT COUNT(DISTINCT cashier_id) AS count
       FROM sales
       WHERE business_id = ? AND sale_date BETWEEN ? AND ? ${b.sql}`,
      scope
    );

    res.json({
      success: true,
      data: {
        ...summary[0],
        top_payment_methods: paymentMethods,
        active_cashiers_count: activeCashiers[0]?.count || 0,
        new_customers_count: 0,
        top_selling_items: topItems,
        low_stock_items: lowStock,
        pending_customer_orders_count: pendingCustomerOrders[0]?.count || 0,
        ready_kds_orders_count: readyKds[0]?.count || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/sales-trends", requirePermission("analytics"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { start, end } = dateRangeFromQuery(req.query);
    const groupMap = { day: "%Y-%m-%d", week: "%x-%v", month: "%Y-%m" };
    const groupFmt = groupMap[req.query.group_by] || groupMap.day;
    const b = branchFilterSql(req.query.branch_id || req.user.branch_id);
    const rows = await query(
      `SELECT DATE_FORMAT(sale_date, '${groupFmt}') AS bucket,
              COALESCE(SUM(total),0) AS gross_sales,
              COALESCE(SUM(CASE WHEN status='refunded' THEN 0 ELSE total END),0) AS net_sales,
              COALESCE(SUM(CASE WHEN status='refunded' THEN total ELSE 0 END),0) AS refunds,
              COUNT(*) AS order_count,
              COALESCE(AVG(total),0) AS average_order_value
       FROM sales
       WHERE business_id = ? AND sale_date BETWEEN ? AND ? ${b.sql}
       GROUP BY bucket
       ORDER BY bucket ASC`,
      [req.user.business_id, start, end, ...b.params]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/products", requirePermission("analytics"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { start, end } = dateRangeFromQuery(req.query);
    const requestedLimit = Number(req.query.limit || 20);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(Math.floor(requestedLimit), 500)
      : 20;
    const branchId = req.query.branch_id || req.user.branch_id;
    const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const productBranchSql = branchId ? "AND p.branch_id = ?" : "";
    const salesBranchSql = branchId ? "AND s.branch_id = ?" : "";

    const products = await query(
      `SELECT
         p.id AS product_id,
         p.name AS item_name,
         p.price,
         p.cost,
         p.stock,
         p.low_stock,
         p.is_unlimited,
         c.name AS category_name,
         COALESCE(sold.qty, 0) AS qty,
         COALESCE(sold.revenue, 0) AS revenue,
         COALESCE(sold.avg_cost, p.cost, 0) AS avg_cost,
         COALESCE(sold.order_count, 0) AS order_count,
         sold.last_sold_at
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN (
         SELECT
           si.product_id,
           SUM(si.qty) AS qty,
           SUM(si.final_price) AS revenue,
           AVG(si.cost) AS avg_cost,
           COUNT(DISTINCT s.id) AS order_count,
           MAX(s.sale_date) AS last_sold_at
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         WHERE s.business_id = ? AND s.sale_date BETWEEN ? AND ? ${salesBranchSql}
         GROUP BY si.product_id
       ) sold ON sold.product_id = p.id
       WHERE p.business_id = ? AND p.is_active = 1 ${productBranchSql}
       ORDER BY revenue DESC, qty DESC, p.name ASC`,
      [
        req.user.business_id,
        start,
        end,
        ...(branchId ? [branchId] : []),
        req.user.business_id,
        ...(branchId ? [branchId] : [])
      ]
    );

    const rankedProducts = products.map((product, index) => ({
      ...product,
      rank: index + 1
    }));
    const normalizedSearch = search.toLowerCase();
    const filteredProducts = normalizedSearch
      ? rankedProducts.filter((product) => {
          const name = String(product.item_name || "").toLowerCase();
          const category = String(product.category_name || "").toLowerCase();
          return name.includes(normalizedSearch) || category.includes(normalizedSearch);
        })
      : rankedProducts;

    res.json({
      success: true,
      data: {
        top_products: filteredProducts.slice(0, limit),
        products: filteredProducts,
        total_count: filteredProducts.length,
        total_products_count: rankedProducts.length,
        query: search
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/cashiers", requirePermission("analytics"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { start, end } = dateRangeFromQuery(req.query);
    const b = branchFilterSql(req.query.branch_id || req.user.branch_id);
    const rows = await query(
      `SELECT u.id AS cashier_id, u.name,
              COALESCE(SUM(s.total),0) AS sales_total,
              COUNT(s.id) AS transaction_count,
              COALESCE(AVG(s.total),0) AS average_basket_size,
              SUM(CASE WHEN s.status='refunded' THEN 1 ELSE 0 END) AS refund_count
       FROM sales s
       JOIN users u ON u.id = s.cashier_id
       WHERE s.business_id = ? AND s.sale_date BETWEEN ? AND ? ${b.sql.replace(/branch_id/g, "s.branch_id")}
       GROUP BY u.id, u.name
       ORDER BY sales_total DESC`,
      [req.user.business_id, start, end, ...b.params]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/inventory", requirePermission("analytics"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const branchId = req.query.branch_id || req.user.branch_id;
    const products = await query(
      `SELECT id, name, stock, low_stock, is_unlimited
       FROM products
       WHERE business_id = ? ${branchId ? "AND branch_id = ?" : ""}
       ORDER BY name ASC`,
      branchId ? [req.user.business_id, branchId] : [req.user.business_id]
    );
    const movements = await query(
      `SELECT reason, SUM(change_qty) AS qty_change
       FROM stock_history
       WHERE business_id = ? ${branchId ? "AND branch_id = ?" : ""}
       GROUP BY reason
       ORDER BY qty_change ASC`,
      branchId ? [req.user.business_id, branchId] : [req.user.business_id]
    );
    res.json({ success: true, data: { products, movements } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/customer-orders", requirePermission("analytics"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { start, end } = dateRangeFromQuery(req.query);
    const b = branchFilterSql(req.query.branch_id || req.user.branch_id);
    const status = req.query.status;
    const rows = await query(
      `SELECT *
       FROM customer_orders
       WHERE business_id = ? AND created_at BETWEEN ? AND ? ${b.sql} ${status ? "AND fulfillment_status = ?" : ""}
       ORDER BY id DESC`,
      status
        ? [req.user.business_id, start, end, ...b.params, status]
        : [req.user.business_id, start, end, ...b.params]
    );
    const popular = await query(
      `SELECT item_name, SUM(qty) AS qty
       FROM customer_order_items coi
       JOIN customer_orders co ON co.id = coi.customer_order_id
       WHERE co.business_id = ? AND co.created_at BETWEEN ? AND ? ${b.sql.replace(/branch_id/g, "co.branch_id")}
       GROUP BY item_name ORDER BY qty DESC LIMIT 10`,
      [req.user.business_id, start, end, ...b.params]
    );
    res.json({ success: true, data: { orders: rows, popular_items: popular } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/branches", requirePermission("analytics"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { start, end } = dateRangeFromQuery(req.query);
    const rows = await query(
      `SELECT bb.id AS branch_id, bb.name AS branch_name,
              COALESCE(SUM(s.total),0) AS sales_total,
              COUNT(s.id) AS order_count,
              COALESCE(AVG(s.total),0) AS average_order_value
       FROM business_branches bb
       LEFT JOIN sales s ON s.branch_id = bb.id AND s.business_id = bb.business_id AND s.sale_date BETWEEN ? AND ?
       WHERE bb.business_id = ?
       GROUP BY bb.id, bb.name
       ORDER BY sales_total DESC`,
      [start, end, req.user.business_id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/employee-performance", requirePermission("analytics"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;

    const { start, end } = dateRangeFromQuery(req.query);
    const branchId = isAdmin(req.user) ? req.query.branch_id || "" : req.user.branch_id || "";
    const salesBranch = aliasedBranchFilterSql("s", branchId);
    const walletBranch = aliasedBranchFilterSql("mwt", branchId);
    const pointsBranch = aliasedBranchFilterSql("mpl", branchId);
    const challengeBranch = aliasedBranchFilterSql("mcc", branchId);

    const salesRows = await query(
      `SELECT
         u.id AS user_id,
         u.name,
         u.email,
         u.role,
         COUNT(s.id) AS ticket_count,
         COALESCE(SUM(s.total), 0) AS sales_total,
         COALESCE(AVG(s.total), 0) AS average_ticket_value,
         COALESCE(SUM(s.subtotal), 0) AS subtotal_total,
         COALESCE(SUM(s.membership_discount + s.loyalty_discount + s.giftcard_discount), 0) AS discount_total,
         COALESCE(SUM(s.wallet_payment), 0) AS wallet_payment_total,
         COALESCE(SUM(s.points_earned), 0) AS points_earned_total,
         COALESCE(SUM(s.reward_points_redeemed), 0) AS reward_points_redeemed_total,
         COUNT(DISTINCT s.member_id) AS member_ticket_count,
         COALESCE(SUM(CASE WHEN item_stats.item_qty > 1 OR item_stats.line_count > 1 THEN 1 ELSE 0 END), 0) AS upsell_ticket_count,
         COALESCE(SUM(item_stats.item_qty), 0) AS item_qty_total
       FROM users u
       LEFT JOIN sales s
         ON s.cashier_id = u.id
        AND s.business_id = u.business_id
        AND s.sale_date BETWEEN ? AND ?
        ${branchId ? "AND s.branch_id = ?" : ""}
       LEFT JOIN (
         SELECT sale_id, COALESCE(SUM(qty), 0) AS item_qty, COUNT(*) AS line_count
         FROM sale_items
         GROUP BY sale_id
       ) item_stats ON item_stats.sale_id = s.id
       WHERE u.business_id = ?
       GROUP BY u.id, u.name, u.email, u.role
       ORDER BY sales_total DESC, ticket_count DESC, u.name ASC`,
      [
        start,
        end,
        ...(branchId ? [branchId] : []),
        req.user.business_id
      ]
    );

    const topupRows = await query(
      `SELECT
         mwt.created_by AS user_id,
         COUNT(*) AS wallet_transaction_count,
         SUM(CASE WHEN mwt.transaction_type = 'credit' THEN 1 ELSE 0 END) AS topup_count,
         COALESCE(SUM(CASE WHEN mwt.transaction_type = 'credit' THEN mwt.amount ELSE 0 END), 0) AS topup_total,
         SUM(CASE WHEN mwt.transaction_type = 'debit' THEN 1 ELSE 0 END) AS wallet_debit_count,
         COALESCE(SUM(CASE WHEN mwt.transaction_type = 'debit' THEN mwt.amount ELSE 0 END), 0) AS wallet_debit_total
       FROM member_wallet_transactions mwt
       WHERE mwt.business_id = ?
         AND mwt.created_at BETWEEN ? AND ?
         AND mwt.created_by IS NOT NULL
         ${walletBranch.sql}
       GROUP BY mwt.created_by`,
      [req.user.business_id, start, end, ...walletBranch.params]
    );

    const pointsRows = await query(
      `SELECT
         mpl.created_by AS user_id,
         COUNT(*) AS points_transaction_count,
         COALESCE(SUM(CASE WHEN mpl.transaction_type = 'earn' THEN mpl.points ELSE 0 END), 0) AS points_added,
         COALESCE(SUM(CASE WHEN mpl.transaction_type = 'redeem' THEN mpl.points ELSE 0 END), 0) AS points_redeemed,
         COALESCE(SUM(CASE WHEN mpl.transaction_type = 'adjust' THEN mpl.points ELSE 0 END), 0) AS points_adjusted
       FROM member_points_ledger mpl
       WHERE mpl.business_id = ?
         AND mpl.created_at BETWEEN ? AND ?
         AND mpl.created_by IS NOT NULL
         ${pointsBranch.sql}
       GROUP BY mpl.created_by`,
      [req.user.business_id, start, end, ...pointsBranch.params]
    );

    const challengeRows = await query(
      `SELECT
         mcc.created_by AS user_id,
         COUNT(*) AS challenges_completed
       FROM member_challenge_completions mcc
       WHERE mcc.business_id = ?
         AND mcc.completed_at BETWEEN ? AND ?
         AND mcc.created_by IS NOT NULL
         ${challengeBranch.sql}
       GROUP BY mcc.created_by`,
      [req.user.business_id, start, end, ...challengeBranch.params]
    );

    const topupByUser = new Map(topupRows.map((row) => [Number(row.user_id), row]));
    const pointsByUser = new Map(pointsRows.map((row) => [Number(row.user_id), row]));
    const challengesByUser = new Map(challengeRows.map((row) => [Number(row.user_id), row]));

    const employees = salesRows.map((row) => {
      const userId = Number(row.user_id);
      const topups = topupByUser.get(userId) || {};
      const points = pointsByUser.get(userId) || {};
      const challenges = challengesByUser.get(userId) || {};
      const ticketCount = Number(row.ticket_count || 0);
      const upsellTicketCount = Number(row.upsell_ticket_count || 0);
      const salesTotal = Number(row.sales_total || 0);
      const discountTotal = Number(row.discount_total || 0);
      const memberTicketCount = Number(row.member_ticket_count || 0);

      return {
        ...row,
        ticket_count: ticketCount,
        sales_total: salesTotal,
        average_ticket_value: Number(row.average_ticket_value || 0),
        discount_total: discountTotal,
        wallet_payment_total: Number(row.wallet_payment_total || 0),
        points_earned_total: Number(row.points_earned_total || 0),
        reward_points_redeemed_total: Number(row.reward_points_redeemed_total || 0),
        member_ticket_count: memberTicketCount,
        upsell_ticket_count: upsellTicketCount,
        upsell_rate: ticketCount > 0 ? upsellTicketCount / ticketCount : 0,
        member_attach_rate: ticketCount > 0 ? memberTicketCount / ticketCount : 0,
        discount_rate: salesTotal > 0 ? discountTotal / salesTotal : 0,
        item_qty_total: Number(row.item_qty_total || 0),
        wallet_transaction_count: Number(topups.wallet_transaction_count || 0),
        topup_count: Number(topups.topup_count || 0),
        topup_total: Number(topups.topup_total || 0),
        wallet_debit_count: Number(topups.wallet_debit_count || 0),
        wallet_debit_total: Number(topups.wallet_debit_total || 0),
        points_transaction_count: Number(points.points_transaction_count || 0),
        points_added: Number(points.points_added || 0),
        points_redeemed: Number(points.points_redeemed || 0),
        points_adjusted: Number(points.points_adjusted || 0),
        challenges_completed: Number(challenges.challenges_completed || 0)
      };
    });

    const totals = employees.reduce(
      (acc, employee) => {
        acc.sales_total += employee.sales_total;
        acc.ticket_count += employee.ticket_count;
        acc.upsell_ticket_count += employee.upsell_ticket_count;
        acc.topup_count += employee.topup_count;
        acc.topup_total += employee.topup_total;
        acc.wallet_debit_total += employee.wallet_debit_total;
        acc.points_added += employee.points_added;
        acc.challenges_completed += employee.challenges_completed;
        return acc;
      },
      {
        sales_total: 0,
        ticket_count: 0,
        upsell_ticket_count: 0,
        topup_count: 0,
        topup_total: 0,
        wallet_debit_total: 0,
        points_added: 0,
        challenges_completed: 0
      }
    );

    res.json({
      success: true,
      data: {
        range: { start, end, branch_id: branchId || null },
        totals: {
          ...totals,
          average_ticket_value:
            totals.ticket_count > 0 ? totals.sales_total / totals.ticket_count : 0,
          upsell_rate:
            totals.ticket_count > 0 ? totals.upsell_ticket_count / totals.ticket_count : 0
        },
        employees
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/advanced-dashboard", requirePermission("analytics"), async (req, res) => {
  try {
    if (!requireAdminUser(req, res)) return;
    if (!ensureBusinessContext(req, res)) return;

    const { start, end } = dateRangeFromQuery(req.query);
    const branchId = req.query.branch_id || "";
    const salesBranch = aliasedBranchFilterSql("s", branchId);
    const walletBranch = aliasedBranchFilterSql("mwt", branchId);
    const pointsBranch = aliasedBranchFilterSql("mpl", branchId);
    const orderBranch = aliasedBranchFilterSql("co", branchId);
    const salesScope = [req.user.business_id, start, end, ...salesBranch.params];

    const [
      salesSummary,
      walletUsage,
      walletTrend,
      walletSources,
      categorySales,
      topItems,
      membershipSummary,
      tierActivity,
      memberLeaderboard,
      pointsSummary,
      pointsTrend,
      digitalOrders,
      promotionSignals
    ] = await Promise.all([
      query(
        `SELECT
           COUNT(*) AS order_count,
           COALESCE(SUM(s.subtotal), 0) AS subtotal,
           COALESCE(SUM(s.total), 0) AS total_sales,
           COALESCE(AVG(s.total), 0) AS average_order_value,
           COALESCE(SUM(s.membership_discount), 0) AS membership_discount,
           COALESCE(SUM(s.loyalty_discount), 0) AS loyalty_discount,
           COALESCE(SUM(s.giftcard_discount), 0) AS giftcard_discount,
           COALESCE(SUM(s.wallet_payment), 0) AS wallet_payment,
           COALESCE(SUM(s.reward_points_redeemed), 0) AS reward_points_redeemed,
           COALESCE(SUM(s.points_earned), 0) AS points_earned,
           COUNT(DISTINCT s.member_id) AS purchasing_members
         FROM sales s
         WHERE s.business_id = ? AND s.sale_date BETWEEN ? AND ? ${salesBranch.sql}`,
        salesScope
      ),
      query(
        `SELECT
           COUNT(*) AS transaction_count,
           SUM(CASE WHEN mwt.transaction_type = 'credit' THEN 1 ELSE 0 END) AS credit_count,
           SUM(CASE WHEN mwt.transaction_type = 'debit' THEN 1 ELSE 0 END) AS debit_count,
           COALESCE(SUM(CASE WHEN mwt.transaction_type = 'credit' THEN mwt.amount ELSE 0 END), 0) AS credited_amount,
           COALESCE(SUM(CASE WHEN mwt.transaction_type = 'debit' THEN mwt.amount ELSE 0 END), 0) AS debited_amount,
           COALESCE(AVG(CASE WHEN mwt.transaction_type = 'credit' THEN mwt.amount ELSE NULL END), 0) AS average_topup,
           COUNT(DISTINCT mwt.member_id) AS wallet_members
         FROM member_wallet_transactions mwt
         WHERE mwt.business_id = ? AND mwt.created_at BETWEEN ? AND ? ${walletBranch.sql}`,
        [req.user.business_id, start, end, ...walletBranch.params]
      ),
      query(
        `SELECT
           DATE(mwt.created_at) AS bucket,
           COALESCE(SUM(CASE WHEN mwt.transaction_type = 'credit' THEN mwt.amount ELSE 0 END), 0) AS credits,
           COALESCE(SUM(CASE WHEN mwt.transaction_type = 'debit' THEN mwt.amount ELSE 0 END), 0) AS debits,
           COUNT(*) AS transaction_count
         FROM member_wallet_transactions mwt
         WHERE mwt.business_id = ? AND mwt.created_at BETWEEN ? AND ? ${walletBranch.sql}
         GROUP BY bucket
         ORDER BY bucket ASC`,
        [req.user.business_id, start, end, ...walletBranch.params]
      ),
      query(
        `SELECT
           COALESCE(mwt.source, 'manual') AS source,
           mwt.transaction_type,
           COUNT(*) AS count,
           COALESCE(SUM(mwt.amount), 0) AS amount
         FROM member_wallet_transactions mwt
         WHERE mwt.business_id = ? AND mwt.created_at BETWEEN ? AND ? ${walletBranch.sql}
         GROUP BY source, mwt.transaction_type
         ORDER BY amount DESC`,
        [req.user.business_id, start, end, ...walletBranch.params]
      ),
      query(
        `SELECT
           COALESCE(c.name, si.item_type, 'Uncategorized') AS category_name,
           COALESCE(c.type, si.item_type, 'general') AS category_type,
           COALESCE(SUM(si.qty), 0) AS qty,
           COALESCE(SUM(si.final_price), 0) AS revenue,
           COUNT(DISTINCT s.id) AS order_count,
           COALESCE(AVG(si.item_discount_pct), 0) AS average_item_discount
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         LEFT JOIN products p ON p.id = si.product_id
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE s.business_id = ? AND s.sale_date BETWEEN ? AND ? ${salesBranch.sql}
         GROUP BY category_name, category_type
         ORDER BY revenue DESC
         LIMIT 12`,
        salesScope
      ),
      query(
        `SELECT
           si.item_name,
           COALESCE(c.name, si.item_type, 'Uncategorized') AS category_name,
           COALESCE(SUM(si.qty), 0) AS qty,
           COALESCE(SUM(si.final_price), 0) AS revenue,
           COUNT(DISTINCT s.id) AS order_count
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         LEFT JOIN products p ON p.id = si.product_id
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE s.business_id = ? AND s.sale_date BETWEEN ? AND ? ${salesBranch.sql}
         GROUP BY si.item_name, category_name
         ORDER BY revenue DESC, qty DESC
         LIMIT 10`,
        salesScope
      ),
      query(
        `SELECT
           COUNT(*) AS member_count,
           COUNT(*) AS active_members,
           SUM(CASE WHEN m.created_at BETWEEN ? AND ? THEN 1 ELSE 0 END) AS new_members,
           COALESCE(SUM(m.wallet_balance), 0) AS wallet_liability,
           COALESCE(SUM(m.points), 0) AS outstanding_points,
           COALESCE(SUM(m.lifetime_points), 0) AS lifetime_points
         FROM members m
         WHERE m.business_id = ?`,
        [start, end, req.user.business_id]
      ),
      query(
        `SELECT
           COALESCE(mt.name, m.tier, 'No Tier') AS tier_name,
           COUNT(DISTINCT m.id) AS member_count,
           COUNT(DISTINCT s.id) AS order_count,
           COALESCE(SUM(s.total), 0) AS sales_total,
           COALESCE(SUM(s.membership_discount), 0) AS discount_total,
           COALESCE(SUM(m.wallet_balance), 0) AS wallet_balance,
           COALESCE(SUM(m.points), 0) AS points_balance
         FROM members m
         LEFT JOIN membership_tiers mt ON mt.id = m.membership_tier_id
         LEFT JOIN sales s
           ON s.member_id = m.id
          AND s.business_id = m.business_id
          AND s.sale_date BETWEEN ? AND ?
          ${branchId ? "AND s.branch_id = ?" : ""}
         WHERE m.business_id = ?
         GROUP BY tier_name
         ORDER BY sales_total DESC, member_count DESC`,
        [
          start,
          end,
          ...(branchId ? [branchId] : []),
          req.user.business_id
        ]
      ),
      query(
        `SELECT
           m.id,
           m.name,
           m.member_code,
           COALESCE(mt.name, m.tier, 'No Tier') AS tier_name,
           COALESCE(SUM(s.total), 0) AS sales_total,
           COUNT(s.id) AS order_count,
           COALESCE(m.wallet_balance, 0) AS wallet_balance,
           COALESCE(m.points, 0) AS points
         FROM members m
         LEFT JOIN membership_tiers mt ON mt.id = m.membership_tier_id
         LEFT JOIN sales s
           ON s.member_id = m.id
          AND s.business_id = m.business_id
          AND s.sale_date BETWEEN ? AND ?
          ${branchId ? "AND s.branch_id = ?" : ""}
         WHERE m.business_id = ?
         GROUP BY m.id, m.name, m.member_code, tier_name, m.wallet_balance, m.points
         ORDER BY sales_total DESC, order_count DESC
         LIMIT 10`,
        [
          start,
          end,
          ...(branchId ? [branchId] : []),
          req.user.business_id
        ]
      ),
      query(
        `SELECT
           COUNT(*) AS transaction_count,
           COALESCE(SUM(CASE WHEN mpl.transaction_type = 'earn' THEN mpl.points ELSE 0 END), 0) AS earned_points,
           COALESCE(SUM(CASE WHEN mpl.transaction_type = 'redeem' THEN mpl.points ELSE 0 END), 0) AS redeemed_points,
           COALESCE(SUM(CASE WHEN mpl.transaction_type = 'adjust' THEN mpl.points ELSE 0 END), 0) AS adjusted_points,
           COUNT(DISTINCT mpl.member_id) AS active_members
         FROM member_points_ledger mpl
         WHERE mpl.business_id = ? AND mpl.created_at BETWEEN ? AND ? ${pointsBranch.sql}`,
        [req.user.business_id, start, end, ...pointsBranch.params]
      ),
      query(
        `SELECT
           DATE(mpl.created_at) AS bucket,
           COALESCE(SUM(CASE WHEN mpl.transaction_type = 'earn' THEN mpl.points ELSE 0 END), 0) AS earned,
           COALESCE(SUM(CASE WHEN mpl.transaction_type = 'redeem' THEN mpl.points ELSE 0 END), 0) AS redeemed,
           COALESCE(SUM(CASE WHEN mpl.transaction_type = 'adjust' THEN mpl.points ELSE 0 END), 0) AS adjusted
         FROM member_points_ledger mpl
         WHERE mpl.business_id = ? AND mpl.created_at BETWEEN ? AND ? ${pointsBranch.sql}
         GROUP BY bucket
         ORDER BY bucket ASC`,
        [req.user.business_id, start, end, ...pointsBranch.params]
      ),
      query(
        `SELECT
           COUNT(*) AS order_count,
           COALESCE(SUM(co.total), 0) AS total,
           SUM(CASE WHEN co.payment_status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
           SUM(CASE WHEN co.fulfillment_status = 'completed' THEN 1 ELSE 0 END) AS completed_count
         FROM customer_orders co
         WHERE co.business_id = ? AND co.created_at BETWEEN ? AND ? ${orderBranch.sql}`,
        [req.user.business_id, start, end, ...orderBranch.params]
      ),
      query(
        `SELECT
           COALESCE(s.membership_tier_name, 'No Membership') AS tier_name,
           COUNT(*) AS order_count,
           COALESCE(SUM(s.subtotal), 0) AS subtotal,
           COALESCE(SUM(s.membership_discount), 0) AS membership_discount,
           COALESCE(SUM(s.loyalty_discount), 0) AS loyalty_discount,
           COALESCE(SUM(s.total), 0) AS total
         FROM sales s
         WHERE s.business_id = ? AND s.sale_date BETWEEN ? AND ? ${salesBranch.sql}
         GROUP BY tier_name
         ORDER BY membership_discount DESC, total DESC`,
        salesScope
      )
    ]);

    const summary = salesSummary[0] || {};
    const wallet = walletUsage[0] || {};
    const members = membershipSummary[0] || {};
    const points = pointsSummary[0] || {};
    const digital = digitalOrders[0] || {};
    const totalSales = Number(summary.total_sales || 0);
    const walletPayment = Number(summary.wallet_payment || 0);
    const totalDiscounts =
      Number(summary.membership_discount || 0) +
      Number(summary.loyalty_discount || 0) +
      Number(summary.giftcard_discount || 0);

    res.json({
      success: true,
      data: {
        range: { start, end, branch_id: branchId || null },
        kpis: {
          total_sales: totalSales,
          order_count: Number(summary.order_count || 0),
          average_order_value: Number(summary.average_order_value || 0),
          wallet_payment: walletPayment,
          wallet_sales_share: totalSales > 0 ? walletPayment / totalSales : 0,
          wallet_credited: Number(wallet.credited_amount || 0),
          wallet_debited: Number(wallet.debited_amount || 0),
          average_topup: Number(wallet.average_topup || 0),
          wallet_members: Number(wallet.wallet_members || 0),
          wallet_liability: Number(members.wallet_liability || 0),
          member_count: Number(members.member_count || 0),
          active_members: Number(members.active_members || 0),
          new_members: Number(members.new_members || 0),
          purchasing_members: Number(summary.purchasing_members || 0),
          outstanding_points: Number(members.outstanding_points || 0),
          lifetime_points: Number(members.lifetime_points || 0),
          earned_points: Number(points.earned_points || 0),
          redeemed_points: Number(points.redeemed_points || 0),
          total_discounts: totalDiscounts,
          reward_points_redeemed: Number(summary.reward_points_redeemed || 0),
          points_earned: Number(summary.points_earned || 0),
          digital_order_count: Number(digital.order_count || 0),
          digital_order_total: Number(digital.total || 0)
        },
        wallet: {
          usage: wallet,
          trend: walletTrend,
          sources: walletSources
        },
        sales: {
          category_sales: categorySales,
          top_items: topItems,
          promotion_signals: promotionSignals
        },
        membership: {
          summary: members,
          tier_activity: tierActivity,
          leaderboard: memberLeaderboard
        },
        points: {
          summary: points,
          trend: pointsTrend
        },
        digital_orders: digital
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
