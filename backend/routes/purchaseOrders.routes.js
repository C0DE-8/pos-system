const express = require("express");
const { pool, query } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");
const { ensureBusinessContext, isAdmin } = require("../utils/tenant");
const branchAccessMiddleware = require("../middleware/branchAccessMiddleware");

const router = express.Router();

router.use(authenticateToken);

// get all POs
router.get("/", requirePermission("purchaseOrders"), branchAccessMiddleware, async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const where = [];
    const params = [];
    if (!isAdmin(req.user)) {
      where.push("business_id = ?");
      params.push(req.user.business_id);
      if (req.user.branch_id) {
        where.push("branch_id = ?");
        params.push(req.user.branch_id);
      }
    }
    const rows = await query(
      `SELECT * FROM purchase_orders
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY id DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// create PO
router.post("/", requirePermission("purchaseOrders"), branchAccessMiddleware, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { supplier, items = [] } = req.body;
    if (!supplier || !items.length) {
      return res.status(400).json({ success: false, message: "Supplier and items required" });
    }

    await conn.beginTransaction();

    const poCode = `PO-${Date.now()}`;
    const total = items.reduce((sum, i) => sum + Number(i.qty) * Number(i.cost), 0);

    const [poResult] = await conn.execute(
      `INSERT INTO purchase_orders (po_code, supplier, total_amount, created_by, business_id, branch_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [poCode, supplier, total, req.user.id, req.user.business_id, req.user.branch_id || null]
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
router.post("/:id/receive", requirePermission("purchaseOrders"), branchAccessMiddleware, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    if (!ensureBusinessContext(req, res)) return;
    await conn.beginTransaction();

    let poSql = "SELECT * FROM purchase_orders WHERE id = ?";
    const poParams = [req.params.id];
    if (!isAdmin(req.user)) {
      poSql += " AND business_id = ?";
      poParams.push(req.user.business_id);
      if (req.user.branch_id) {
        poSql += " AND branch_id = ?";
        poParams.push(req.user.branch_id);
      }
    }
    poSql += " LIMIT 1";
    const [poRows] = await conn.execute(poSql, poParams);

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
          `INSERT INTO stock_history (product_id, before_qty, after_qty, change_qty, reason, by_user_id, business_id, branch_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.product_id,
            beforeQty,
            afterQty,
            item.qty,
            `PO received #${req.params.id}`,
            req.user.id,
            po.business_id || req.user.business_id,
            po.branch_id || req.user.branch_id || null
          ]
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