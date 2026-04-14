const express = require("express");
const { pool, query } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");
const { isAdmin } = require("../utils/tenant");

const router = express.Router();

async function resolveBusinessBranch(businessSlug, branchSlug = null) {
  const businesses = await query(
    "SELECT * FROM businesses WHERE slug = ? AND is_active = 1 LIMIT 1",
    [businessSlug]
  );
  if (!businesses.length) return null;
  const business = businesses[0];
  let branch = null;
  if (branchSlug) {
    const branches = await query(
      "SELECT * FROM business_branches WHERE business_id = ? AND slug = ? AND is_active = 1 LIMIT 1",
      [business.id, branchSlug]
    );
    if (!branches.length) return null;
    branch = branches[0];
  }
  return { business, branch };
}

router.get("/:businessSlug/:branchSlug/products", async (req, res) => {
  try {
    const resolved = await resolveBusinessBranch(req.params.businessSlug, req.params.branchSlug);
    if (!resolved) return res.status(404).json({ success: false, message: "Menu not found" });
    const rows = await query(
      `SELECT
         p.id,
         p.name,
         p.icon,
         p.price,
         p.type,
         p.category_id,
         CASE
           WHEN p.is_active = 1 AND (p.is_unlimited = 1 OR COALESCE(p.stock, 0) > 0) THEN 1
           ELSE 0
         END AS available,
         p.stock,
         p.is_unlimited
       FROM products p
       WHERE p.business_id = ?
         AND (p.branch_id IS NULL OR p.branch_id = ?)
         AND p.is_active = 1
       ORDER BY p.id DESC`,
      [resolved.business.id, resolved.branch.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:businessSlug/:branchSlug/products/:id", async (req, res) => {
  try {
    const resolved = await resolveBusinessBranch(req.params.businessSlug, req.params.branchSlug);
    if (!resolved) return res.status(404).json({ success: false, message: "Menu not found" });
    const rows = await query(
      `SELECT
         p.id,
         p.name,
         p.icon,
         p.price,
         p.type,
         p.category_id,
         CASE
           WHEN p.is_active = 1 AND (p.is_unlimited = 1 OR COALESCE(p.stock, 0) > 0) THEN 1
           ELSE 0
         END AS available,
         p.stock,
         p.is_unlimited
       FROM products p
       WHERE p.id = ?
         AND p.business_id = ?
         AND (p.branch_id IS NULL OR p.branch_id = ?)
         AND p.is_active = 1
       LIMIT 1`,
      [req.params.id, resolved.business.id, resolved.branch.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/:businessSlug/:branchSlug/orders", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const resolved = await resolveBusinessBranch(req.params.businessSlug, req.params.branchSlug);
    if (!resolved) return res.status(404).json({ success: false, message: "Menu not found" });

    const { customer_name, customer_phone, customer_email, order_type = "pickup", table_number, delivery_address, notes, items = [] } = req.body;
    if (!items.length) return res.status(400).json({ success: false, message: "No items selected" });

    await conn.beginTransaction();

    let subtotal = 0;
    const preparedItems = [];
    for (const item of items) {
      const productId = Number(item.product_id || 0);
      if (!productId) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: "Invalid product_id" });
      }
      const [productRows] = await conn.execute(
        `SELECT id, name, icon, price, stock, is_unlimited
         FROM products
         WHERE id = ?
           AND business_id = ?
           AND (branch_id IS NULL OR branch_id = ?)
           AND is_active = 1
         LIMIT 1`,
        [productId, resolved.business.id, resolved.branch.id]
      );
      if (!productRows.length) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: "Invalid product" });
      }
      const product = productRows[0];
      const qty = Number(item.qty || 1);
      if (qty <= 0) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: "Invalid quantity" });
      }
      if (!Number(product.is_unlimited) && Number(product.stock || 0) < qty) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Out of stock: ${product.name}` });
      }
      const unitPrice = Number(product.price ?? 0);
      const finalPrice = unitPrice * qty;
      subtotal += finalPrice;
      preparedItems.push({ product, qty, unitPrice, finalPrice, notes: item.notes || null, mods: item.mods || null });
    }

    const taxRate = Number(resolved.business.tax_rate || 0);
    const tax = (subtotal * taxRate) / 100;
    const total = subtotal + tax;
    const orderCode = `DM-${Date.now()}`;

    const [orderResult] = await conn.execute(
      `INSERT INTO customer_orders
      (business_id, branch_id, order_code, customer_name, customer_phone, customer_email, order_type, table_number, delivery_address, notes, subtotal, tax, total, currency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resolved.business.id,
        resolved.branch.id,
        orderCode,
        customer_name || null,
        customer_phone || null,
        customer_email || null,
        order_type,
        table_number || null,
        delivery_address || null,
        notes || null,
        subtotal,
        tax,
        total,
        resolved.business.currency || "NGN"
      ]
    );

    for (const item of preparedItems) {
      await conn.execute(
        `INSERT INTO customer_order_items
         (customer_order_id, product_id, item_name, icon, qty, unit_price, final_price, mods, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderResult.insertId,
          item.product.id,
          item.product.name,
          item.product.icon || null,
          item.qty,
          item.unitPrice,
          item.finalPrice,
          item.mods ? JSON.stringify(item.mods) : null,
          item.notes
        ]
      );
    }

    await conn.commit();
    res.status(201).json({ success: true, message: "Order placed", order_code: orderCode, order_id: orderResult.insertId });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

router.get("/:businessSlug/:branchSlug/orders/:orderCode", async (req, res) => {
  try {
    const resolved = await resolveBusinessBranch(req.params.businessSlug, req.params.branchSlug);
    if (!resolved) return res.status(404).json({ success: false, message: "Menu not found" });

    const orders = await query(
      `SELECT * FROM customer_orders
       WHERE business_id = ? AND branch_id = ? AND order_code = ?
       LIMIT 1`,
      [resolved.business.id, resolved.branch.id, req.params.orderCode]
    );
    if (!orders.length) return res.status(404).json({ success: false, message: "Order not found" });

    const items = await query(
      "SELECT * FROM customer_order_items WHERE customer_order_id = ? ORDER BY id ASC",
      [orders[0].id]
    );
    const logs = await query(
      "SELECT old_status, new_status, created_at FROM customer_order_status_logs WHERE customer_order_id = ? ORDER BY id ASC",
      [orders[0].id]
    );

    return res.json({
      success: true,
      order: orders[0],
      items,
      logs
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.use("/admin", authenticateToken);

router.get("/admin/orders", requirePermission("pos"), async (req, res) => {
  try {
    const useBranchScope = !isAdmin(req.user) && !!req.user.branch_id;
    const rows = await query(
      `SELECT
         id,
         order_code,
         customer_name,
         customer_phone,
         order_type,
         total,
         fulfillment_status,
         payment_status,
         created_at
       FROM customer_orders
       WHERE business_id = ? ${useBranchScope ? "AND branch_id = ?" : ""}
       ORDER BY id DESC`,
      useBranchScope
        ? [req.user.business_id, req.user.branch_id]
        : [req.user.business_id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/admin/orders/:id", requirePermission("pos"), async (req, res) => {
  try {
    const useBranchScope = !isAdmin(req.user) && !!req.user.branch_id;
    const orders = await query(
      `SELECT * FROM customer_orders WHERE id = ? AND business_id = ? ${useBranchScope ? "AND branch_id = ?" : ""} LIMIT 1`,
      useBranchScope
        ? [req.params.id, req.user.business_id, req.user.branch_id]
        : [req.params.id, req.user.business_id]
    );
    if (!orders.length) return res.status(404).json({ success: false, message: "Order not found" });
    const items = await query("SELECT * FROM customer_order_items WHERE customer_order_id = ? ORDER BY id ASC", [req.params.id]);
    res.json({ success: true, order: orders[0], items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/admin/orders/:id/status", requirePermission("pos"), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { fulfillment_status, payment_status } = req.body;
    await conn.beginTransaction();
    const useBranchScope = !isAdmin(req.user) && !!req.user.branch_id;
    const [orders] = await conn.execute(
      `SELECT * FROM customer_orders WHERE id = ? AND business_id = ? ${useBranchScope ? "AND branch_id = ?" : ""} LIMIT 1`,
      useBranchScope
        ? [req.params.id, req.user.business_id, req.user.branch_id]
        : [req.params.id, req.user.business_id]
    );
    if (!orders.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    const order = orders[0];
    await conn.execute(
      `UPDATE customer_orders
       SET fulfillment_status = COALESCE(?, fulfillment_status),
           payment_status = COALESCE(?, payment_status)
       WHERE id = ?`,
      [fulfillment_status || null, payment_status || null, req.params.id]
    );
    await conn.execute(
      "INSERT INTO customer_order_status_logs (customer_order_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)",
      [req.params.id, order.fulfillment_status, fulfillment_status || order.fulfillment_status, req.user.id]
    );

    if ((fulfillment_status === "confirmed" || payment_status === "paid") && order.fulfillment_status === "pending") {
      const [items] = await conn.execute("SELECT * FROM customer_order_items WHERE customer_order_id = ?", [req.params.id]);
      const [kdsResult] = await conn.execute(
        `INSERT INTO kds_orders (ticket_name, customer, status, business_id, branch_id)
         VALUES (?, ?, 'new', ?, ?)`,
        [order.order_code, order.customer_name || "Walk-in", order.business_id, order.branch_id]
      );
      for (const item of items) {
        await conn.execute(
          "INSERT INTO kds_order_items (kds_order_id, item_name, icon, mods, done) VALUES (?, ?, ?, ?, 0)",
          [kdsResult.insertId, item.item_name, item.icon || "", item.mods || null]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, message: "Order status updated" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

router.post("/admin/orders/:id/hold", requirePermission("pos"), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const useBranchScope = !isAdmin(req.user) && !!req.user.branch_id;
    const scopeSql = useBranchScope ? " AND branch_id = ?" : "";
    const scopeParams = useBranchScope ? [req.user.branch_id] : [];

    const [orders] = await conn.execute(
      `SELECT *
       FROM customer_orders
       WHERE id = ? AND business_id = ?${scopeSql}
       LIMIT 1`,
      [req.params.id, req.user.business_id, ...scopeParams]
    );
    if (!orders.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orders[0];
    const [items] = await conn.execute(
      `SELECT *
       FROM customer_order_items
       WHERE customer_order_id = ?
       ORDER BY id ASC`,
      [order.id]
    );
    if (!items.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Order has no items" });
    }

    const cartCode = `PEND-${Date.now()}`;
    const [cartResult] = await conn.execute(
      `INSERT INTO pending_carts
      (cart_code, customer, cashier_id, shift_id, subtotal, discount, loyalty_discount, giftcard_discount, tax, total, currency, note, business_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cartCode,
        order.customer_name || "Walk-in",
        req.user.id,
        null,
        order.subtotal || 0,
        order.discount || 0,
        0,
        0,
        order.tax || 0,
        order.total || 0,
        order.currency || "NGN",
        order.notes || `From customer order ${order.order_code}`,
        order.business_id,
        order.branch_id || null
      ]
    );

    const pendingCartId = cartResult.insertId;

    for (const item of items) {
      await conn.execute(
        `INSERT INTO pending_cart_items
        (pending_cart_id, product_id, item_name, icon, item_type, qty, unit_price, cost, item_discount_pct, session_start, session_end, elapsed_seconds, final_price, manage_stock)
        VALUES (?, ?, ?, ?, 'fixed', ?, ?, 0, ?, NULL, NULL, 0, ?, 1)`,
        [
          pendingCartId,
          item.product_id || null,
          item.item_name,
          item.icon || null,
          item.qty || 1,
          item.unit_price || 0,
          item.item_discount_pct || 0,
          item.final_price || 0
        ]
      );
    }

    const nextStatus =
      order.fulfillment_status === "pending" ? "confirmed" : order.fulfillment_status;
    await conn.execute(
      `UPDATE customer_orders
       SET fulfillment_status = ?
       WHERE id = ?`,
      [nextStatus, order.id]
    );
    await conn.execute(
      `INSERT INTO customer_order_status_logs (customer_order_id, old_status, new_status, changed_by)
       VALUES (?, ?, ?, ?)`,
      [order.id, order.fulfillment_status, nextStatus, req.user.id]
    );

    await conn.commit();
    return res.status(201).json({
      success: true,
      message: "Customer order moved to pending cart",
      pendingCartId,
      cartCode
    });
  } catch (error) {
    await conn.rollback();
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
