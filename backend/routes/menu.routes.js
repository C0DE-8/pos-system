const express = require("express");
const { pool, query } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");
const { isAdmin } = require("../utils/tenant");

const router = express.Router();

async function resolveBusinessBranch(businessSlug, branchSlug = null) {
  const businesses = await query(
    "SELECT * FROM businesses WHERE slug = ? AND is_active = 1 LIMIT 1",
    [businessSlug]
  );
  if (!businesses.length) return null;
  const business = businesses[0];
  let branch = null;
  if (branchSlug) {
    const branches = await query(
      "SELECT * FROM business_branches WHERE business_id = ? AND slug = ? AND is_active = 1 LIMIT 1",
      [business.id, branchSlug]
    );
    if (!branches.length) return null;
    branch = branches[0];
  }
  return { business, branch };
}

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const roundMoney = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Number(amount.toFixed(2));
};
const POINT_EARN_AMOUNT = 100;
const calculatePointsEarned = (amount) => {
  const value = roundMoney(amount);
  if (value <= 0) return 0;
  return Math.floor(value / POINT_EARN_AMOUNT);
};
const getRewardBadge = (lifetimePoints) => {
  const points = Number(lifetimePoints || 0);
  if (points >= 5000) return "Legend";
  if (points >= 2500) return "Champion";
  if (points >= 1000) return "Pro";
  if (points >= 250) return "Rising Star";
  return "Starter";
};
const generateWalletToken = (businessId) => {
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `WAL-${businessId || 0}-${Date.now()}-${randomPart}`;
};
const generateMemberCode = () => `M${Date.now()}`;

async function findActiveMemberByEmail(businessId, email, conn = null) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const sql = `
    SELECT
      m.id,
      m.member_code,
      m.name,
      m.phone,
      m.email,
      m.wallet_balance,
      m.wallet_token,
      m.member_status,
      m.membership_tier_id,
      COALESCE(mt.name, m.tier) AS membership_tier_name
    FROM members m
    LEFT JOIN membership_tiers mt ON mt.id = m.membership_tier_id
    WHERE m.business_id = ?
      AND LOWER(m.email) = ?
      AND COALESCE(m.member_status, 'active') = 'active'
    LIMIT 1`;
  const params = [businessId, normalizedEmail];

  if (conn) {
    const [rows] = await conn.execute(sql, params);
    return rows[0] || null;
  }

  const rows = await query(sql, params);
  return rows[0] || null;
}

async function debitMemberWallet(conn, { member, amount, source, reference, note, businessId, branchId }) {
  const walletAmount = roundMoney(amount);
  if (!walletAmount) return { walletPayment: 0, balanceAfter: roundMoney(member.wallet_balance || 0) };

  const [memberRows] = await conn.execute(
    `SELECT id, wallet_balance, wallet_token
     FROM members
     WHERE id = ? AND business_id = ? AND COALESCE(member_status, 'active') = 'active'
     LIMIT 1
     FOR UPDATE`,
    [member.id, businessId]
  );

  if (!memberRows.length) {
    const error = new Error("Member not found");
    error.statusCode = 404;
    throw error;
  }

  const lockedMember = memberRows[0];
  const balanceBefore = roundMoney(lockedMember.wallet_balance || 0);
  if (walletAmount > balanceBefore) {
    const error = new Error("Insufficient wallet balance");
    error.statusCode = 400;
    throw error;
  }

  const balanceAfter = roundMoney(balanceBefore - walletAmount);

  await conn.execute(
    `UPDATE members
     SET wallet_balance = ?
     WHERE id = ? AND business_id = ?`,
    [balanceAfter, member.id, businessId]
  );

  await conn.execute(
    `INSERT INTO member_wallet_transactions
     (member_id, wallet_token, transaction_type, amount, balance_before, balance_after, source, reference, note, business_id, branch_id)
     VALUES (?, ?, 'checkout', ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      member.id,
      lockedMember.wallet_token,
      walletAmount,
      balanceBefore,
      balanceAfter,
      source,
      reference,
      note,
      businessId,
      branchId || null
    ]
  );

  return { walletPayment: walletAmount, balanceAfter };
}

async function awardMemberPoints(conn, { memberId, points, source, reference, note, businessId, branchId }) {
  const pointAmount = Math.floor(Number(points || 0));
  if (!memberId || pointAmount <= 0) return null;

  const [memberRows] = await conn.execute(
    `SELECT id, points, lifetime_points
     FROM members
     WHERE id = ? AND business_id = ?
     LIMIT 1
     FOR UPDATE`,
    [memberId, businessId]
  );

  if (!memberRows.length) return null;

  const member = memberRows[0];
  const pointsBefore = Math.floor(Number(member.points || 0));
  const pointsAfter = pointsBefore + pointAmount;
  const lifetimeAfter = Math.floor(Number(member.lifetime_points || 0)) + pointAmount;
  const rewardBadge = getRewardBadge(lifetimeAfter);

  await conn.execute(
    `UPDATE members
     SET points = ?,
         lifetime_points = ?,
         reward_badge = ?
     WHERE id = ? AND business_id = ?`,
    [pointsAfter, lifetimeAfter, rewardBadge, memberId, businessId]
  );

  await conn.execute(
    `INSERT INTO member_points_ledger
     (member_id, transaction_type, points, points_before, points_after, source, reference, note, business_id, branch_id)
     VALUES (?, 'earn', ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      memberId,
      pointAmount,
      pointsBefore,
      pointsAfter,
      source,
      reference,
      note,
      businessId,
      branchId || null
    ]
  );

  return { pointsEarned: pointAmount, pointsAfter, lifetimeAfter, rewardBadge };
}

