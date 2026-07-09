const express = require("express");
const { query } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");
const { ensureBusinessContext } = require("../utils/tenant");

const router = express.Router();

router.use(authenticateToken);

const DEFAULT_TIER_NAMES = ["Regular", "VIP"];

const normalizeTierName = (value) => String(value || "").trim();
const normalizeDiscountPct = (value) => {
  const discountPct = Number(value ?? 0);
  if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100) {
    return null;
  }
  return discountPct;
};

async function ensureDefaultMembershipTiers(businessId) {
  for (const tierName of DEFAULT_TIER_NAMES) {
    const existing = await query(
      `SELECT id
       FROM membership_tiers
       WHERE business_id = ? AND LOWER(name) = LOWER(?)
       LIMIT 1`,
      [businessId, tierName]
    );

    if (!existing.length) {
      await query(
        `INSERT INTO membership_tiers (name, discount_pct, business_id)
         VALUES (?, ?, ?)`,
        [tierName, 0, businessId]
      );
    }
  }
}

async function getMembershipTiersForBusiness(businessId) {
  await ensureDefaultMembershipTiers(businessId);

  const tiers = await query(
    `SELECT id, name, discount_pct, business_id, created_at, updated_at
     FROM membership_tiers
     WHERE business_id = ?
     ORDER BY name ASC`,
    [businessId]
  );

  if (!tiers.length) return tiers;

  for (const tier of tiers) {
    await ensureTierCategoryDiscountRows(businessId, tier.id, tier.discount_pct || 0);
  }

  const discounts = await query(
    `SELECT
       mtcd.id,
       mtcd.membership_tier_id,
       mtcd.category_id,
       mtcd.discount_pct,
       c.name AS category_name,
       c.type AS category_type
     FROM membership_tier_category_discounts mtcd
     JOIN categories c ON c.id = mtcd.category_id
     WHERE mtcd.business_id = ?
     ORDER BY c.name ASC`,
    [businessId]
  );

  const discountMap = discounts.reduce((acc, row) => {
    const key = String(row.membership_tier_id);
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(row);
    return acc;
  }, new Map());

  return tiers.map((tier) => ({
    ...tier,
    category_discounts: discountMap.get(String(tier.id)) || []
  }));
}

async function getMembershipDiscountCategories(businessId) {
  return query(
    `SELECT id, name, type
     FROM categories
     WHERE business_id = ?
     ORDER BY name ASC`,
    [businessId]
  );
}

async function ensureTierCategoryDiscountRows(businessId, tierId, defaultDiscountPct = 0) {
  await query(
    `INSERT INTO membership_tier_category_discounts
      (membership_tier_id, category_id, discount_pct, business_id)
     SELECT ?, c.id, ?, c.business_id
     FROM categories c
     LEFT JOIN membership_tier_category_discounts mtcd
       ON mtcd.membership_tier_id = ?
      AND mtcd.category_id = c.id
     WHERE c.business_id = ?
       AND mtcd.id IS NULL`,
    [tierId, defaultDiscountPct, tierId, businessId]
  );
}

async function replaceTierCategoryDiscounts(businessId, tierId, categoryDiscounts) {
  if (!Array.isArray(categoryDiscounts)) return;

  const categories = await getMembershipDiscountCategories(businessId);
  const validCategoryIds = new Set(categories.map((category) => Number(category.id)));

  for (const item of categoryDiscounts) {
    const categoryId = Number(item.category_id);
    const discountPct = normalizeDiscountPct(item.discount_pct);

    if (!Number.isInteger(categoryId) || !validCategoryIds.has(categoryId)) {
      const error = new Error("Invalid discount category");
      error.statusCode = 400;
      throw error;
    }

    if (discountPct === null) {
      const error = new Error("Category discount must be between 0 and 100");
      error.statusCode = 400;
      throw error;
    }

    await query(
      `INSERT INTO membership_tier_category_discounts
        (membership_tier_id, category_id, discount_pct, business_id)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        discount_pct = VALUES(discount_pct),
        business_id = VALUES(business_id)`,
      [tierId, categoryId, discountPct, businessId]
    );
  }
}

async function resolveMembershipTierId(businessId, membershipTierId, tierName) {
  if (membershipTierId) {
    const rows = await query(
      `SELECT id
       FROM membership_tiers
       WHERE id = ? AND business_id = ?
       LIMIT 1`,
      [membershipTierId, businessId]
    );

    return rows.length ? rows[0].id : null;
  }

  const normalizedTierName = normalizeTierName(tierName);
  if (!normalizedTierName || normalizedTierName.toLowerCase() === "walk-in") {
    return null;
  }

  const rows = await query(
    `SELECT id
     FROM membership_tiers
     WHERE business_id = ? AND LOWER(name) = LOWER(?)
     LIMIT 1`,
    [businessId, normalizedTierName]
  );

  return rows.length ? rows[0].id : null;
}

