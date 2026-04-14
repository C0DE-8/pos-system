const express = require("express");
const multer = require("multer");
const { query } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");
const { uploadBusinessLogo, uploadBranchImage } = require("../middleware/uploadBusinessImage");
const { ensureBusinessContext, isAdmin } = require("../utils/tenant");

const router = express.Router();

router.use(authenticateToken);

const settingsPermissionMiddleware = requirePermission("settings");
router.use((req, res, next) => {
  if (req.user?.role === "owner") return next();
  return settingsPermissionMiddleware(req, res, next);
});

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function isAdminOrOwner(user) {
  return isAdmin(user);
}

function normalizeBoolean(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return Number(fallback) ? 1 : 0;
  if (String(value).toLowerCase() === "true") return 1;
  if (String(value).toLowerCase() === "false") return 0;
  return Number(value) ? 1 : 0;
}

function parseUpload(req, res, uploadMiddleware) {
  return new Promise((resolve) => {
    uploadMiddleware(req, res, (error) => {
      if (!error) return resolve(true);

      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({ success: false, message: "Image must be 2MB or less" });
          return resolve(false);
        }
        res.status(400).json({ success: false, message: error.message });
        return resolve(false);
      }

      res.status(400).json({ success: false, message: error.message || "Invalid upload" });
      return resolve(false);
    });
  });
}

function ensureBusinessAccess(req, res, businessId) {
  if (isAdminOrOwner(req.user)) return true;
  if (Number(req.user.business_id) === Number(businessId)) return true;
  res.status(403).json({ success: false, message: "Access denied for this business" });
  return false;
}

function requireAdminOrOwner(req, res) {
  if (isAdminOrOwner(req.user)) return true;
  res.status(403).json({ success: false, message: "Admin/owner access required" });
  return false;
}