async function calculateMenuChallengeProgress(challenge, memberId, businessId) {
  const start = challenge.starts_at || "1970-01-01 00:00:00";
  const end = challenge.ends_at || "2999-12-31 23:59:59";
  const params = [businessId, memberId, start, end];

  if (challenge.challenge_type === "visit_count") {
    const rows = await query(
      `SELECT COUNT(*) AS value
       FROM sales
       WHERE business_id = ? AND member_id = ? AND sale_date BETWEEN ? AND ?`,
      params
    );
    return Number(rows[0]?.value || 0);
  }

  if (challenge.challenge_type === "spend_amount") {
    const rows = await query(
      `SELECT COALESCE(SUM(total), 0) AS value
       FROM sales
       WHERE business_id = ? AND member_id = ? AND sale_date BETWEEN ? AND ?`,
      params
    );
    return roundMoney(rows[0]?.value || 0);
  }

  if (challenge.challenge_type === "product_count") {
    const rows = await query(
      `SELECT COUNT(DISTINCT si.product_id) AS value
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.business_id = ? AND s.member_id = ? AND s.sale_date BETWEEN ? AND ?
         AND si.product_id IS NOT NULL`,
      params
    );
    return Number(rows[0]?.value || 0);
  }

  if (challenge.challenge_type === "category_count") {
    const rows = await query(
      `SELECT COUNT(DISTINCT p.category_id) AS value
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       JOIN products p ON p.id = si.product_id
       WHERE s.business_id = ? AND s.member_id = ? AND s.sale_date BETWEEN ? AND ?
         AND p.category_id IS NOT NULL`,
      params
    );
    return Number(rows[0]?.value || 0);
  }

  if (challenge.challenge_type === "points_earned") {
    const rows = await query(
      `SELECT COALESCE(SUM(points), 0) AS value
       FROM member_points_ledger
       WHERE business_id = ? AND member_id = ? AND created_at BETWEEN ? AND ?
         AND transaction_type = 'earn'`,
      params
    );
    return Number(rows[0]?.value || 0);
  }

  return 0;
}

async function getMenuMemberMissions(businessId, memberId) {
  const nowSql = new Date().toISOString().slice(0, 19).replace("T", " ");
  const challenges = await query(
    `SELECT *
     FROM member_challenges
     WHERE business_id = ?
       AND is_active = 1
       AND (starts_at IS NULL OR starts_at <= ?)
       AND (ends_at IS NULL OR ends_at >= ?)
     ORDER BY COALESCE(ends_at, '2999-12-31') ASC, id DESC`,
    [businessId, nowSql, nowSql]
  );

  if (!challenges.length) return [];

  const completions = await query(
    `SELECT *
     FROM member_challenge_completions
     WHERE business_id = ? AND member_id = ?`,
    [businessId, memberId]
  );
  const completionByChallenge = new Map(
    completions.map((completion) => [Number(completion.challenge_id), completion])
  );

  const missions = [];
  for (const challenge of challenges) {
    const completion = completionByChallenge.get(Number(challenge.id));
    const measuredProgress =
      challenge.challenge_type === "manual"
        ? Number(completion?.progress_value || 0)
        : await calculateMenuChallengeProgress(challenge, memberId, businessId);
    const progressValue = Math.max(Number(completion?.progress_value || 0), measuredProgress);
    const targetValue = Math.max(Number(challenge.target_value || 1), 1);

    missions.push({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      challenge_type: challenge.challenge_type,
      target_value: targetValue,
      progress_value: progressValue,
      progress_percent: Math.min(100, Math.round((progressValue / targetValue) * 100)),
      bonus_points: Number(challenge.bonus_points || 0),
      badge_name: challenge.badge_name,
      starts_at: challenge.starts_at,
      ends_at: challenge.ends_at,
      is_completed: !!completion || progressValue >= targetValue,
      completed_at: completion?.completed_at || null
    });
  }

  return missions;
}

