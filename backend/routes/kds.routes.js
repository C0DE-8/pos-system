const express = require("express");
const { query } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");
const { ensureBusinessContext, isAdmin } = require("../utils/tenant");
const branchAccessMiddleware = require("../middleware/branchAccessMiddleware");

const router = express.Router();

router.use(authenticateToken);

// get KDS orders
router.get("/", requirePermission("kds"), branchAccessMiddleware, async (req, res) => {
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
    const orders = await query(
      `SELECT * FROM kds_orders
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY id DESC`,
      params
    );
    for (const order of orders) {
      order.items = await query(
        "SELECT * FROM kds_order_items WHERE kds_order_id = ?",
        [order.id]
      );
    }
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// create KDS order
router.post("/", requirePermission("kds"), branchAccessMiddleware, async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { ticket_name, customer, items = [] } = req.body;

    const result = await query(
      `INSERT INTO kds_orders (ticket_name, customer, status, business_id, branch_id)
       VALUES (?, ?, 'new', ?, ?)`,
      [ticket_name, customer, req.user.business_id, req.user.branch_id || null]
    );

    const kdsOrderId = result.insertId;

    for (const item of items) {
      await query(
        "INSERT INTO kds_order_items (kds_order_id, item_name, icon, mods, done) VALUES (?, ?, ?, ?, 0)",
        [kdsOrderId, item.item_name, item.icon || "", JSON.stringify(item.mods || [])]
      );
    }

    res.status(201).json({ success: true, message: "KDS order created", kdsOrderId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// update KDS status
router.patch("/:id/status", requirePermission("kds"), branchAccessMiddleware, async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { status } = req.body;
    const where = ["id = ?"];
    const params = [status, req.params.id];
    if (!isAdmin(req.user)) {
      where.push("business_id = ?");
      params.push(req.user.business_id);
      if (req.user.branch_id) {
        where.push("branch_id = ?");
        params.push(req.user.branch_id);
      }
    }
    await query(`UPDATE kds_orders SET status = ? WHERE ${where.join(" AND ")}`, params);
    res.json({ success: true, message: "KDS status updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;