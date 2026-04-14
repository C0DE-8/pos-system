const express = require("express");
const { query } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");
const { ensureBusinessContext } = require("../utils/tenant");

const router = express.Router();

router.use(authenticateToken);

// members/ get members
router.get("/", requirePermission("members"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const rows = await query("SELECT * FROM members WHERE business_id = ? ORDER BY id DESC", [req.user.business_id]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
//members/ add member
router.post("/", requirePermission("members"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { name, phone, email, tier = "Walk-in" } = req.body;
    const memberCode = `M${Date.now()}`;

    await query(
      "INSERT INTO members (member_code, name, phone, email, tier, business_id) VALUES (?, ?, ?, ?, ?, ?)",
      [memberCode, name, phone, email, tier, req.user.business_id]
    );

    res.status(201).json({ success: true, message: "Member added", memberCode });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// members/ member history
router.get("/:id/history", requirePermission("members"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const memberRows = await query("SELECT * FROM members WHERE id = ? AND business_id = ? LIMIT 1", [req.params.id, req.user.business_id]);
    if (!memberRows.length) return res.status(404).json({ success: false, message: "Member not found" });

    const member = memberRows[0];
    const sales = await query("SELECT * FROM sales WHERE customer = ? AND business_id = ? ORDER BY sale_date DESC", [member.name, req.user.business_id]);

    res.json({
      success: true,
      member,
      sales
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;