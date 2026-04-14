const express = require("express");
const bcrypt = require("bcryptjs");
const { query } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");
const { ensureBusinessContext, isAdmin } = require("../utils/tenant");

const router = express.Router();

router.use(authenticateToken);

router.get("/", requirePermission("users"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const where = [];
    const params = [];
    if (!isAdmin(req.user)) {
      where.push("u.business_id = ?");
      params.push(req.user.business_id);
    }
    const rows = await query(`
      SELECT u.id, u.name, u.email, u.avatar, u.role, u.total_hours, u.is_active, u.created_at, p.*
      FROM users u
      LEFT JOIN user_permissions p ON p.user_id = u.id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY u.id DESC
    `, params);

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/:id", requirePermission("users"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { name, email, avatar, role, pin, permissions } = req.body;
    const userId = req.params.id;

    await query(
      `UPDATE users SET name = ?, email = ?, avatar = ?, role = ?
       WHERE id = ? ${isAdmin(req.user) ? "" : "AND business_id = ?"}`,
      isAdmin(req.user)
        ? [name, email, avatar || "👤", role, userId]
        : [name, email, avatar || "👤", role, userId, req.user.business_id]
    );

    if (pin) {
      const pinHash = await bcrypt.hash(pin, 10);
      await query("UPDATE users SET pin_hash = ? WHERE id = ?", [pinHash, userId]);
    }

    if (permissions) {
      await query(
        `UPDATE user_permissions SET
          pos=?, courts=?, inventory=?, sales=?, members=?, users=?, settings=?, stockAdj=?, refunds=?, shifts=?, purchaseOrders=?, analytics=?, kds=?, giftCards=?
         WHERE user_id=?`,
        [
          permissions.pos ? 1 : 0,
          permissions.courts ? 1 : 0,
          permissions.inventory ? 1 : 0,
          permissions.sales ? 1 : 0,
          permissions.members ? 1 : 0,
          permissions.users ? 1 : 0,
          permissions.settings ? 1 : 0,
          permissions.stockAdj ? 1 : 0,
          permissions.refunds ? 1 : 0,
          permissions.shifts ? 1 : 0,
          permissions.purchaseOrders ? 1 : 0,
          permissions.analytics ? 1 : 0,
          permissions.kds ? 1 : 0,
          permissions.giftCards ? 1 : 0,
          userId
        ]
      );
    }

    res.json({ success: true, message: "User updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/clock/history", requirePermission("users"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const rows = await query(`
      SELECT c.id, u.name, c.event_type, c.event_time
      FROM clock_events c
      JOIN users u ON u.id = c.user_id
      WHERE u.business_id = ?
      ORDER BY c.event_time DESC
      LIMIT 100
    `, [req.user.business_id]);

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;