const express = require("express");
const { query } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");
const { ensureBusinessContext } = require("../utils/tenant");

const router = express.Router();

router.use(authenticateToken);

// all gift cards
router.get("/", requirePermission("giftCards"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const rows = await query("SELECT * FROM gift_cards WHERE business_id = ? ORDER BY id DESC", [req.user.business_id]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// issue gift card
router.post("/", requirePermission("giftCards"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { customer = "", balance } = req.body;
    const code = `ARENA-${Date.now()}`;

    await query(
      "INSERT INTO gift_cards (code, customer, balance, active, business_id) VALUES (?, ?, ?, 1, ?)",
      [code, customer, balance, req.user.business_id]
    );

    res.status(201).json({ success: true, message: "Gift card issued", code });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// validate gift card
router.get("/validate/:code", authenticateToken, async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const rows = await query(
      "SELECT * FROM gift_cards WHERE code = ? AND active = 1 AND business_id = ? LIMIT 1",
      [req.params.code, req.user.business_id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Gift card not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;