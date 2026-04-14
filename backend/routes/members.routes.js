const express = require("express");
const { query } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");

const router = express.Router();

router.use(authenticateToken);

// members/ get members
router.get("/", requirePermission("members"), async (req, res) => {
  try {
    const rows = await query("SELECT * FROM members ORDER BY id DESC");
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
//members/ add member
router.post("/", requirePermission("members"), async (req, res) => {
  try {
    const { name, phone, email, tier = "Walk-in" } = req.body;
    const memberCode = `M${Date.now()}`;

    await query(
      "INSERT INTO members (member_code, name, phone, email, tier) VALUES (?, ?, ?, ?, ?)",
      [memberCode, name, phone, email, tier]
    );

    res.status(201).json({ success: true, message: "Member added", memberCode });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// members/ member history
router.get("/:id/history", requirePermission("members"), async (req, res) => {
  try {
    const memberRows = await query("SELECT * FROM members WHERE id = ? LIMIT 1", [req.params.id]);
    if (!memberRows.length) return res.status(404).json({ success: false, message: "Member not found" });

    const member = memberRows[0];
    const sales = await query("SELECT * FROM sales WHERE customer = ? ORDER BY sale_date DESC", [member.name]);

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