async function getMemberById(memberId, businessId) {
  const rows = await query(
    `SELECT
       m.*,
       m.membership_tier_id,
       COALESCE(mt.name, m.tier) AS tier,
       COALESCE(mt.name, m.tier) AS membership_tier_name,
       COALESCE(mt.discount_pct, 0) AS membership_discount_pct
     FROM members m
     LEFT JOIN membership_tiers mt ON mt.id = m.membership_tier_id
     WHERE m.id = ? AND m.business_id = ?
     LIMIT 1`,
    [memberId, businessId]
  );

  return rows[0] || null;
}

router.get("/tiers", requirePermission("members"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;

    const tiers = await getMembershipTiersForBusiness(req.user.business_id);
    res.json({ success: true, data: tiers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/tiers/discount-categories", requirePermission("members"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;

    const categories = await getMembershipDiscountCategories(req.user.business_id);
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/tiers", requirePermission("members"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;

    const name = normalizeTierName(req.body.name);
    const discountPct = normalizeDiscountPct(
      req.body.discount_pct ?? req.body.discount_value ?? 0
    );

    if (!name) {
      return res.status(400).json({ success: false, message: "Tier name is required" });
    }

    if (discountPct === null) {
      return res.status(400).json({
        success: false,
        message: "Tier discount must be between 0 and 100"
      });
    }

    const existing = await query(
      `SELECT id
       FROM membership_tiers
       WHERE business_id = ? AND LOWER(name) = LOWER(?)
       LIMIT 1`,
      [req.user.business_id, name]
    );

    if (existing.length) {
      return res.status(409).json({
        success: false,
        message: "A membership tier with this name already exists"
      });
    }

    const result = await query(
      `INSERT INTO membership_tiers (name, discount_pct, business_id)
       VALUES (?, ?, ?)`,
      [name, discountPct, req.user.business_id]
    );

    await ensureTierCategoryDiscountRows(
      req.user.business_id,
      result.insertId,
      discountPct
    );

    await replaceTierCategoryDiscounts(
      req.user.business_id,
      result.insertId,
      req.body.category_discounts
    );

    const created = await query(
      `SELECT id, name, discount_pct, business_id, created_at, updated_at
       FROM membership_tiers
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Membership tier created",
      data: created[0] || null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/tiers/:id", requirePermission("members"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;

    const tierId = Number(req.params.id);
    const name = normalizeTierName(req.body.name);
    const discountPct = normalizeDiscountPct(
      req.body.discount_pct ?? req.body.discount_value ?? 0
    );

    if (!Number.isInteger(tierId) || tierId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid tier id" });
    }

    if (!name) {
      return res.status(400).json({ success: false, message: "Tier name is required" });
    }

    if (discountPct === null) {
      return res.status(400).json({
        success: false,
        message: "Tier discount must be between 0 and 100"
      });
    }

    const existingTier = await query(
      `SELECT id
       FROM membership_tiers
       WHERE id = ? AND business_id = ?
       LIMIT 1`,
      [tierId, req.user.business_id]
    );

    if (!existingTier.length) {
      return res.status(404).json({
        success: false,
        message: "Membership tier not found"
      });
    }

    const duplicate = await query(
      `SELECT id
       FROM membership_tiers
       WHERE business_id = ? AND LOWER(name) = LOWER(?) AND id <> ?
       LIMIT 1`,
      [req.user.business_id, name, tierId]
    );

    if (duplicate.length) {
      return res.status(409).json({
        success: false,
        message: "A membership tier with this name already exists"
      });
    }

    await query(
      `UPDATE membership_tiers
       SET name = ?, discount_pct = ?
       WHERE id = ? AND business_id = ?`,
      [name, discountPct, tierId, req.user.business_id]
    );

    await ensureTierCategoryDiscountRows(req.user.business_id, tierId, discountPct);
    await replaceTierCategoryDiscounts(
      req.user.business_id,
      tierId,
      req.body.category_discounts
    );

    await query(
      `UPDATE members
       SET tier = ?
       WHERE membership_tier_id = ? AND business_id = ?`,
      [name, tierId, req.user.business_id]
    );

    await query(
      `UPDATE pending_carts pc
       SET
        pc.membership_tier_name = ?,
        pc.membership_discount_pct = (
          SELECT COALESCE(
            ROUND((SUM(pci.final_price * (COALESCE(mtcd.discount_pct, mt.discount_pct, 0) / 100)) / NULLIF(pc.subtotal, 0)) * 100, 2),
            0
          )
          FROM pending_cart_items pci
          LEFT JOIN products p ON p.id = pci.product_id
          LEFT JOIN membership_tiers mt ON mt.id = pc.membership_tier_id
          LEFT JOIN membership_tier_category_discounts mtcd
            ON mtcd.membership_tier_id = pc.membership_tier_id
           AND mtcd.category_id = p.category_id
          WHERE pci.pending_cart_id = pc.id
        ),
        pc.membership_discount = (
          SELECT COALESCE(ROUND(SUM(pci.final_price * (COALESCE(mtcd.discount_pct, mt.discount_pct, 0) / 100)), 2), 0)
          FROM pending_cart_items pci
          LEFT JOIN products p ON p.id = pci.product_id
          LEFT JOIN membership_tier_category_discounts mtcd
            ON mtcd.membership_tier_id = pc.membership_tier_id
           AND mtcd.category_id = p.category_id
          LEFT JOIN membership_tiers mt ON mt.id = pc.membership_tier_id
          WHERE pci.pending_cart_id = pc.id
        )
       WHERE pc.membership_tier_id = ? AND pc.business_id = ? AND pc.status = 'pending'`,
      [name, tierId, req.user.business_id]
    );

    const updated = await query(
      `SELECT id, name, discount_pct, business_id, created_at, updated_at
       FROM membership_tiers
       WHERE id = ?
       LIMIT 1`,
      [tierId]
    );

    res.json({
      success: true,
      message: "Membership tier updated",
      data: updated[0] || null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/tiers/:id/category-discounts", requirePermission("members"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;

    const tierId = Number(req.params.id);

    if (!Number.isInteger(tierId) || tierId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid tier id" });
    }

    const existingTier = await query(
      `SELECT id, discount_pct
       FROM membership_tiers
       WHERE id = ? AND business_id = ?
       LIMIT 1`,
      [tierId, req.user.business_id]
    );

    if (!existingTier.length) {
      return res.status(404).json({
        success: false,
        message: "Membership tier not found"
      });
    }

    await ensureTierCategoryDiscountRows(
      req.user.business_id,
      tierId,
      existingTier[0].discount_pct || 0
    );
    await replaceTierCategoryDiscounts(
      req.user.business_id,
      tierId,
      req.body.category_discounts
    );

    const tiers = await getMembershipTiersForBusiness(req.user.business_id);
    const updatedTier = tiers.find((tier) => Number(tier.id) === tierId) || null;

    res.json({
      success: true,
      message: "Category discounts updated",
      data: updatedTier
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

router.get("/", requirePermission("members"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;

    await ensureDefaultMembershipTiers(req.user.business_id);

    const rows = await query(
      `SELECT
         m.*,
         m.membership_tier_id,
         COALESCE(mt.name, m.tier) AS tier,
         COALESCE(mt.name, m.tier) AS membership_tier_name,
         COALESCE(mt.discount_pct, 0) AS membership_discount_pct
       FROM members m
       LEFT JOIN membership_tiers mt ON mt.id = m.membership_tier_id
       WHERE m.business_id = ?
       ORDER BY m.id DESC`,
      [req.user.business_id]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", requirePermission("members"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;

    const { name, phone, email } = req.body;
    const membershipTierId = await resolveMembershipTierId(
      req.user.business_id,
      req.body.membership_tier_id,
      req.body.tier
    );

    if (!String(name || "").trim()) {
      return res.status(400).json({ success: false, message: "Member name is required" });
    }

    if (
      req.body.membership_tier_id !== undefined &&
      req.body.membership_tier_id !== null &&
      !membershipTierId
    ) {
      return res.status(400).json({ success: false, message: "Invalid membership tier" });
    }

    const memberCode = `M${Date.now()}`;
    const tierName = membershipTierId
      ? (
          await query(
            `SELECT name
             FROM membership_tiers
             WHERE id = ?
             LIMIT 1`,
            [membershipTierId]
          )
        )[0]?.name || null
      : normalizeTierName(req.body.tier) || null;

    const result = await query(
      `INSERT INTO members
       (member_code, name, phone, email, tier, membership_tier_id, business_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        memberCode,
        String(name).trim(),
        String(phone || "").trim() || null,
        String(email || "").trim() || null,
        tierName,
        membershipTierId,
        req.user.business_id
      ]
    );

    const member = await getMemberById(result.insertId, req.user.business_id);

    res.status(201).json({
      success: true,
      message: "Member added",
      memberCode,
      data: member
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:id/history", requirePermission("members"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;

    const member = await getMemberById(req.params.id, req.user.business_id);
    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const sales = await query(
      `SELECT *
       FROM sales
       WHERE business_id = ? AND (member_id = ? OR customer = ?)
       ORDER BY sale_date DESC`,
      [req.user.business_id, member.id, member.name]
    );

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