// list businesses
router.get("/", async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;

    const where = [];
    const params = [];
    if (!isAdminOrOwner(req.user)) {
      where.push("b.id = ?");
      params.push(req.user.business_id);
    }

    const rows = await query(
      `
      SELECT
        b.id,
        b.name,
        b.slug,
        b.logo_url,
        b.phone,
        b.email,
        b.address,
        b.currency,
        b.tax_rate,
        b.is_active,
        b.created_at,
        b.updated_at,
        COUNT(bb.id) AS branch_count
      FROM businesses b
      LEFT JOIN business_branches bb ON bb.business_id = b.id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      GROUP BY b.id
      ORDER BY b.id DESC
      `,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// view one business with summary
router.get("/:id", async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    if (!ensureBusinessAccess(req, res, req.params.id)) return;

    const rows = await query(
      `
      SELECT
        b.*,
        COUNT(bb.id) AS total_branches,
        SUM(CASE WHEN bb.is_active = 1 THEN 1 ELSE 0 END) AS active_branches,
        SUM(CASE WHEN bb.is_active = 0 THEN 1 ELSE 0 END) AS inactive_branches
      FROM businesses b
      LEFT JOIN business_branches bb ON bb.business_id = b.id
      WHERE b.id = ?
      GROUP BY b.id
      LIMIT 1
      `,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// create business
router.post("/", async (req, res) => {
  try {
    if (!requireAdminOrOwner(req, res)) return;
    const uploaded = await parseUpload(req, res, uploadBusinessLogo);
    if (!uploaded) return;

    const {
      name,
      slug,
      phone,
      email,
      address,
      currency = "NGN",
      tax_rate = 0,
      is_active = 1,
      create_default_branch = 0,
      default_branch_name = "Main Branch",
      default_branch_slug = "main-branch"
    } = req.body;

    if (!name || !String(name).trim()) {
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

    const logoUrl = req.file ? `/uploads/businesses/${req.file.filename}` : null;

    const result = await query(
      `INSERT INTO businesses (name, slug, logo_url, phone, email, address, currency, tax_rate, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(name).trim(),
        finalSlug,
        logoUrl,
        phone || null,
        email || null,
        address || null,
        currency,
        Number(tax_rate) || 0,
        normalizeBoolean(is_active, 1)
      ]
    );

    let branchId = null;
    if (normalizeBoolean(create_default_branch, 0)) {
      const branchName = String(default_branch_name || "Main Branch").trim();
      const branchSlug = slugify(default_branch_slug || branchName || "main-branch");
      const branchResult = await query(
        `INSERT INTO business_branches
         (business_id, name, slug, is_main, is_active)
         VALUES (?, ?, ?, 1, 1)`,
        [result.insertId, branchName, branchSlug]
      );
      branchId = branchResult.insertId;
    }

    return res.status(201).json({
      success: true,
      message: "Business created successfully",
      business_id: result.insertId,
      default_branch_id: branchId
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// update business
router.put("/:id", async (req, res) => {
  try {
    if (!requireAdminOrOwner(req, res)) return;
    const uploaded = await parseUpload(req, res, uploadBusinessLogo);
    if (!uploaded) return;

    const rows = await query("SELECT * FROM businesses WHERE id = ? LIMIT 1", [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    const business = rows[0];
    const {
      name,
      slug,
      phone,
      email,
      address,
      currency = business.currency,
      tax_rate = business.tax_rate,
      is_active = business.is_active
    } = req.body;

    const finalName = String(name || business.name).trim();
    const finalSlug = slugify(slug || finalName);
    const dup = await query(
      "SELECT id FROM businesses WHERE slug = ? AND id <> ? LIMIT 1",
      [finalSlug, req.params.id]
    );
    if (dup.length) {
      return res.status(400).json({ success: false, message: "Business slug already exists" });
    }

    const logoUrl = req.file ? `/uploads/businesses/${req.file.filename}` : business.logo_url;

    await query(
      `UPDATE businesses
       SET name = ?, slug = ?, logo_url = ?, phone = ?, email = ?, address = ?, currency = ?, tax_rate = ?, is_active = ?
       WHERE id = ?`,
      [
        finalName,
        finalSlug,
        logoUrl,
        phone ?? business.phone,
        email ?? business.email,
        address ?? business.address,
        currency,
        Number(tax_rate) || 0,
        normalizeBoolean(is_active, business.is_active),
        req.params.id
      ]
    );

    return res.json({ success: true, message: "Business updated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// business status toggle
router.patch("/:id/status", async (req, res) => {
  try {
    if (!requireAdminOrOwner(req, res)) return;
    const { is_active } = req.body;

    await query("UPDATE businesses SET is_active = ? WHERE id = ?", [
      normalizeBoolean(is_active, 0),
      req.params.id
    ]);

    return res.json({ success: true, message: "Business status updated" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// list branches
router.get("/:businessId/branches", async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    if (!ensureBusinessAccess(req, res, req.params.businessId)) return;

    const rows = await query(
      `
      SELECT
        bb.id,
        bb.business_id,
        bb.name,
        bb.slug,
        bb.phone,
        bb.email,
        bb.address,
        bb.image_url,
        bb.is_main,
        bb.is_active,
        bb.created_at,
        bb.updated_at,
        (SELECT COUNT(*) FROM users u WHERE u.branch_id = bb.id) AS users_count,
        (SELECT COUNT(*) FROM products p WHERE p.branch_id = bb.id) AS products_count,
        (SELECT COUNT(*) FROM sales s WHERE s.branch_id = bb.id) AS sales_count
      FROM business_branches bb
      WHERE bb.business_id = ?
      ORDER BY bb.id DESC
      `,
      [req.params.businessId]
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// view branch
router.get("/:businessId/branches/:branchId", async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    if (!ensureBusinessAccess(req, res, req.params.businessId)) return;

    const rows = await query(
      `SELECT *
       FROM business_branches
       WHERE id = ? AND business_id = ?
       LIMIT 1`,
      [req.params.branchId, req.params.businessId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// create branch
router.post("/:businessId/branches", async (req, res) => {
  try {
    if (!requireAdminOrOwner(req, res)) return;
    if (!ensureBusinessAccess(req, res, req.params.businessId)) return;
    const uploaded = await parseUpload(req, res, uploadBranchImage);
    if (!uploaded) return;

    const businesses = await query("SELECT id FROM businesses WHERE id = ? LIMIT 1", [req.params.businessId]);
    if (!businesses.length) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    const { name, slug, phone, email, address, is_main = 0, is_active = 1 } = req.body;
    if (!name || !String(name).trim()) {
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

    const isMain = normalizeBoolean(is_main, 0);
    if (isMain) {
      await query("UPDATE business_branches SET is_main = 0 WHERE business_id = ?", [req.params.businessId]);
    }

    const imageUrl = req.file ? `/uploads/branches/${req.file.filename}` : null;
    const result = await query(
      `INSERT INTO business_branches
       (business_id, name, slug, phone, email, address, image_url, is_main, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.businessId,
        String(name).trim(),
        finalSlug,
        phone || null,
        email || null,
        address || null,
        imageUrl,
        isMain,
        normalizeBoolean(is_active, 1)
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Branch created successfully",
      branch_id: result.insertId
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// update branch
router.put("/:businessId/branches/:branchId", async (req, res) => {
  try {
    if (!requireAdminOrOwner(req, res)) return;
    if (!ensureBusinessAccess(req, res, req.params.businessId)) return;
    const uploaded = await parseUpload(req, res, uploadBranchImage);
    if (!uploaded) return;

    const rows = await query(
      "SELECT * FROM business_branches WHERE id = ? AND business_id = ? LIMIT 1",
      [req.params.branchId, req.params.businessId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }
    const branch = rows[0];

    const finalName = String(req.body.name || branch.name).trim();
    const finalSlug = slugify(req.body.slug || finalName);
    const dup = await query(
      "SELECT id FROM business_branches WHERE business_id = ? AND slug = ? AND id <> ? LIMIT 1",
      [req.params.businessId, finalSlug, req.params.branchId]
    );
    if (dup.length) {
      return res.status(400).json({ success: false, message: "Branch slug already exists in this business" });
    }

    const isMain = normalizeBoolean(req.body.is_main, branch.is_main);
    if (isMain) {
      await query(
        "UPDATE business_branches SET is_main = 0 WHERE business_id = ? AND id <> ?",
        [req.params.businessId, req.params.branchId]
      );
    }

    const imageUrl = req.file ? `/uploads/branches/${req.file.filename}` : branch.image_url;

    await query(
      `UPDATE business_branches
       SET name = ?, slug = ?, phone = ?, email = ?, address = ?, image_url = ?, is_main = ?, is_active = ?
       WHERE id = ? AND business_id = ?`,
      [
        finalName,
        finalSlug,
        req.body.phone ?? branch.phone,
        req.body.email ?? branch.email,
        req.body.address ?? branch.address,
        imageUrl,
        isMain,
        normalizeBoolean(req.body.is_active, branch.is_active),
        req.params.branchId,
        req.params.businessId
      ]
    );

    return res.json({ success: true, message: "Branch updated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// branch status toggle
router.patch("/:businessId/branches/:branchId/status", async (req, res) => {
  try {
    if (!requireAdminOrOwner(req, res)) return;
    if (!ensureBusinessAccess(req, res, req.params.businessId)) return;

    await query(
      `UPDATE business_branches
       SET is_active = ?
       WHERE id = ? AND business_id = ?`,
      [
        normalizeBoolean(req.body.is_active, 0),
        req.params.branchId,
        req.params.businessId
      ]
    );

    return res.json({ success: true, message: "Branch status updated" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// assign user to business/branch
router.patch("/:businessId/branches/:branchId/users/:userId", async (req, res) => {
  try {
    if (!requireAdminOrOwner(req, res)) return;
    if (!ensureBusinessAccess(req, res, req.params.businessId)) return;

    const branchRows = await query(
      `SELECT id, business_id
       FROM business_branches
       WHERE id = ? AND business_id = ?
       LIMIT 1`,
      [req.params.branchId, req.params.businessId]
    );
    if (!branchRows.length) {
      return res.status(404).json({ success: false, message: "Branch not found for this business" });
    }

    const userRows = await query("SELECT id FROM users WHERE id = ? LIMIT 1", [req.params.userId]);
    if (!userRows.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await query(
      `UPDATE users
       SET business_id = ?, branch_id = ?
       WHERE id = ?`,
      [req.params.businessId, req.params.branchId, req.params.userId]
    );

    return res.json({ success: true, message: "User assigned to branch successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
