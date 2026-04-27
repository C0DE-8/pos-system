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
const toAmount = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return amount;
};
const roundMoney = (value) => Number(toAmount(value).toFixed(2));
const buildRecentSalesDates = () => {
  return [0, 1, 2].map((daysAgo) => {
    const date = moment().subtract(daysAgo, "days");

    return {
      key: date.format("YYYY-MM-DD"),
      label: daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : date.format("ddd"),
      fullLabel: date.format("ddd, MMM D")
    };
  });
};

async function resolveMembershipContext(conn, businessId, memberId, fallbackCustomer, subtotal) {
  const normalizedSubtotal = roundMoney(subtotal);
  const fallbackName = String(fallbackCustomer || "Walk-in").trim() || "Walk-in";

  if (!memberId) {
    return {
      customerName: fallbackName,
      memberId: null,
      membershipTierId: null,
      membershipTierName: null,
      membershipDiscountPct: 0,
      membershipDiscountAmount: 0
    };
  }

  const [memberRows] = await conn.execute(
    `SELECT
       m.id,
       m.name,
       m.membership_tier_id,
       COALESCE(mt.name, m.tier) AS membership_tier_name,
       COALESCE(mt.discount_pct, 0) AS membership_discount_pct
     FROM members m
     LEFT JOIN membership_tiers mt ON mt.id = m.membership_tier_id
     WHERE m.id = ? AND m.business_id = ?
     LIMIT 1`,
    [memberId, businessId]
  );

  if (!memberRows.length) {
    const error = new Error("Selected member was not found");
    error.statusCode = 400;
    throw error;
  }

  const member = memberRows[0];
  const membershipDiscountPct = roundMoney(member.membership_discount_pct || 0);
  const membershipDiscountAmount = roundMoney(
    normalizedSubtotal * (membershipDiscountPct / 100)
  );

  return {
    customerName: String(member.name || fallbackName).trim() || fallbackName,
    memberId: member.id,
    membershipTierId: member.membership_tier_id || null,
    membershipTierName: member.membership_tier_name || null,
    membershipDiscountPct,
    membershipDiscountAmount
  };
}

function buildCheckoutTotals({
  subtotal,
  discount,
  loyaltyDiscount,
  giftcardDiscount,
  membershipDiscount,
  tax
}) {
  const normalizedSubtotal = roundMoney(subtotal);
  const normalizedDiscount = roundMoney(discount);
  const normalizedLoyaltyDiscount = roundMoney(loyaltyDiscount);
  const normalizedGiftcardDiscount = roundMoney(giftcardDiscount);
  const normalizedMembershipDiscount = roundMoney(membershipDiscount);
  const normalizedTax = roundMoney(tax);

  const taxableBase = Math.max(
    0,
    normalizedSubtotal -
      normalizedDiscount -
      normalizedMembershipDiscount -
      normalizedLoyaltyDiscount -
      normalizedGiftcardDiscount
  );

  return {
    subtotal: normalizedSubtotal,
    discount: normalizedDiscount,
    loyalty_discount: normalizedLoyaltyDiscount,
    giftcard_discount: normalizedGiftcardDiscount,
    membership_discount: normalizedMembershipDiscount,
    tax: normalizedTax,
    total: roundMoney(taxableBase + normalizedTax)
  };
}

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