router.get("/:businessSlug/:branchSlug/products", async (req, res) => {
  try {
    const resolved = await resolveBusinessBranch(req.params.businessSlug, req.params.branchSlug);
    if (!resolved) return res.status(404).json({ success: false, message: "Menu not found" });
    const rows = await query(
      `SELECT
         p.id,
         p.name,
         p.icon,
         p.price,
         p.type,
         p.category_id,
         CASE
           WHEN p.is_active = 1 AND (p.is_unlimited = 1 OR COALESCE(p.stock, 0) > 0) THEN 1
           ELSE 0
         END AS available,
         p.stock,
         p.is_unlimited
       FROM products p
       WHERE p.business_id = ?
         AND (p.branch_id IS NULL OR p.branch_id = ?)
         AND p.is_active = 1
       ORDER BY p.id DESC`,
      [resolved.business.id, resolved.branch.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:businessSlug/:branchSlug/products/:id", async (req, res) => {
  try {
    const resolved = await resolveBusinessBranch(req.params.businessSlug, req.params.branchSlug);
    if (!resolved) return res.status(404).json({ success: false, message: "Menu not found" });
    const rows = await query(
      `SELECT
         p.id,
         p.name,
         p.icon,
         p.price,
         p.type,
         p.category_id,
         CASE
           WHEN p.is_active = 1 AND (p.is_unlimited = 1 OR COALESCE(p.stock, 0) > 0) THEN 1
           ELSE 0
         END AS available,
         p.stock,
         p.is_unlimited
       FROM products p
       WHERE p.id = ?
         AND p.business_id = ?
         AND (p.branch_id IS NULL OR p.branch_id = ?)
         AND p.is_active = 1
       LIMIT 1`,
      [req.params.id, resolved.business.id, resolved.branch.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/:businessSlug/:branchSlug/members/lookup", async (req, res) => {
  try {
    const resolved = await resolveBusinessBranch(req.params.businessSlug, req.params.branchSlug);
    if (!resolved) return res.status(404).json({ success: false, message: "Menu not found" });

    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const member = await findActiveMemberByEmail(resolved.business.id, email);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "No active member found for this email"
      });
    }

    return res.json({
      success: true,
      data: {
        id: member.id,
        member_code: member.member_code,
        name: member.name,
        phone: member.phone,
        email: member.email,
        wallet_balance: roundMoney(member.wallet_balance || 0),
        membership_tier_name: member.membership_tier_name,
        missions: await getMenuMemberMissions(resolved.business.id, member.id)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/:businessSlug/:branchSlug/members/register", async (req, res) => {
  try {
    const resolved = await resolveBusinessBranch(req.params.businessSlug, req.params.branchSlug);
    if (!resolved) return res.status(404).json({ success: false, message: "Menu not found" });

    const name = String(req.body.name || "").trim();
    const phone = String(req.body.phone || "").trim() || null;
    const email = normalizeEmail(req.body.email);
    const birthday = String(req.body.birthday || "").trim() || null;
    const preferences = String(req.body.preferences || "").trim() || null;

    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const existing = await query(
      `SELECT id, member_status
       FROM members
       WHERE business_id = ? AND LOWER(email) = ?
       LIMIT 1`,
      [resolved.business.id, email]
    );

    if (existing.length) {
      const status = existing[0].member_status || "active";
      return res.status(409).json({
        success: false,
        message:
          status === "pending"
            ? "A member registration with this email is already waiting for staff verification"
            : "A member account already exists for this email"
      });
    }

    const memberCode = generateMemberCode();

    const result = await query(
      `INSERT INTO members
       (member_code, name, phone, email, birthday, preferences, offer_notes, mobile_wallet_notifications, member_status, registered_source, wallet_balance, wallet_token, business_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'public_menu', 0, ?, ?)`,
      [
        memberCode,
        name,
        phone,
        email,
        birthday,
        preferences,
        "Registered from online menu. Staff verification required.",
        1,
        generateWalletToken(resolved.business.id),
        resolved.business.id
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Member registration submitted for staff verification",
      data: {
        id: result.insertId,
        member_code: memberCode,
        member_status: "pending"
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/:businessSlug/:branchSlug/orders", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const resolved = await resolveBusinessBranch(req.params.businessSlug, req.params.branchSlug);
    if (!resolved) return res.status(404).json({ success: false, message: "Menu not found" });

    const {
      customer_name,
      customer_phone,
      customer_email,
      order_type = "pickup",
      table_number,
      delivery_address,
      notes,
      payment_method = "pay_at_counter",
      wallet_payment = 0,
      items = []
    } = req.body;
    if (!items.length) return res.status(400).json({ success: false, message: "No items selected" });

    await conn.beginTransaction();

    const member = await findActiveMemberByEmail(
      resolved.business.id,
      customer_email,
      conn
    );

    let subtotal = 0;
    const preparedItems = [];
    for (const item of items) {
      const productId = Number(item.product_id || 0);
      if (!productId) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: "Invalid product_id" });
      }
      const [productRows] = await conn.execute(
        `SELECT id, name, icon, price, stock, is_unlimited
         FROM products
         WHERE id = ?
           AND business_id = ?
           AND (branch_id IS NULL OR branch_id = ?)
           AND is_active = 1
         LIMIT 1`,
        [productId, resolved.business.id, resolved.branch.id]
      );
      if (!productRows.length) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: "Invalid product" });
      }
      const product = productRows[0];
      const qty = Number(item.qty || 1);
      if (qty <= 0) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: "Invalid quantity" });
      }
      if (!Number(product.is_unlimited) && Number(product.stock || 0) < qty) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Out of stock: ${product.name}` });
      }
      const unitPrice = Number(product.price ?? 0);
      const finalPrice = unitPrice * qty;
      subtotal += finalPrice;
      preparedItems.push({ product, qty, unitPrice, finalPrice, notes: item.notes || null, mods: item.mods || null });
    }

    const taxRate = Number(resolved.business.tax_rate || 0);
    const tax = roundMoney((subtotal * taxRate) / 100);
    const total = roundMoney(subtotal + tax);
    const orderCode = `DM-${Date.now()}`;
    const normalizedPaymentMethod = ["pay_at_counter", "wallet", "card", "transfer"].includes(payment_method)
      ? payment_method
      : "pay_at_counter";
    const walletRequest = normalizedPaymentMethod === "wallet" ? roundMoney(wallet_payment || total) : 0;

    if (walletRequest > total) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Wallet payment cannot exceed order total" });
    }

    if (walletRequest > 0 && !member) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: "Wallet payment requires an active member email"
      });
    }

    const walletResult = walletRequest
      ? await debitMemberWallet(conn, {
          member,
          amount: walletRequest,
          source: "online_order",
          reference: orderCode,
          note: "Online menu order payment",
          businessId: resolved.business.id,
          branchId: resolved.branch.id
        })
      : { walletPayment: 0 };
    const paymentStatus = walletResult.walletPayment >= total ? "paid" : "pending";
    const pointsEarned =
      paymentStatus === "paid" && member
        ? calculatePointsEarned(total)
        : 0;
    const pointsResult = pointsEarned
      ? await awardMemberPoints(conn, {
          memberId: member.id,
          points: pointsEarned,
          source: "online_order",
          reference: orderCode,
          note: "Points earned from online order",
          businessId: resolved.business.id,
          branchId: resolved.branch.id
        })
      : null;

    const [orderResult] = await conn.execute(
      `INSERT INTO customer_orders
      (business_id, branch_id, order_code, customer_name, customer_phone, customer_email, member_id, order_type, table_number, delivery_address, notes, subtotal, wallet_payment, tax, total, currency, payment_method, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resolved.business.id,
        resolved.branch.id,
        orderCode,
        customer_name || member?.name || null,
        customer_phone || member?.phone || null,
        customer_email || member?.email || null,
        member?.id || null,
        order_type,
        table_number || null,
        delivery_address || null,
        notes || null,
        subtotal,
        walletResult.walletPayment || 0,
        tax,
        total,
        resolved.business.currency || "NGN",
        normalizedPaymentMethod,
        paymentStatus
      ]
    );

    for (const item of preparedItems) {
      await conn.execute(
        `INSERT INTO customer_order_items
         (customer_order_id, product_id, item_name, icon, qty, unit_price, final_price, mods, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderResult.insertId,
          item.product.id,
          item.product.name,
          item.product.icon || null,
          item.qty,
          item.unitPrice,
          item.finalPrice,
          item.mods ? JSON.stringify(item.mods) : null,
          item.notes
        ]
      );
    }

    await conn.commit();
    res.status(201).json({
      success: true,
      message: "Order placed",
      order_code: orderCode,
      order_id: orderResult.insertId,
      member: member
        ? {
            id: member.id,
            name: member.name,
            wallet_balance: walletResult.balanceAfter ?? roundMoney(member.wallet_balance || 0),
            points: pointsResult?.pointsAfter,
            reward_badge: pointsResult?.rewardBadge
          }
        : null
    });
  } catch (error) {
    await conn.rollback();
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

router.post("/:businessSlug/:branchSlug/reservations", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const resolved = await resolveBusinessBranch(req.params.businessSlug, req.params.branchSlug);
    if (!resolved) return res.status(404).json({ success: false, message: "Menu not found" });

    const customerName = String(req.body.customer_name || "").trim();
    const customerPhone = String(req.body.customer_phone || "").trim() || null;
    const customerEmail = normalizeEmail(req.body.customer_email);
    const sessionType = String(req.body.session_type || "game_session").trim() || "game_session";
    const partySize = Math.max(1, Number(req.body.party_size || 1));
    const reservationDate = String(req.body.reservation_date || "").trim();
    const reservationTime = String(req.body.reservation_time || "").trim();
    const durationMinutes = Math.max(30, Number(req.body.duration_minutes || 60));
    const notes = String(req.body.notes || "").trim() || null;
    const paymentMethod = ["pay_at_counter", "wallet", "card", "transfer"].includes(req.body.payment_method)
      ? req.body.payment_method
      : "pay_at_counter";
    const walletRequest = paymentMethod === "wallet" ? roundMoney(req.body.wallet_payment || 0) : 0;

    if (!customerName && !customerEmail) {
      return res.status(400).json({ success: false, message: "Name or member email is required" });
    }

    if (!reservationDate || !reservationTime) {
      return res.status(400).json({ success: false, message: "Reservation date and time are required" });
    }

    await conn.beginTransaction();

    const member = await findActiveMemberByEmail(resolved.business.id, customerEmail, conn);
    const reservationCode = `RSV-${Date.now()}`;

    if (walletRequest > 0 && !member) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: "Wallet payment requires an active member email"
      });
    }

    const walletResult = walletRequest
      ? await debitMemberWallet(conn, {
          member,
          amount: walletRequest,
          source: "online_reservation",
          reference: reservationCode,
          note: "Online reservation wallet payment",
          businessId: resolved.business.id,
          branchId: resolved.branch.id
        })
      : { walletPayment: 0 };
    const pointsEarned = walletResult.walletPayment > 0 && member
      ? calculatePointsEarned(walletResult.walletPayment)
      : 0;
    const pointsResult = pointsEarned
      ? await awardMemberPoints(conn, {
          memberId: member.id,
          points: pointsEarned,
          source: "online_reservation",
          reference: reservationCode,
          note: "Points earned from reservation wallet payment",
          businessId: resolved.business.id,
          branchId: resolved.branch.id
        })
      : null;

    const [result] = await conn.execute(
      `INSERT INTO customer_reservations
       (business_id, branch_id, reservation_code, member_id, customer_name, customer_phone, customer_email, session_type, party_size, reservation_date, reservation_time, duration_minutes, notes, payment_method, wallet_payment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resolved.business.id,
        resolved.branch.id,
        reservationCode,
        member?.id || null,
        customerName || member?.name || null,
        customerPhone || member?.phone || null,
        customerEmail || member?.email || null,
        sessionType,
        partySize,
        reservationDate,
        reservationTime,
        durationMinutes,
        notes,
        paymentMethod,
        walletResult.walletPayment || 0
      ]
    );

    await conn.commit();

    return res.status(201).json({
      success: true,
      message: "Reservation request submitted",
      reservation_code: reservationCode,
      reservation_id: result.insertId,
      member: member
        ? {
            id: member.id,
            name: member.name,
            member_code: member.member_code,
            wallet_balance: walletResult.balanceAfter ?? roundMoney(member.wallet_balance || 0),
            points: pointsResult?.pointsAfter,
            reward_badge: pointsResult?.rewardBadge
          }
        : null
    });
  } catch (error) {
    await conn.rollback();
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

router.get("/:businessSlug/:branchSlug/orders/:orderCode", async (req, res) => {
  try {
    const resolved = await resolveBusinessBranch(req.params.businessSlug, req.params.branchSlug);
    if (!resolved) return res.status(404).json({ success: false, message: "Menu not found" });

    const orders = await query(
      `SELECT * FROM customer_orders
       WHERE business_id = ? AND branch_id = ? AND order_code = ?
       LIMIT 1`,
      [resolved.business.id, resolved.branch.id, req.params.orderCode]
    );
    if (!orders.length) return res.status(404).json({ success: false, message: "Order not found" });

    const items = await query(
      "SELECT * FROM customer_order_items WHERE customer_order_id = ? ORDER BY id ASC",
      [orders[0].id]
    );
    const logs = await query(
      "SELECT old_status, new_status, created_at FROM customer_order_status_logs WHERE customer_order_id = ? ORDER BY id ASC",
      [orders[0].id]
    );

    return res.json({
      success: true,
      order: orders[0],
      items,
      logs
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.use("/admin", authenticateToken);

router.get("/admin/orders", requirePermission("pos"), async (req, res) => {
  try {
    const useBranchScope = !isAdmin(req.user) && !!req.user.branch_id;
    const rows = await query(
      `SELECT
         id,
         order_code,
         customer_name,
         customer_phone,
         order_type,
         total,
         fulfillment_status,
         payment_status,
         created_at
       FROM customer_orders
       WHERE business_id = ? ${useBranchScope ? "AND branch_id = ?" : ""}
       ORDER BY id DESC`,
      useBranchScope
        ? [req.user.business_id, req.user.branch_id]
        : [req.user.business_id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/admin/orders/:id", requirePermission("pos"), async (req, res) => {
  try {
    const useBranchScope = !isAdmin(req.user) && !!req.user.branch_id;
    const orders = await query(
      `SELECT * FROM customer_orders WHERE id = ? AND business_id = ? ${useBranchScope ? "AND branch_id = ?" : ""} LIMIT 1`,
      useBranchScope
        ? [req.params.id, req.user.business_id, req.user.branch_id]
        : [req.params.id, req.user.business_id]
    );
    if (!orders.length) return res.status(404).json({ success: false, message: "Order not found" });
    const items = await query("SELECT * FROM customer_order_items WHERE customer_order_id = ? ORDER BY id ASC", [req.params.id]);
    res.json({ success: true, order: orders[0], items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/admin/orders/:id/status", requirePermission("pos"), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { fulfillment_status, payment_status } = req.body;
    await conn.beginTransaction();
    const useBranchScope = !isAdmin(req.user) && !!req.user.branch_id;
    const [orders] = await conn.execute(
      `SELECT * FROM customer_orders WHERE id = ? AND business_id = ? ${useBranchScope ? "AND branch_id = ?" : ""} LIMIT 1`,
      useBranchScope
        ? [req.params.id, req.user.business_id, req.user.branch_id]
        : [req.params.id, req.user.business_id]
    );
    if (!orders.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    const order = orders[0];
    await conn.execute(
      `UPDATE customer_orders
       SET fulfillment_status = COALESCE(?, fulfillment_status),
           payment_status = COALESCE(?, payment_status)
       WHERE id = ?`,
      [fulfillment_status || null, payment_status || null, req.params.id]
    );
    await conn.execute(
      "INSERT INTO customer_order_status_logs (customer_order_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)",
      [req.params.id, order.fulfillment_status, fulfillment_status || order.fulfillment_status, req.user.id]
    );

    if ((fulfillment_status === "confirmed" || payment_status === "paid") && order.fulfillment_status === "pending") {
      const [items] = await conn.execute("SELECT * FROM customer_order_items WHERE customer_order_id = ?", [req.params.id]);
      const [kdsResult] = await conn.execute(
        `INSERT INTO kds_orders (ticket_name, customer, status, business_id, branch_id)
         VALUES (?, ?, 'new', ?, ?)`,
        [order.order_code, order.customer_name || "Walk-in", order.business_id, order.branch_id]
      );
      for (const item of items) {
        await conn.execute(
          "INSERT INTO kds_order_items (kds_order_id, item_name, icon, mods, done) VALUES (?, ?, ?, ?, 0)",
          [kdsResult.insertId, item.item_name, item.icon || "", item.mods || null]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, message: "Order status updated" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

router.post("/admin/orders/:id/hold", requirePermission("pos"), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const useBranchScope = !isAdmin(req.user) && !!req.user.branch_id;
    const scopeSql = useBranchScope ? " AND branch_id = ?" : "";
    const scopeParams = useBranchScope ? [req.user.branch_id] : [];

    const [orders] = await conn.execute(
      `SELECT *
       FROM customer_orders
       WHERE id = ? AND business_id = ?${scopeSql}
       LIMIT 1`,
      [req.params.id, req.user.business_id, ...scopeParams]
    );
    if (!orders.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orders[0];
    const [items] = await conn.execute(
      `SELECT *
       FROM customer_order_items
       WHERE customer_order_id = ?
       ORDER BY id ASC`,
      [order.id]
    );
    if (!items.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Order has no items" });
    }

    const cartCode = `PEND-${Date.now()}`;
    const walletPayment = roundMoney(order.wallet_payment || 0);
    const pendingTotal = Math.max(0, roundMoney(Number(order.total || 0) - walletPayment));
    const pointsEarned = walletPayment > 0 && order.member_id
      ? calculatePointsEarned(order.total || 0)
      : 0;
    const [cartResult] = await conn.execute(
      `INSERT INTO pending_carts
      (cart_code, customer, member_id, cashier_id, shift_id, subtotal, discount, loyalty_discount, giftcard_discount, wallet_payment, wallet_debited_at, wallet_debit_source, points_earned, points_awarded_at, points_award_source, tax, total, currency, note, business_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cartCode,
        order.customer_name || "Walk-in",
        order.member_id || null,
        req.user.id,
        null,
        order.subtotal || 0,
        order.discount || 0,
        0,
        0,
        walletPayment,
        walletPayment > 0 ? new Date() : null,
        walletPayment > 0 ? "online_order" : null,
        pointsEarned,
        pointsEarned > 0 ? new Date() : null,
        pointsEarned > 0 ? "online_order" : null,
        order.tax || 0,
        pendingTotal,
        order.currency || "NGN",
        order.notes || `From customer order ${order.order_code}`,
        order.business_id,
        order.branch_id || null
      ]
    );

    const pendingCartId = cartResult.insertId;

    for (const item of items) {
      await conn.execute(
        `INSERT INTO pending_cart_items
        (pending_cart_id, product_id, item_name, icon, item_type, qty, unit_price, cost, item_discount_pct, session_start, session_end, elapsed_seconds, final_price, manage_stock)
        VALUES (?, ?, ?, ?, 'fixed', ?, ?, 0, ?, NULL, NULL, 0, ?, 1)`,
        [
          pendingCartId,
          item.product_id || null,
          item.item_name,
          item.icon || null,
          item.qty || 1,
          item.unit_price || 0,
          item.item_discount_pct || 0,
          item.final_price || 0
        ]
      );
    }

    const nextStatus =
      order.fulfillment_status === "pending" ? "confirmed" : order.fulfillment_status;
    await conn.execute(
      `UPDATE customer_orders
       SET fulfillment_status = ?
       WHERE id = ?`,
      [nextStatus, order.id]
    );
    await conn.execute(
      `INSERT INTO customer_order_status_logs (customer_order_id, old_status, new_status, changed_by)
       VALUES (?, ?, ?, ?)`,
      [order.id, order.fulfillment_status, nextStatus, req.user.id]
    );

    await conn.commit();
    return res.status(201).json({
      success: true,
      message: "Customer order moved to pending cart",
      pendingCartId,
      cartCode
    });
  } catch (error) {
    await conn.rollback();
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
