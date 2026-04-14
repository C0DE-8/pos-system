const express = require("express");
const { query, pool } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");

const router = express.Router();

router.use(authenticateToken);

// sales/ all sales
router.get("/", requirePermission("sales"), async (req, res) => {
  try {
    const rows = await query(`
      SELECT s.*, u.name AS cashier_name
      FROM sales s
      JOIN users u ON u.id = s.cashier_id
      ORDER BY s.id DESC
      LIMIT 200
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// sales/payment-types?type=card&split_with=cash filter sales by payment type and split breakdown
router.get("/payment-types", requirePermission("sales"), async (req, res) => {
  try {
    const { type, split_with } = req.query;

    let sql = `
      SELECT 
        s.*,
        u.name AS cashier_name
      FROM sales s
      JOIN users u ON u.id = s.cashier_id
    `;

    const where = [];
    const params = [];

    // filter by main payment type
    if (type) {
      where.push(`s.payment_method = ?`);
      params.push(type);
    }

    // extra filter for split breakdown
    if (split_with === "cash") {
      where.push(`s.payment_method = 'split'`);
      where.push(`COALESCE(s.split_cash_amount, 0) > 0`);
    }

    if (split_with === "card") {
      where.push(`s.payment_method = 'split'`);
      where.push(`COALESCE(s.split_card_amount, 0) > 0`);
    }

    if (split_with === "transfer") {
      where.push(`s.payment_method = 'split'`);
      where.push(`COALESCE(s.split_transfer_amount, 0) > 0`);
    }

    if (where.length > 0) {
      sql += ` WHERE ` + where.join(" AND ");
    }

    sql += ` ORDER BY s.id DESC LIMIT 200`;

    const rows = await query(sql, params);

    const formatted = rows.map((sale) => ({
      ...sale,
      payment_breakdown:
        sale.payment_method === "split"
          ? {
              cash: Number(sale.split_cash_amount || 0),
              card: Number(sale.split_card_amount || 0),
              transfer: Number(sale.split_transfer_amount || 0)
            }
          : null
    }));

    res.json({
      success: true,
      filters: {
        type: type || "all",
        split_with: split_with || null
      },
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
// sales/:id sale details
router.get("/:id", requirePermission("sales"), async (req, res) => {
  try {
    const sales = await query("SELECT * FROM sales WHERE id = ? LIMIT 1", [req.params.id]);
    if (!sales.length) return res.status(404).json({ success: false, message: "Sale not found" });

    const items = await query("SELECT * FROM sale_items WHERE sale_id = ?", [req.params.id]);

    res.json({ success: true, sale: sales[0], items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// sales/:id/refund refund sale
router.post("/:id/refund", requirePermission("refunds"), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { reason } = req.body;
    await conn.beginTransaction();

    const [sales] = await conn.execute("SELECT * FROM sales WHERE id = ? LIMIT 1", [req.params.id]);
    if (!sales.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Sale not found" });
    }

    const sale = sales[0];
    if (sale.status === "refunded") {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Already refunded" });
    }

    const [items] = await conn.execute("SELECT * FROM sale_items WHERE sale_id = ?", [req.params.id]);

    for (const item of items) {
      if (item.product_id) {
        const [products] = await conn.execute(
          "SELECT stock, is_unlimited FROM products WHERE id = ? LIMIT 1 FOR UPDATE",
          [item.product_id]
        );
        if (products.length) {
          const product = products[0];
          if (Number(product.is_unlimited) === 1) continue;

          const beforeQty = Number(product.stock ?? 0);
          const changeQty = Number(item.qty ?? 0);
          if (changeQty <= 0) continue;

          const afterQty = beforeQty + changeQty;

          await conn.execute("UPDATE products SET stock = ? WHERE id = ?", [afterQty, item.product_id]);
          await conn.execute(
            `INSERT INTO stock_history (product_id, before_qty, after_qty, change_qty, reason, by_user_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              item.product_id,
              beforeQty,
              afterQty,
              changeQty,
              `Refund sale #${req.params.id}: ${reason || "Refunded"}`,
              req.user.id
            ]
          );
        }
      }
    }

    await conn.execute(
      "UPDATE sales SET status='refunded', refund_reason=? WHERE id=?",
      [reason || "Refunded", req.params.id]
    );

    await conn.commit();
    res.json({ success: true, message: "Sale refunded successfully" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