router.get("/sales-summary", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;

    const recentDates = buildRecentSalesDates();
    const dateKeys = recentDates.map((entry) => entry.key);
    const placeholders = dateKeys.map(() => "?").join(", ");
    const params = [req.user.id, req.user.business_id, ...dateKeys];

    let sql = `
      SELECT
        DATE(sale_date) AS sale_day,
        COUNT(*) AS sales_count,
        COALESCE(SUM(total), 0) AS sales_total
      FROM sales
      WHERE cashier_id = ?
        AND business_id = ?
        AND DATE(sale_date) IN (${placeholders})
    `;

    if (req.user.branch_id) {
      sql += ` AND branch_id = ?`;
      params.push(req.user.branch_id);
    }

    sql += `
      GROUP BY DATE(sale_date)
      ORDER BY sale_day DESC
    `;

    const [rows] = await pool.execute(sql, params);
    const rowMap = new Map(
      rows.map((row) => [
        moment(row.sale_day).format("YYYY-MM-DD"),
        {
          sales_count: Number(row.sales_count || 0),
          sales_total: roundMoney(row.sales_total || 0)
        }
      ])
    );

    const days = recentDates.map((entry) => {
      const matched = rowMap.get(entry.key);

      return {
        date: entry.key,
        label: entry.label,
        full_label: entry.fullLabel,
        sales_count: matched?.sales_count || 0,
        sales_total: matched?.sales_total || 0
      };
    });

    const totalSales = roundMoney(
      days.reduce((sum, day) => sum + Number(day.sales_total || 0), 0)
    );
    const totalCount = days.reduce(
      (sum, day) => sum + Number(day.sales_count || 0),
      0
    );

    res.json({
      success: true,
      data: {
        cashier_id: req.user.id,
        branch_id: req.user.branch_id || null,
        days,
        total_sales: totalSales,
        total_count: totalCount
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
      member_id = null,
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

    const membershipContext = await resolveMembershipContext(
      conn,
      req.user.business_id,
      member_id,
      customer,
      subtotal
    );
    const totals = buildCheckoutTotals({
      subtotal,
      discount,
      loyaltyDiscount: loyalty_discount,
      giftcardDiscount: giftcard_discount,
      membershipDiscount: membershipContext.membershipDiscountAmount,
      tax
    });

    const cartCode = `PEND-${Date.now()}`;

    const [cartResult] = await conn.execute(
      `INSERT INTO pending_carts
      (cart_code, customer, member_id, membership_tier_id, membership_tier_name, membership_discount_pct, membership_discount, cashier_id, shift_id, subtotal, discount, loyalty_discount, giftcard_discount, tax, total, currency, note, business_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cartCode,
        membershipContext.customerName,
        membershipContext.memberId,
        membershipContext.membershipTierId,
        membershipContext.membershipTierName,
        membershipContext.membershipDiscountPct,
        membershipContext.membershipDiscountAmount,
        req.user.id,
        shift_id,
        totals.subtotal,
        totals.discount,
        totals.loyalty_discount,
        totals.giftcard_discount,
        totals.tax,
        totals.total,
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
    res.status(error.statusCode || 500).json({
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
        pc.member_id,
        pc.membership_tier_name,
        pc.membership_discount_pct,
        pc.membership_discount,
        pc.total,
        pc.currency,
        pc.status,
        pc.note,
        pc.created_at,
        pc.updated_at,
        u.name AS cashier_name,
        COALESCE(pci.items_count, 0) AS items_count
      FROM pending_carts pc
      LEFT JOIN users u ON pc.cashier_id = u.id
      LEFT JOIN (
        SELECT pending_cart_id, COUNT(*) AS items_count
        FROM pending_cart_items
        GROUP BY pending_cart_id
      ) pci ON pci.pending_cart_id = pc.id
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
      member_id = null,
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

    const membershipContext = await resolveMembershipContext(
      conn,
      req.user.business_id,
      member_id,
      customer,
      subtotal
    );
    const totals = buildCheckoutTotals({
      subtotal,
      discount,
      loyaltyDiscount: loyalty_discount,
      giftcardDiscount: giftcard_discount,
      membershipDiscount: membershipContext.membershipDiscountAmount,
      tax
    });

    await conn.execute(
      `UPDATE pending_carts SET
        customer = ?,
        member_id = ?,
        membership_tier_id = ?,
        membership_tier_name = ?,
        membership_discount_pct = ?,
        membership_discount = ?,
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
        membershipContext.customerName,
        membershipContext.memberId,
        membershipContext.membershipTierId,
        membershipContext.membershipTierName,
        membershipContext.membershipDiscountPct,
        membershipContext.membershipDiscountAmount,
        shift_id,
        totals.subtotal,
        totals.discount,
        totals.loyalty_discount,
        totals.giftcard_discount,
        totals.tax,
        totals.total,
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
    res.status(error.statusCode || 500).json({
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
      (sale_code, customer, member_id, membership_tier_id, membership_tier_name, membership_discount_pct, membership_discount, cashier_id, shift_id, subtotal, discount, loyalty_discount, giftcard_discount, tax, total, payment_method, currency, business_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saleCode,
        cart.customer,
        cart.member_id || null,
        cart.membership_tier_id || null,
        cart.membership_tier_name || null,
        cart.membership_discount_pct || 0,
        cart.membership_discount || 0,
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
    res.status(error.statusCode || 500).json({
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
      member_id = null,
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

    const membershipContext = await resolveMembershipContext(
      conn,
      req.user.business_id,
      member_id,
      customer,
      subtotal
    );
    const totals = buildCheckoutTotals({
      subtotal,
      discount,
      loyaltyDiscount: loyalty_discount,
      giftcardDiscount: giftcard_discount,
      membershipDiscount: membershipContext.membershipDiscountAmount,
      tax
    });

    const saleCode = `SALE-${Date.now()}`;

    const [saleResult] = await conn.execute(
      `INSERT INTO sales
      (sale_code, customer, member_id, membership_tier_id, membership_tier_name, membership_discount_pct, membership_discount, cashier_id, shift_id, subtotal, discount, loyalty_discount, giftcard_discount, tax, total, payment_method, currency, business_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saleCode,
        membershipContext.customerName,
        membershipContext.memberId,
        membershipContext.membershipTierId,
        membershipContext.membershipTierName,
        membershipContext.membershipDiscountPct,
        membershipContext.membershipDiscountAmount,
        req.user.id,
        shift_id,
        totals.subtotal,
        totals.discount,
        totals.loyalty_discount,
        totals.giftcard_discount,
        totals.tax,
        totals.total,
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
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  } finally {
    conn.release();
  }
});

module.exports = router;
