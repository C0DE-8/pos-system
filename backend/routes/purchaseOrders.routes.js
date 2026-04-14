const express = require("express");
const { pool, query } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");

const router = express.Router();

router.use(authenticateToken);

// get all POs
router.get("/", requirePermission("purchaseOrders"), async (req, res) => {
  try {
    const rows = await query("SELECT * FROM purchase_orders ORDER BY id DESC");
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// create PO
router.post("/", requirePermission("purchaseOrders"), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { supplier, items = [] } = req.body;
    if (!supplier || !items.length) {
      return res.status(400).json({ success: false, message: "Supplier and items required" });
    }

    await conn.beginTransaction();

    const poCode = `PO-${Date.now()}`;
    const total = items.reduce((sum, i) => sum + Number(i.qty) * Number(i.cost), 0);

    const [poResult] = await conn.execute(
      `INSERT INTO purchase_orders (po_code, supplier, total_amount, created_by)
       VALUES (?, ?, ?, ?)`,
      [poCode, supplier, total, req.user.id]
    );

    const poId = poResult.insertId;

    for (const item of items) {
      await conn.execute(
        `INSERT INTO purchase_order_items (purchase_order_id, product_id, qty, cost)
         VALUES (?, ?, ?, ?)`,
        [poId, item.product_id, item.qty, item.cost]
      );
    }

    await conn.commit();

    res.status(201).json({ success: true, message: "Purchase order created", poId, poCode });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

// receive PO
router.post("/:id/receive", requirePermission("purchaseOrders"), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [poRows] = await conn.execute(
      "SELECT * FROM purchase_orders WHERE id = ? LIMIT 1",
      [req.params.id]
    );

    if (!poRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "PO not found" });
    }

    const po = poRows[0];
    if (po.status === "received") {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "PO already received" });
    }

    const [items] = await conn.execute(
      "SELECT * FROM purchase_order_items WHERE purchase_order_id = ?",
      [req.params.id]
    );

    for (const item of items) {
      const [products] = await conn.execute(
        "SELECT stock FROM products WHERE id = ? LIMIT 1",
        [item.product_id]
      );

      if (products.length) {
        const beforeQty = products[0].stock;
        const afterQty = beforeQty + item.qty;

        await conn.execute("UPDATE products SET stock = ? WHERE id = ?", [afterQty, item.product_id]);
        await conn.execute(
          `INSERT INTO stock_history (product_id, before_qty, after_qty, change_qty, reason, by_user_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [item.product_id, beforeQty, afterQty, item.qty, `PO received #${req.params.id}`, req.user.id]
        );
      }
    }

    await conn.execute(
      "UPDATE purchase_orders SET status='received', received_by=?, received_at=NOW() WHERE id=?",
      [req.user.id, req.params.id]
    );

    await conn.commit();
    res.json({ success: true, message: "Purchase order received successfully" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

module.exports = router;