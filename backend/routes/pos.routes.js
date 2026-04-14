const express = require("express");
const moment = require("moment");
const { pool } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");
const { ensureBusinessContext, isAdmin } = require("../utils/tenant");
const branchAccessMiddleware = require("../middleware/branchAccessMiddleware");

const router = express.Router();

router.use(authenticateToken);

const isAdminUser = (user) => isAdmin(user);
const toMySQLDateTime = (value) => {
  if (!value) return null;

  const m = moment(value);
  if (!m.isValid()) return null;

  return m.format("YYYY-MM-DD HH:mm:ss");
};
const normalizeItemType = (value) => {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();

  // The app logic only treats "timed" specially; everything else behaves like "fixed".
  // This also prevents MySQL ENUM/VARCHAR truncation errors when the client sends
  // unexpected casing or labels (e.g. "Timed", "TIME", etc).
  if (v === "timed") return "timed";
  return "fixed";
};

// pos/split-price / quote a unit price split across multiple payers
router.post("/split-price", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  try {
    const { unit_price, split_count = 2 } = req.body;

    const unitPrice = Number(unit_price);
    const splitCount = Number(split_count);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "unit_price must be zero or greater"
      });
    }

    if (!Number.isInteger(splitCount) || splitCount < 2 || splitCount > 10) {
      return res.status(400).json({
        success: false,
        message: "split_count must be a whole number between 2 and 10"
      });
    }

    const splitUnitPrice = unitPrice / splitCount;
    const itemDiscountPct = ((splitCount - 1) / splitCount) * 100;

    res.json({
      success: true,
      data: {
        unit_price: unitPrice,
        split_count: splitCount,
        split_unit_price: splitUnitPrice,
        item_discount_pct: itemDiscountPct
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// pos/pending / create new pending cart
router.post("/pending", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  const conn = await pool.getConnection();

  try {
    if (!ensureBusinessContext(req, res)) return;
    const {
      customer = "Walk-in",
      shift_id = null,
      subtotal = 0,
      discount = 0,
      loyalty_discount = 0,
      giftcard_discount = 0,
      tax = 0,
      total = 0,
      currency = "NGN",
      note = null,
      items = []
    } = req.body;

    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: "No items in cart"
      });
    }

    await conn.beginTransaction();

    const cartCode = `PEND-${Date.now()}`;

    const [cartResult] = await conn.execute(
      `INSERT INTO pending_carts
      (cart_code, customer, cashier_id, shift_id, subtotal, discount, loyalty_discount, giftcard_discount, tax, total, currency, note, business_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cartCode,
        customer,
        req.user.id,
        shift_id,
        subtotal,
        discount,
        loyalty_discount,
        giftcard_discount,
        tax,
        total,
        currency,
        note,
        req.user.business_id,
        req.user.branch_id || null
      ]
    );

    const pendingCartId = cartResult.insertId;

    for (const item of items) {
      await conn.execute(
        `INSERT INTO pending_cart_items
	        (pending_cart_id, product_id, item_name, icon, item_type, qty, unit_price, cost, item_discount_pct, session_start, session_end, elapsed_seconds, final_price, manage_stock)
	        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pendingCartId,
          item.product_id || null,
          item.item_name,
          item.icon || null,
          normalizeItemType(item.item_type),
          item.qty || 1,
          item.unit_price || 0,
          item.cost || 0,
          item.item_discount_pct || 0,
          toMySQLDateTime(item.session_start),
          toMySQLDateTime(item.session_end),
          item.elapsed_seconds || 0,
          item.final_price || 0,
          item.manage_stock ? 1 : 0
        ]
      );
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Cart saved as pending",
      pendingCartId,
      cartCode
    });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    conn.release();
  }
});

