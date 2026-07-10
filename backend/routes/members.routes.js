const express = require("express");
const { pool, query } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");
const { ensureBusinessContext } = require("../utils/tenant");

const router = express.Router();

const DEFAULT_TIER_NAMES = ["Regular", "VIP"];

const normalizeTierName = (value) => String(value || "").trim();
const generateWalletToken = (businessId) => {
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `WAL-${businessId || 0}-${Date.now()}-${randomPart}`;
};
const roundMoney = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Number(amount.toFixed(2));
};
const getRewardBadge = (lifetimePoints) => {
  const points = Number(lifetimePoints || 0);
  if (points >= 5000) return "Legend";
  if (points >= 2500) return "Champion";
  if (points >= 1000) return "Pro";
  if (points >= 250) return "Rising Star";
  return "Starter";
};
const normalizePointsAmount = (value) => {
  const points = Math.floor(Number(value));
  if (!Number.isFinite(points) || points <= 0) return null;
  return points;
};
const normalizeWalletAmount = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return roundMoney(amount);
};
const normalizeDiscountPct = (value) => {
  const discountPct = Number(value ?? 0);
  if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100) {
    return null;
  }
  return discountPct;
};
const normalizeMemberOptIn = (value) =>
  value === false || value === 0 || value === "0" ? 0 : 1;
const normalizeMemberPayload = (body = {}) => ({
  name: String(body.name || "").trim(),
  phone: String(body.phone || "").trim() || null,
  email: String(body.email || "").trim() || null,
  birthday: String(body.birthday || "").trim() || null,
  preferences: String(body.preferences || "").trim() || null,
  offerNotes: String(body.offer_notes || "").trim() || null,
  mobileWalletNotifications: normalizeMemberOptIn(body.mobile_wallet_notifications),
  memberStatus: ["active", "pending", "inactive"].includes(body.member_status)
    ? body.member_status
    : "active"
});

