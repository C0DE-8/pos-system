const express = require("express");
const { pool, query } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");
const { ensureBusinessContext, isAdmin } = require("../utils/tenant");

const router = express.Router();

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

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

router.get("/:businessSlug", async (req, res) => {
  try {
    const resolved = await resolveBusinessBranch(req.params.businessSlug);
    if (!resolved) return res.status(404).json({ success: false, message: "Business menu not found" });
    const collections = await query(
      `SELECT * FROM menu_collections
       WHERE business_id = ? AND is_active = 1
       ORDER BY id DESC`,
      [resolved.business.id]
    );
    res.json({ success: true, business: resolved.business, collections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:businessSlug/:branchSlug", async (req, res) => {
  try {
    const resolved = await resolveBusinessBranch(req.params.businessSlug, req.params.branchSlug);
    if (!resolved) return res.status(404).json({ success: false, message: "Branch menu not found" });
    const collections = await query(
      `SELECT * FROM menu_collections
       WHERE business_id = ? AND (branch_id IS NULL OR branch_id = ?) AND is_active = 1
       ORDER BY id DESC`,
      [resolved.business.id, resolved.branch.id]
    );
    res.json({ success: true, business: resolved.business, branch: resolved.branch, collections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:businessSlug/:branchSlug/collections", async (req, res) => {
  try {
    const resolved = await resolveBusinessBranch(req.params.businessSlug, req.params.branchSlug);
    if (!resolved) return res.status(404).json({ success: false, message: "Menu not found" });
    const rows = await query(
      `SELECT * FROM menu_collections
       WHERE business_id = ? AND (branch_id IS NULL OR branch_id = ?) AND is_active = 1
       ORDER BY id DESC`,
      [resolved.business.id, resolved.branch.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:businessSlug/:branchSlug/products", async (req, res) => {
  try {
    const resolved = await resolveBusinessBranch(req.params.businessSlug, req.params.branchSlug);
    if (!resolved) return res.status(404).json({ success: false, message: "Menu not found" });
    const rows = await query(
      `SELECT mp.*, p.name AS product_name, p.icon AS product_icon, p.price AS product_price, p.stock, p.is_unlimited, p.modifier_group_id
       FROM menu_products mp
       JOIN products p ON p.id = mp.product_id
       WHERE mp.business_id = ?
         AND (mp.branch_id IS NULL OR mp.branch_id = ?)
         AND mp.is_active = 1
         AND p.is_active = 1
         AND (p.is_unlimited = 1 OR COALESCE(p.stock, 0) > 0)
       ORDER BY mp.sort_order ASC, mp.id DESC`,
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
      `SELECT mp.*, p.name AS product_name, p.icon AS product_icon, p.price AS product_price, p.stock, p.is_unlimited, p.modifier_group_id
       FROM menu_products mp
       JOIN products p ON p.id = mp.product_id
       WHERE mp.id = ?
         AND mp.business_id = ?
         AND (mp.branch_id IS NULL OR mp.branch_id = ?)
         AND mp.is_active = 1
         AND p.is_active = 1
       LIMIT 1`,
      [req.params.id, resolved.business.id, resolved.branch.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Menu product not found" });
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
      const [menuRows] = await conn.execute(
        `SELECT mp.*, p.name AS product_name, p.icon AS product_icon, p.price AS product_price, p.stock, p.is_unlimited
         FROM menu_products mp
         JOIN products p ON p.id = mp.product_id
         WHERE mp.id = ? AND mp.business_id = ? AND (mp.branch_id IS NULL OR mp.branch_id = ?) AND mp.is_active = 1 AND p.is_active = 1
         LIMIT 1`,
        [item.menu_product_id, resolved.business.id, resolved.branch.id]
      );
      if (!menuRows.length) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: "Invalid menu item" });
      }
      const menuProduct = menuRows[0];
      const qty = Number(item.qty || 1);
      if (qty <= 0) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: "Invalid quantity" });
      }
      if (!Number(menuProduct.is_unlimited) && Number(menuProduct.stock || 0) < qty) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Out of stock: ${menuProduct.product_name}` });
      }
      const unitPrice = Number(menuProduct.price_override ?? menuProduct.product_price ?? 0);
      const finalPrice = unitPrice * qty;
      subtotal += finalPrice;
      preparedItems.push({ menuProduct, qty, unitPrice, finalPrice, notes: item.notes || null, mods: item.mods || null });
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
          item.menuProduct.product_id,
          item.menuProduct.display_name || item.menuProduct.product_name,
          item.menuProduct.product_icon || null,
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

router.use("/admin", authenticateToken);

router.get("/admin/collections", requirePermission("settings"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const params = [req.user.business_id];
    const sql = `SELECT * FROM menu_collections WHERE business_id = ? ${req.user.branch_id ? "AND (branch_id IS NULL OR branch_id = ?)" : ""} ORDER BY id DESC`;
    if (req.user.branch_id) params.push(req.user.branch_id);
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/admin/collections", requirePermission("settings"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { name, slug, description, branch_id = null } = req.body;
    const finalSlug = slugify(slug || name);
    const result = await query(
      `INSERT INTO menu_collections (business_id, branch_id, name, slug, description)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.business_id, branch_id || req.user.branch_id || null, name, finalSlug, description || null]
    );
    res.status(201).json({ success: true, message: "Collection created", id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/admin/collections/:id", requirePermission("settings"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { name, slug, description, is_active = 1 } = req.body;
    await query(
      `UPDATE menu_collections SET name = ?, slug = ?, description = ?, is_active = ?
       WHERE id = ? AND business_id = ?`,
      [name, slugify(slug || name), description || null, Number(is_active) ? 1 : 0, req.params.id, req.user.business_id]
    );
    res.json({ success: true, message: "Collection updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/admin/collections/:id/status", requirePermission("settings"), async (req, res) => {
  try {
    await query("UPDATE menu_collections SET is_active = ? WHERE id = ? AND business_id = ?", [Number(req.body.is_active) ? 1 : 0, req.params.id, req.user.business_id]);
    res.json({ success: true, message: "Collection status updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/admin/products", requirePermission("inventory"), async (req, res) => {
  try {
    const rows = await query("SELECT * FROM menu_products WHERE business_id = ? ORDER BY id DESC", [req.user.business_id]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/admin/products", requirePermission("inventory"), async (req, res) => {
  try {
    const { collection_id, category_id, product_id, display_name, description, image_url, price_override, is_featured = 0, sort_order = 0, branch_id = null } = req.body;
    const result = await query(
      `INSERT INTO menu_products (business_id, branch_id, collection_id, category_id, product_id, display_name, description, image_url, price_override, is_featured, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.business_id, branch_id || req.user.branch_id || null, collection_id, category_id || null, product_id, display_name || null, description || null, image_url || null, price_override || null, Number(is_featured) ? 1 : 0, sort_order]
    );
    res.status(201).json({ success: true, message: "Menu product added", id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/admin/products/:id", requirePermission("inventory"), async (req, res) => {
  try {
    const { collection_id, category_id, product_id, display_name, description, image_url, price_override, is_featured = 0, sort_order = 0, is_active = 1 } = req.body;
    await query(
      `UPDATE menu_products
       SET collection_id = ?, category_id = ?, product_id = ?, display_name = ?, description = ?, image_url = ?, price_override = ?, is_featured = ?, sort_order = ?, is_active = ?
       WHERE id = ? AND business_id = ?`,
      [collection_id, category_id || null, product_id, display_name || null, description || null, image_url || null, price_override || null, Number(is_featured) ? 1 : 0, sort_order, Number(is_active) ? 1 : 0, req.params.id, req.user.business_id]
    );
    res.json({ success: true, message: "Menu product updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/admin/products/:id/status", requirePermission("inventory"), async (req, res) => {
  try {
    await query("UPDATE menu_products SET is_active = ? WHERE id = ? AND business_id = ?", [Number(req.body.is_active) ? 1 : 0, req.params.id, req.user.business_id]);
    res.json({ success: true, message: "Menu product status updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/admin/orders", requirePermission("pos"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const rows = await query(
      `SELECT * FROM customer_orders
       WHERE business_id = ? ${req.user.branch_id ? "AND branch_id = ?" : ""}
       ORDER BY id DESC`,
      req.user.branch_id ? [req.user.business_id, req.user.branch_id] : [req.user.business_id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/admin/orders/:id", requirePermission("pos"), async (req, res) => {
  try {
    const orders = await query(
      `SELECT * FROM customer_orders WHERE id = ? AND business_id = ? LIMIT 1`,
      [req.params.id, req.user.business_id]
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
    const [orders] = await conn.execute("SELECT * FROM customer_orders WHERE id = ? AND business_id = ? LIMIT 1", [req.params.id, req.user.business_id]);
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

module.exports = router;