// pos/pending / get all pending carts
router.get("/pending", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const isAdmin =
      req.user.role === "admin" ||
      req.user.is_admin === 1 ||
      req.user.is_admin === true;

    let sql = `
      SELECT 
        pc.id,
        pc.cart_code,
        pc.customer,
        pc.total,
        pc.currency,
        pc.status,
        pc.note,
        pc.created_at,
        pc.updated_at,
        u.name AS cashier_name
      FROM pending_carts pc
      LEFT JOIN users u ON pc.cashier_id = u.id
      WHERE pc.status = 'pending'
    `;

    const params = [];

    if (!isAdmin) {
      sql += ` AND pc.business_id = ?`;
      params.push(req.user.business_id);
      if (req.user.branch_id) {
        sql += ` AND pc.branch_id = ?`;
        params.push(req.user.branch_id);
      }
    }

    sql += ` ORDER BY pc.created_at DESC`;

    const [rows] = await pool.execute(sql, params);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// pos/pending/:id / get single pending cart
router.get("/pending/:id", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { id } = req.params;
    const isAdmin = isAdminUser(req.user);

    let sql = `
      SELECT * FROM pending_carts 
      WHERE id = ? AND status = 'pending'
    `;
    const params = [id];

    if (!isAdmin) {
      sql += ` AND business_id = ?`;
      params.push(req.user.business_id);
      if (req.user.branch_id) {
        sql += ` AND branch_id = ?`;
        params.push(req.user.branch_id);
      }
    }

    sql += ` LIMIT 1`;

    const [cartRows] = await pool.execute(sql, params);

    if (!cartRows.length) {
      return res.status(404).json({
        success: false,
        message: "Pending cart not found"
      });
    }

    const [itemRows] = await pool.execute(
      `SELECT * FROM pending_cart_items WHERE pending_cart_id = ? ORDER BY id ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...cartRows[0],
        items: itemRows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// pos/pending/:id / update pending cart
router.put("/pending/:id", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  const conn = await pool.getConnection();

  try {
    if (!ensureBusinessContext(req, res)) return;
    const { id } = req.params;
    const isAdmin = isAdminUser(req.user);

    const {
      customer = "Walk-in",
      shift_id = null,
      subtotal = 0,
      discount = 0,
      loyalty_discount = 0,
      giftcard_discount = 0,
      tax = 0,
      total = 0,
      currency = "NGN",
      note = null,
      items = []
    } = req.body;

    // 🔐 ownership check
    let sql = `
      SELECT id FROM pending_carts
      WHERE id = ? AND status = 'pending'
    `;
    const params = [id];

    if (!isAdmin) {
      sql += ` AND business_id = ?`;
      params.push(req.user.business_id);
      if (req.user.branch_id) {
        sql += ` AND branch_id = ?`;
        params.push(req.user.branch_id);
      }
    }

    sql += ` LIMIT 1`;

    const [cartRows] = await conn.execute(sql, params);

    if (!cartRows.length) {
      return res.status(404).json({
        success: false,
        message: "Pending cart not found"
      });
    }

    await conn.beginTransaction();

    await conn.execute(
      `UPDATE pending_carts SET
        customer = ?,
        shift_id = ?,
        subtotal = ?,
        discount = ?,
        loyalty_discount = ?,
        giftcard_discount = ?,
        tax = ?,
        total = ?,
        currency = ?,
        note = ?
       WHERE id = ?`,
      [
        customer,
        shift_id,
        subtotal,
        discount,
        loyalty_discount,
        giftcard_discount,
        tax,
        total,
        currency,
        note,
        id
      ]
    );

    await conn.execute(
      `DELETE FROM pending_cart_items WHERE pending_cart_id = ?`,
      [id]
    );

    for (const item of items) {
      await conn.execute(
        `INSERT INTO pending_cart_items
	        (pending_cart_id, product_id, item_name, icon, item_type, qty, unit_price, cost, item_discount_pct, session_start, session_end, elapsed_seconds, final_price, manage_stock)
	        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          item.product_id || null,
          item.item_name,
          item.icon || null,
          normalizeItemType(item.item_type),
          item.qty || 1,
          item.unit_price || 0,
          item.cost || 0,
          item.item_discount_pct || 0,
          toMySQLDateTime(item.session_start),
          toMySQLDateTime(item.session_end),
          item.elapsed_seconds || 0,
          item.final_price || 0,
          item.manage_stock ? 1 : 0
        ]
      );
    }

    await conn.commit();

    res.json({
      success: true,
      message: "Pending cart updated"
    });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    conn.release();
  }
});

