const express = require("express");
const { query } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");

const router = express.Router();

router.use(authenticateToken);

// get KDS orders
router.get("/", requirePermission("kds"), async (req, res) => {
  try {
    const orders = await query("SELECT * FROM kds_orders ORDER BY id DESC");
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
router.post("/", requirePermission("kds"), async (req, res) => {
  try {
    const { ticket_name, customer, items = [] } = req.body;

    const result = await query(
      "INSERT INTO kds_orders (ticket_name, customer, status) VALUES (?, ?, 'new')",
      [ticket_name, customer]
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
router.patch("/:id/status", requirePermission("kds"), async (req, res) => {
  try {
    const { status } = req.body;
    await query("UPDATE kds_orders SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ success: true, message: "KDS status updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;