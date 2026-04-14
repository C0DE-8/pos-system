const express = require("express");
const { query } = require("../config/db");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole("admin", "manager"));

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

router.get("/", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM businesses ORDER BY id DESC");
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM businesses WHERE id = ? LIMIT 1", [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, slug, logo_url, phone, email, address, currency = "NGN", tax_rate = 0 } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Business name is required" });
    }

    const finalSlug = slugify(slug || name);
    if (!finalSlug) {
      return res.status(400).json({ success: false, message: "Business slug is required" });
    }

    const existing = await query("SELECT id FROM businesses WHERE slug = ? LIMIT 1", [finalSlug]);
    if (existing.length) {
      return res.status(400).json({ success: false, message: "Business slug already exists" });
    }

    const result = await query(
      `INSERT INTO businesses (name, slug, logo_url, phone, email, address, currency, tax_rate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, finalSlug, logo_url || null, phone || null, email || null, address || null, currency, tax_rate]
    );

    res.status(201).json({ success: true, message: "Business created", business_id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, slug, logo_url, phone, email, address, currency = "NGN", tax_rate = 0, is_active = 1 } = req.body;
    const rows = await query("SELECT * FROM businesses WHERE id = ? LIMIT 1", [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    const finalSlug = slugify(slug || name || rows[0].name);
    const dup = await query("SELECT id FROM businesses WHERE slug = ? AND id <> ? LIMIT 1", [finalSlug, req.params.id]);
    if (dup.length) {
      return res.status(400).json({ success: false, message: "Business slug already exists" });
    }

    await query(
      `UPDATE businesses
       SET name = ?, slug = ?, logo_url = ?, phone = ?, email = ?, address = ?, currency = ?, tax_rate = ?, is_active = ?
       WHERE id = ?`,
      [
        name || rows[0].name,
        finalSlug,
        logo_url ?? rows[0].logo_url,
        phone ?? rows[0].phone,
        email ?? rows[0].email,
        address ?? rows[0].address,
        currency,
        tax_rate,
        Number(is_active) ? 1 : 0,
        req.params.id
      ]
    );

    res.json({ success: true, message: "Business updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const { is_active } = req.body;
    await query("UPDATE businesses SET is_active = ? WHERE id = ?", [Number(is_active) ? 1 : 0, req.params.id]);
    res.json({ success: true, message: "Business status updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:businessId/branches", async (req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM business_branches WHERE business_id = ? ORDER BY id DESC",
      [req.params.businessId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:businessId/branches/:branchId", async (req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM business_branches WHERE id = ? AND business_id = ? LIMIT 1",
      [req.params.branchId, req.params.businessId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/:businessId/branches", async (req, res) => {
  try {
    const { name, slug, phone, email, address, is_main = 0 } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Branch name is required" });
    }
    const finalSlug = slugify(slug || name);
    const dup = await query(
      "SELECT id FROM business_branches WHERE business_id = ? AND slug = ? LIMIT 1",
      [req.params.businessId, finalSlug]
    );
    if (dup.length) {
      return res.status(400).json({ success: false, message: "Branch slug already exists in this business" });
    }

    const result = await query(
      `INSERT INTO business_branches (business_id, name, slug, phone, email, address, is_main)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.params.businessId, name, finalSlug, phone || null, email || null, address || null, Number(is_main) ? 1 : 0]
    );
    res.status(201).json({ success: true, message: "Branch created", branch_id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/:businessId/branches/:branchId", async (req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM business_branches WHERE id = ? AND business_id = ? LIMIT 1",
      [req.params.branchId, req.params.businessId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }
    const branch = rows[0];
    const finalSlug = slugify(req.body.slug || req.body.name || branch.name);
    const dup = await query(
      "SELECT id FROM business_branches WHERE business_id = ? AND slug = ? AND id <> ? LIMIT 1",
      [req.params.businessId, finalSlug, req.params.branchId]
    );
    if (dup.length) {
      return res.status(400).json({ success: false, message: "Branch slug already exists in this business" });
    }

    await query(
      `UPDATE business_branches
       SET name = ?, slug = ?, phone = ?, email = ?, address = ?, is_main = ?, is_active = ?
       WHERE id = ? AND business_id = ?`,
      [
        req.body.name || branch.name,
        finalSlug,
        req.body.phone ?? branch.phone,
        req.body.email ?? branch.email,
        req.body.address ?? branch.address,
        Number(req.body.is_main ?? branch.is_main) ? 1 : 0,
        Number(req.body.is_active ?? branch.is_active) ? 1 : 0,
        req.params.branchId,
        req.params.businessId
      ]
    );

    res.json({ success: true, message: "Branch updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/:businessId/branches/:branchId/status", async (req, res) => {
  try {
    const { is_active } = req.body;
    await query(
      "UPDATE business_branches SET is_active = ? WHERE id = ? AND business_id = ?",
      [Number(is_active) ? 1 : 0, req.params.branchId, req.params.businessId]
    );
    res.json({ success: true, message: "Branch status updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
