const express = require("express");
const { query } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");
const { ensureBusinessContext } = require("../utils/tenant");

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

module.exports = router;