router.get("/wallet/balance/:token", async (req, res) => {
  try {
    const walletToken = String(req.params.token || "").trim();

    if (!walletToken) {
      return res.status(400).json({
        success: false,
        message: "Wallet token is required"
      });
    }

    const rows = await query(
      `SELECT
         m.name,
         m.member_code,
         COALESCE(mt.name, m.tier) AS membership_tier_name,
         m.wallet_token,
         m.wallet_balance,
         m.points,
         m.lifetime_points,
         m.reward_badge,
         m.created_at
       FROM members m
       LEFT JOIN membership_tiers mt ON mt.id = m.membership_tier_id
       WHERE m.wallet_token = ?
       LIMIT 1`,
      [walletToken]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found"
      });
    }

    res.json({
      success: true,
      data: {
        name: rows[0].name,
        member_code: rows[0].member_code,
        membership_tier_name: rows[0].membership_tier_name,
        wallet_token: rows[0].wallet_token,
        wallet_balance: roundMoney(rows[0].wallet_balance || 0),
        points: Number(rows[0].points || 0),
        lifetime_points: Number(rows[0].lifetime_points || 0),
        reward_badge: rows[0].reward_badge || getRewardBadge(rows[0].lifetime_points || 0),
        created_at: rows[0].created_at
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.use(authenticateToken);

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

    const memberPayload = normalizeMemberPayload(req.body);
    const membershipTierId = await resolveMembershipTierId(
      req.user.business_id,
      req.body.membership_tier_id,
      req.body.tier
    );

    if (!memberPayload.name) {
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
       (member_code, name, phone, email, birthday, preferences, offer_notes, mobile_wallet_notifications, member_status, registered_source, verified_at, tier, membership_tier_id, wallet_balance, wallet_token, business_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'staff', ?, ?, ?, ?, ?, ?)`,
      [
        memberCode,
        memberPayload.name,
        memberPayload.phone,
        memberPayload.email,
        memberPayload.birthday,
        memberPayload.preferences,
        memberPayload.offerNotes,
        memberPayload.mobileWalletNotifications,
        memberPayload.memberStatus,
        memberPayload.memberStatus === "active" ? new Date() : null,
        tierName,
        membershipTierId,
        0,
        generateWalletToken(req.user.business_id),
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

router.put("/:id", requirePermission("members"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;

    const memberId = Number(req.params.id);
    if (!Number.isInteger(memberId) || memberId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid member" });
    }

    const existing = await getMemberById(memberId, req.user.business_id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const memberPayload = normalizeMemberPayload(req.body);
    if (!memberPayload.name) {
      return res.status(400).json({ success: false, message: "Member name is required" });
    }

    const membershipTierId = await resolveMembershipTierId(
      req.user.business_id,
      req.body.membership_tier_id,
      req.body.tier
    );

    if (
      req.body.membership_tier_id !== undefined &&
      req.body.membership_tier_id !== null &&
      req.body.membership_tier_id !== "" &&
      !membershipTierId
    ) {
      return res.status(400).json({ success: false, message: "Invalid membership tier" });
    }

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

    await query(
      `UPDATE members
       SET name = ?,
           phone = ?,
           email = ?,
           birthday = ?,
           preferences = ?,
           offer_notes = ?,
           mobile_wallet_notifications = ?,
           member_status = ?,
           verified_at = CASE
             WHEN ? = 'active' AND verified_at IS NULL THEN NOW()
             ELSE verified_at
           END,
           tier = ?,
           membership_tier_id = ?
       WHERE id = ? AND business_id = ?`,
      [
        memberPayload.name,
        memberPayload.phone,
        memberPayload.email,
        memberPayload.birthday,
        memberPayload.preferences,
        memberPayload.offerNotes,
        memberPayload.mobileWalletNotifications,
        memberPayload.memberStatus,
        memberPayload.memberStatus,
        tierName,
        membershipTierId,
        memberId,
        req.user.business_id
      ]
    );

    const member = await getMemberById(memberId, req.user.business_id);

    res.json({
      success: true,
      message: "Member updated",
      data: member
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/:id", requirePermission("members"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;

    const memberId = Number(req.params.id);
    if (!Number.isInteger(memberId) || memberId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid member" });
    }

    const existing = await getMemberById(memberId, req.user.business_id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    await query(
      `DELETE FROM members
       WHERE id = ? AND business_id = ?`,
      [memberId, req.user.business_id]
    );

    res.json({
      success: true,
      message: "Member deleted"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/wallet/transactions", requirePermission("members"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;

    const memberId = req.query.member_id ? Number(req.query.member_id) : null;
    const params = [req.user.business_id];
    let where = `WHERE mwt.business_id = ?`;

    if (memberId) {
      where += ` AND mwt.member_id = ?`;
      params.push(memberId);
    }

    const rows = await query(
      `SELECT
         mwt.*,
         m.name AS member_name,
         m.member_code,
         u.name AS created_by_name
       FROM member_wallet_transactions mwt
       JOIN members m ON m.id = mwt.member_id
       LEFT JOIN users u ON u.id = mwt.created_by
       ${where}
       ORDER BY mwt.created_at DESC, mwt.id DESC
       LIMIT 250`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/wallet/transactions", requirePermission("members"), async (req, res) => {
  const conn = await pool.getConnection();

  try {
    if (!ensureBusinessContext(req, res)) return;

    const memberId = Number(req.body.member_id);
    const transactionType = String(req.body.transaction_type || "").toLowerCase();
    const amount = normalizeWalletAmount(req.body.amount);
    const note = String(req.body.note || "").trim() || null;
    const reference = String(req.body.reference || "").trim() || null;

    if (!Number.isInteger(memberId) || memberId <= 0) {
      return res.status(400).json({ success: false, message: "Member is required" });
    }

    if (!["credit", "debit"].includes(transactionType)) {
      return res.status(400).json({
        success: false,
        message: "Transaction type must be credit or debit"
      });
    }

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: "Wallet amount must be greater than zero"
      });
    }

    await conn.beginTransaction();

    const [memberRows] = await conn.execute(
      `SELECT id, name, member_code, wallet_balance, wallet_token
       FROM members
       WHERE id = ? AND business_id = ?
       LIMIT 1
       FOR UPDATE`,
      [memberId, req.user.business_id]
    );

    if (!memberRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const member = memberRows[0];
    const balanceBefore = roundMoney(member.wallet_balance || 0);
    const balanceAfter =
      transactionType === "credit"
        ? roundMoney(balanceBefore + amount)
        : roundMoney(balanceBefore - amount);

    if (balanceAfter < 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance"
      });
    }

    await conn.execute(
      `UPDATE members
       SET wallet_balance = ?
       WHERE id = ? AND business_id = ?`,
      [balanceAfter, memberId, req.user.business_id]
    );

    await conn.execute(
      `INSERT INTO member_wallet_transactions
       (member_id, wallet_token, transaction_type, amount, balance_before, balance_after, source, reference, note, created_by, business_id, branch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        memberId,
        member.wallet_token,
        transactionType,
        amount,
        balanceBefore,
        balanceAfter,
        "manual",
        reference,
        note,
        req.user.id,
        req.user.business_id,
        req.user.branch_id || null
      ]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: transactionType === "credit" ? "Wallet credited" : "Wallet debited",
      data: {
        ...member,
        wallet_balance: balanceAfter
      }
    });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

router.get("/points/ledger", requirePermission("members"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;

    const memberId = req.query.member_id ? Number(req.query.member_id) : null;
    const params = [req.user.business_id];
    let where = `WHERE mpl.business_id = ?`;

    if (memberId) {
      where += ` AND mpl.member_id = ?`;
      params.push(memberId);
    }

    const rows = await query(
      `SELECT
         mpl.*,
         m.name AS member_name,
         m.member_code,
         u.name AS created_by_name
       FROM member_points_ledger mpl
       LEFT JOIN members m ON m.id = mpl.member_id
       LEFT JOIN users u ON u.id = mpl.created_by
       ${where}
       ORDER BY mpl.created_at DESC, mpl.id DESC
       LIMIT 250`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/points/ledger", requirePermission("members"), async (req, res) => {
  const conn = await pool.getConnection();

  try {
    if (!ensureBusinessContext(req, res)) return;

    const memberId = Number(req.body.member_id);
    const transactionType = String(req.body.transaction_type || "").toLowerCase();
    const points = normalizePointsAmount(req.body.points);
    const note = String(req.body.note || "").trim() || null;
    const reference = String(req.body.reference || "").trim() || null;

    if (!Number.isInteger(memberId) || memberId <= 0) {
      return res.status(400).json({ success: false, message: "Member is required" });
    }

    if (!["earn", "redeem", "adjust"].includes(transactionType)) {
      return res.status(400).json({
        success: false,
        message: "Transaction type must be earn, redeem, or adjust"
      });
    }

    if (!points) {
      return res.status(400).json({
        success: false,
        message: "Points must be greater than zero"
      });
    }

    await conn.beginTransaction();

    const [memberRows] = await conn.execute(
      `SELECT id, name, member_code, points, lifetime_points
       FROM members
       WHERE id = ? AND business_id = ?
       LIMIT 1
       FOR UPDATE`,
      [memberId, req.user.business_id]
    );

    if (!memberRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const member = memberRows[0];
    const pointsBefore = Math.floor(Number(member.points || 0));
    const pointsAfter =
      transactionType === "redeem" ? pointsBefore - points : pointsBefore + points;

    if (pointsAfter < 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient reward points"
      });
    }

    const lifetimeBefore = Math.floor(Number(member.lifetime_points || 0));
    const lifetimeAfter =
      transactionType === "earn" || transactionType === "adjust"
        ? lifetimeBefore + points
        : lifetimeBefore;
    const rewardBadge = getRewardBadge(lifetimeAfter);

    await conn.execute(
      `UPDATE members
       SET points = ?,
           lifetime_points = ?,
           reward_badge = ?
       WHERE id = ? AND business_id = ?`,
      [pointsAfter, lifetimeAfter, rewardBadge, memberId, req.user.business_id]
    );

    await conn.execute(
      `INSERT INTO member_points_ledger
       (member_id, transaction_type, points, points_before, points_after, source, reference, note, created_by, business_id, branch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        memberId,
        transactionType,
        points,
        pointsBefore,
        pointsAfter,
        "manual",
        reference,
        note,
        req.user.id,
        req.user.business_id,
        req.user.branch_id || null
      ]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Reward points updated",
      data: {
        ...member,
        points: pointsAfter,
        lifetime_points: lifetimeAfter,
        reward_badge: rewardBadge
      }
    });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
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
    const pointsLedger = await query(
      `SELECT *
       FROM member_points_ledger
       WHERE business_id = ? AND member_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 100`,
      [req.user.business_id, member.id]
    );

    res.json({
      success: true,
      member,
      sales,
      pointsLedger
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