// pos/pending/:id / cancel pending cart
router.delete("/pending/:id", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { id } = req.params;
    const isAdmin = isAdminUser(req.user);

    let sql = `
      UPDATE pending_carts 
      SET status = 'cancelled' 
      WHERE id = ? AND status = 'pending'
    `;
    const params = [id];

    if (!isAdmin) {
      sql += ` AND business_id = ?`;
      params.push(req.user.business_id);
      if (req.user.branch_id) {
        sql += ` AND branch_id = ?`;
        params.push(req.user.branch_id);
      }
    }

    const [result] = await pool.execute(sql, params);

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Pending cart not found or not allowed"
      });
    }

    res.json({
      success: true,
      message: "Pending cart cancelled"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// pos/pending/:id/checkout / checkout pending cart
router.post("/pending/:id/checkout", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  const conn = await pool.getConnection();

  try {
    if (!ensureBusinessContext(req, res)) return;
    const { id } = req.params;
    const { payment_method } = req.body;
    const isAdmin = isAdminUser(req.user);

    if (!payment_method) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required"
      });
    }

    await conn.beginTransaction();

    // 🔐 ownership check
    let sql = `
      SELECT * FROM pending_carts
      WHERE id = ? AND status = 'pending'
    `;
    const params = [id];

    if (!isAdmin) {
      sql += ` AND business_id = ?`;
      params.push(req.user.business_id);
      if (req.user.branch_id) {
        sql += ` AND branch_id = ?`;
        params.push(req.user.branch_id);
      }
    }

    sql += ` LIMIT 1`;

    const [cartRows] = await conn.execute(sql, params);

    if (!cartRows.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        message: "Pending cart not found"
      });
    }

    const cart = cartRows[0];

    const [items] = await conn.execute(
      `SELECT * FROM pending_cart_items WHERE pending_cart_id = ? ORDER BY id ASC`,
      [id]
    );

    if (!items.length) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: "Pending cart has no items"
      });
    }

    const saleCode = `SALE-${Date.now()}`;

    const [saleResult] = await conn.execute(
      `INSERT INTO sales
      (sale_code, customer, cashier_id, shift_id, subtotal, discount, loyalty_discount, giftcard_discount, tax, total, payment_method, currency, business_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saleCode,
        cart.customer,
        req.user.id,
        cart.shift_id,
        cart.subtotal,
        cart.discount,
        cart.loyalty_discount,
        cart.giftcard_discount,
        cart.tax,
        cart.total,
        payment_method,
        cart.currency,
        cart.business_id || req.user.business_id,
        cart.branch_id || req.user.branch_id || null
      ]
    );

    const saleId = saleResult.insertId;

    for (const item of items) {
      await conn.execute(
        `INSERT INTO sale_items
	        (sale_id, product_id, item_name, icon, item_type, qty, unit_price, cost, item_discount_pct, session_start, session_end, elapsed_seconds, final_price)
	        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          item.product_id || null,
          item.item_name,
          item.icon || null,
          normalizeItemType(item.item_type),
          item.qty || 1,
          item.unit_price || 0,
          item.cost || 0,
          item.item_discount_pct || 0,
          toMySQLDateTime(item.session_start),
          toMySQLDateTime(item.session_end),
          item.elapsed_seconds || 0,
          item.final_price || 0
        ]
      );

      // 🔥 stock protection stays intact
      if (item.product_id && item.manage_stock && item.qty > 0) {
        const [productRows] = await conn.execute(
          `SELECT stock FROM products WHERE id = ? LIMIT 1`,
          [item.product_id]
        );

        if (!productRows.length) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            message: `Product ${item.product_id} not found`
          });
        }

        const beforeQty = Number(productRows[0].stock || 0);

        if (beforeQty < item.qty) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${item.item_name}`
          });
        }

        const afterQty = beforeQty - item.qty;

        await conn.execute(
          `UPDATE products SET stock = ? WHERE id = ?`,
          [afterQty, item.product_id]
        );

        await conn.execute(
          `INSERT INTO stock_history
          (product_id, before_qty, after_qty, change_qty, reason, by_user_id, business_id, branch_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.product_id,
            beforeQty,
            afterQty,
            -item.qty,
            `Sale #${saleId}`,
            req.user.id,
            cart.business_id || req.user.business_id,
            cart.branch_id || req.user.branch_id || null
          ]
        );
      }
    }

    await conn.execute(
      `UPDATE pending_carts SET status = 'checked_out' WHERE id = ?`,
      [id]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Pending cart checked out successfully",
      saleId,
      saleCode
    });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    conn.release();
  }
});

