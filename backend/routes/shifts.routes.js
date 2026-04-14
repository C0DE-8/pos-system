const express = require("express");
const { query } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");
const { ensureBusinessContext } = require("../utils/tenant");

const router = express.Router();

router.use(authenticateToken);

// get current open shift
router.get("/current", requirePermission("shifts"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const rows = await query(
      "SELECT * FROM shifts WHERE status='open' AND business_id = ? ORDER BY id DESC LIMIT 1",
      [req.user.business_id]
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// open shift
router.post("/open", requirePermission("shifts"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { opening_float = 0, open_note = "" } = req.body;

    const existing = await query("SELECT id FROM shifts WHERE status='open' AND business_id = ? LIMIT 1", [req.user.business_id]);
    if (existing.length) {
      return res.status(400).json({ success: false, message: "A shift is already open" });
    }

    const shiftCode = `SH-${Date.now()}`;

    await query(
      `INSERT INTO shifts (shift_code, opened_by, open_time, opening_float, open_note, status)
       VALUES (?, ?, NOW(), ?, ?, 'open')`,
      [shiftCode, req.user.id, opening_float, open_note]
    );
    await query("UPDATE shifts SET business_id = ?, branch_id = ? WHERE shift_code = ? LIMIT 1", [req.user.business_id, req.user.branch_id || null, shiftCode]);

    res.status(201).json({ success: true, message: "Shift opened", shiftCode });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// close shift
router.post("/close/:id", requirePermission("shifts"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { closing_cash = 0, closing_note = "" } = req.body;

    await query(
      `UPDATE shifts
       SET closed_by=?, closed_time=NOW(), closing_cash=?, closing_note=?, status='closed'
       WHERE id=? AND status='open' AND business_id = ?`,
      [req.user.id, closing_cash, closing_note, req.params.id, req.user.business_id]
    );

    res.json({ success: true, message: "Shift closed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;