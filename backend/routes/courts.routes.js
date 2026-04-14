const express = require("express");
const { query } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");

const router = express.Router();

router.use(authenticateToken);

/**
 * Helper: reset expired courts automatically
 */
async function syncExpiredCourts() {
  await query(`
    UPDATE courts
    SET
      status = 'available',
      current_customer = NULL,
      started_at = NULL,
      duration_minutes = NULL,
      end_at = NULL
    WHERE status = 'occupied'
      AND end_at IS NOT NULL
      AND end_at <= NOW()
  `);
}

/** * courts/ get all courts */
router.get("/", requirePermission("courts"), async (req, res) => {
  try {
    await syncExpiredCourts();

    const rows = await query(`
      SELECT
        c.*,
        p.name AS linked_product_name,
        p.hourly_rate,
        CASE
          WHEN c.status = 'occupied' AND c.end_at IS NOT NULL
          THEN GREATEST(TIMESTAMPDIFF(SECOND, NOW(), c.end_at), 0)
          ELSE 0
        END AS remaining_seconds,
        CASE
          WHEN c.status = 'occupied' AND c.end_at IS NOT NULL
          THEN GREATEST(CEIL(TIMESTAMPDIFF(SECOND, NOW(), c.end_at) / 60), 0)
          ELSE 0
        END AS remaining_minutes
      FROM courts c
      LEFT JOIN products p ON p.id = c.linked_product_id
      ORDER BY c.id ASC
    `);

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
/*** courts/ get single court*/
router.get("/:id", requirePermission("courts"), async (req, res) => {
  try {
    await syncExpiredCourts();

    const rows = await query(`
      SELECT
        c.*,
        p.name AS linked_product_name,
        p.hourly_rate,
        CASE
          WHEN c.status = 'occupied' AND c.end_at IS NOT NULL
          THEN GREATEST(TIMESTAMPDIFF(SECOND, NOW(), c.end_at), 0)
          ELSE 0
        END AS remaining_seconds,
        CASE
          WHEN c.status = 'occupied' AND c.end_at IS NOT NULL
          THEN GREATEST(CEIL(TIMESTAMPDIFF(SECOND, NOW(), c.end_at) / 60), 0)
          ELSE 0
        END AS remaining_minutes
      FROM courts c
      LEFT JOIN products p ON p.id = c.linked_product_id
      WHERE c.id = ?
      LIMIT 1
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Court not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
/** courts/ add court*/
router.post("/", requirePermission("courts"), async (req, res) => {
  try {
    const {
      name,
      icon = "🎮",
      type,
      mode = "sports",
      linked_product_id = null
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: "Name and type are required"
      });
    }

    await query(
      "INSERT INTO courts (name, icon, type, mode, linked_product_id) VALUES (?, ?, ?, ?, ?)",
      [name, icon, type, mode, linked_product_id]
    );

    res.status(201).json({ success: true, message: "Court created" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
/** * courts/ start court with timer*/
router.post("/:id/start", requirePermission("courts"), async (req, res) => {
  try {
    const { customer = "Walk-in", hours = 0, minutes = 0 } = req.body;

    const totalMinutes = (Number(hours) * 60) + Number(minutes);

    if (totalMinutes <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid duration"
      });
    }

    const existing = await query(
      "SELECT * FROM courts WHERE id = ? LIMIT 1",
      [req.params.id]
    );

    if (!existing.length) {
      return res.status(404).json({
        success: false,
        message: "Court not found"
      });
    }

    if (existing[0].status === "occupied") {
      return res.status(400).json({
        success: false,
        message: "Court is already occupied"
      });
    }

    await query(`
      UPDATE courts
      SET
        status = 'occupied',
        current_customer = ?,
        started_at = NOW(),
        duration_minutes = ?,
        end_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)
      WHERE id = ?
    `, [customer, totalMinutes, totalMinutes, req.params.id]);

    const rows = await query(`
      SELECT
        c.*,
        CASE
          WHEN c.status = 'occupied' AND c.end_at IS NOT NULL
          THEN GREATEST(TIMESTAMPDIFF(SECOND, NOW(), c.end_at), 0)
          ELSE 0
        END AS remaining_seconds,
        CASE
          WHEN c.status = 'occupied' AND c.end_at IS NOT NULL
          THEN GREATEST(CEIL(TIMESTAMPDIFF(SECOND, NOW(), c.end_at) / 60), 0)
          ELSE 0
        END AS remaining_minutes
      FROM courts c
      WHERE c.id = ?
      LIMIT 1
    `, [req.params.id]);

    res.json({
      success: true,
      message: "Court session started",
      data: rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
/**
 * courts/ extend timer
 * body:
 * {
 *   "hours": 0,
 *   "minutes": 30
 * }
 */
router.post("/:id/extend", requirePermission("courts"), async (req, res) => {
  try {
    const { hours = 0, minutes = 0 } = req.body;
    const extraMinutes = (Number(hours) * 60) + Number(minutes);

    if (extraMinutes <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid extension time"
      });
    }

    const rows = await query(
      "SELECT * FROM courts WHERE id = ? LIMIT 1",
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Court not found"
      });
    }

    const court = rows[0];

    if (court.status !== "occupied" || !court.end_at) {
      return res.status(400).json({
        success: false,
        message: "Court is not currently running"
      });
    }

    await query(`
      UPDATE courts
      SET
        duration_minutes = COALESCE(duration_minutes, 0) + ?,
        end_at = DATE_ADD(end_at, INTERVAL ? MINUTE)
      WHERE id = ?
    `, [extraMinutes, extraMinutes, req.params.id]);

    const updated = await query(`
      SELECT
        c.*,
        CASE
          WHEN c.status = 'occupied' AND c.end_at IS NOT NULL
          THEN GREATEST(TIMESTAMPDIFF(SECOND, NOW(), c.end_at), 0)
          ELSE 0
        END AS remaining_seconds,
        CASE
          WHEN c.status = 'occupied' AND c.end_at IS NOT NULL
          THEN GREATEST(CEIL(TIMESTAMPDIFF(SECOND, NOW(), c.end_at) / 60), 0)
          ELSE 0
        END AS remaining_minutes
      FROM courts c
      WHERE c.id = ?
      LIMIT 1
    `, [req.params.id]);

    res.json({
      success: true,
      message: "Court timer extended",
      data: updated[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
/**
 * courts/ end court manually
 */
router.post("/:id/end", requirePermission("courts"), async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        c.*,
        p.hourly_rate,
        p.cost,
        p.id AS product_id,
        CASE
          WHEN c.status = 'occupied' AND c.end_at IS NOT NULL
          THEN GREATEST(TIMESTAMPDIFF(SECOND, NOW(), c.end_at), 0)
          ELSE 0
        END AS remaining_seconds
      FROM courts c
      LEFT JOIN products p ON p.id = c.linked_product_id
      WHERE c.id = ?
      LIMIT 1
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Court not found" });
    }

    const court = rows[0];

    await query(`
      UPDATE courts
      SET
        status = 'available',
        current_customer = NULL,
        started_at = NULL,
        duration_minutes = NULL,
        end_at = NULL
      WHERE id = ?
    `, [req.params.id]);

    res.json({
      success: true,
      message: "Court session ended",
      data: court
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
/**
 * courts/ delete court
 */
router.delete("/:id", requirePermission("courts"), async (req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM courts WHERE id = ? LIMIT 1",
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Court not found"
      });
    }

    const court = rows[0];

    if (court.status === "occupied") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete an occupied court. End the session first."
      });
    }

    await query("DELETE FROM courts WHERE id = ?", [req.params.id]);

    res.json({
      success: true,
      message: "Court deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
module.exports = router;