// pos/checkout / create sale
router.post("/checkout", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  const conn = await pool.getConnection();

  try {
    if (!ensureBusinessContext(req, res)) return;
    const {
      customer = "Walk-in",
      shift_id = null,
      subtotal = 0,
      discount = 0,
      loyalty_discount = 0,
      giftcard_discount = 0,
      tax = 0,
      total = 0,
      payment_method,
      currency = "NGN",
      items = []
    } = req.body;

    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: "No items in cart"
      });
    }

    await conn.beginTransaction();

    const saleCode = `SALE-${Date.now()}`;

    const [saleResult] = await conn.execute(
      `INSERT INTO sales
      (sale_code, customer, cashier_id, shift_id, subtotal, discount, loyalty_discount, giftcard_discount, tax, total, payment_method, currency, business_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saleCode,
        customer,
        req.user.id,
        shift_id,
        subtotal,
        discount,
        loyalty_discount,
        giftcard_discount,
        tax,
        total,
        payment_method,
        currency,
        req.user.business_id,
        req.user.branch_id || null
      ]
    );

    const saleId = saleResult.insertId;

    for (const item of items) {
      await conn.execute(
        `INSERT INTO sale_items
	        (sale_id, product_id, item_name, icon, item_type, qty, unit_price, cost, item_discount_pct, session_start, session_end, elapsed_seconds, final_price)
	        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          item.product_id || null,
          item.item_name,
          item.icon || null,
          normalizeItemType(item.item_type),
          item.qty || 1,
          item.unit_price || 0,
          item.cost || 0,
          item.item_discount_pct || 0,
          toMySQLDateTime(item.session_start),
          toMySQLDateTime(item.session_end),
          item.elapsed_seconds || 0,
          item.final_price || 0
        ]
      );

      if (item.product_id && item.manage_stock && item.qty > 0) {
        const [productRows] = await conn.execute(
          `SELECT stock FROM products WHERE id = ? LIMIT 1`,
          [item.product_id]
        );

        if (!productRows.length) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            message: `Product ${item.product_id} not found`
          });
        }

        const beforeQty = Number(productRows[0].stock || 0);

        if (beforeQty < item.qty) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${item.item_name}`
          });
        }

        const afterQty = beforeQty - item.qty;

        await conn.execute(
          `UPDATE products SET stock = ? WHERE id = ?`,
          [afterQty, item.product_id]
        );

        await conn.execute(
          `INSERT INTO stock_history
          (product_id, before_qty, after_qty, change_qty, reason, by_user_id, business_id, branch_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.product_id,
            beforeQty,
            afterQty,
            -item.qty,
            `Sale #${saleId}`,
            req.user.id,
            req.user.business_id,
            req.user.branch_id || null
          ]
        );
      }
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Sale completed",
      saleId,
      saleCode
    });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    conn.release();
  }
});

module.exports = router;
