const express = require("express");
const moment = require("moment");
const { pool } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");
const { ensureBusinessContext, isAdmin } = require("../utils/tenant");
const branchAccessMiddleware = require("../middleware/branchAccessMiddleware");
const {
  deductUnitInventory,
  deductUnitInventoryByLevel,
  recordUnitInventoryHistory
} = require("../utils/unitHierarchy");

const router = express.Router();

router.use(authenticateToken);

const isAdminUser = (user) => isAdmin(user);
const toMySQLDateTime = (value) => {
  if (!value) return null;

  const m = moment(value);
  if (!m.isValid()) return null;

  return m.format("YYYY-MM-DD HH:mm:ss");
};
const normalizeItemType = (value) => {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();

  // The app logic only treats "timed" specially; everything else behaves like "fixed".
  // This also prevents MySQL ENUM/VARCHAR truncation errors when the client sends
  // unexpected casing or labels (e.g. "Timed", "TIME", etc).
  if (v === "timed") return "timed";
  return "fixed";
};
const toAmount = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return amount;
};
const roundMoney = (value) => Number(toAmount(value).toFixed(2));
const POINT_EARN_AMOUNT = 100;
const POINT_REDEEM_VALUE = 10;
const getRewardBadge = (lifetimePoints) => {
  const points = Number(lifetimePoints || 0);
  if (points >= 5000) return "Legend";
  if (points >= 2500) return "Champion";
  if (points >= 1000) return "Pro";
  if (points >= 250) return "Rising Star";
  return "Starter";
};
const calculatePointsEarned = (amount) => {
  const value = roundMoney(amount);
  if (value <= 0) return 0;
  return Math.floor(value / POINT_EARN_AMOUNT);
};
const calculateRewardDiscount = (points) => {
  const value = Number(points || 0);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return roundMoney(Math.floor(value) * POINT_REDEEM_VALUE);
};
const getItemLineTotal = (item) => {
  const finalPrice = Number(item?.final_price);
  if (Number.isFinite(finalPrice) && finalPrice >= 0) {
    return roundMoney(finalPrice);
  }

  const qty = Number(item?.qty || 1);
  const unitPrice = Number(item?.unit_price || 0);
  const itemDiscountPct = Number(item?.item_discount_pct || 0);
  const gross = qty * unitPrice;
  const discountAmount = gross * (Math.max(0, Math.min(100, itemDiscountPct)) / 100);

  return roundMoney(Math.max(0, gross - discountAmount));
};
const buildRecentSalesDates = () => {
  return [0, 1, 2].map((daysAgo) => {
    const date = moment().subtract(daysAgo, "days");

    return {
      key: date.format("YYYY-MM-DD"),
      label: daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : date.format("ddd"),
      fullLabel: date.format("ddd, MMM D")
    };
  });
};

const buildSalesSummaryWhere = (req, dateKeys) => {
  const placeholders = dateKeys.map(() => "?").join(", ");
  const params = [req.user.id, req.user.business_id, ...dateKeys];

  let sql = `
    FROM sales
    WHERE cashier_id = ?
      AND business_id = ?
      AND DATE(sale_date) IN (${placeholders})
  `;

  if (req.user.branch_id) {
    sql += ` AND branch_id = ?`;
    params.push(req.user.branch_id);
  }

  return { sql, params };
};

async function resolveMembershipContext(
  conn,
  businessId,
  memberId,
  fallbackCustomer,
  items = [],
  options = {}
) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const normalizedSubtotal = roundMoney(
    normalizedItems.reduce((sum, item) => sum + getItemLineTotal(item), 0)
  );
  const fallbackName = String(fallbackCustomer || "Walk-in").trim() || "Walk-in";
  const applyMembershipDiscount = Boolean(options.applyMembershipDiscount);

  if (!memberId) {
    return {
      customerName: fallbackName,
      memberId: null,
      membershipTierId: null,
      membershipTierName: null,
      membershipDiscountPct: 0,
      membershipDiscountAmount: 0
    };
  }

  const [memberRows] = await conn.execute(
    `SELECT
       m.id,
       m.name,
       m.membership_tier_id,
       COALESCE(mt.name, m.tier) AS membership_tier_name,
       COALESCE(mt.discount_pct, 0) AS fallback_discount_pct
     FROM members m
     LEFT JOIN membership_tiers mt ON mt.id = m.membership_tier_id
     WHERE m.id = ? AND m.business_id = ?
     LIMIT 1`,
    [memberId, businessId]
  );

  if (!memberRows.length) {
    const error = new Error("Selected member was not found");
    error.statusCode = 400;
    throw error;
  }

  const member = memberRows[0];
  const fallbackDiscountPct = roundMoney(member.fallback_discount_pct || 0);
  const tierId = member.membership_tier_id || null;
  let discountByCategory = new Map();
  let productCategoryById = new Map();

  if (tierId && applyMembershipDiscount) {
    const [discountRows] = await conn.execute(
      `SELECT category_id, discount_pct
       FROM membership_tier_category_discounts
       WHERE membership_tier_id = ? AND business_id = ?`,
      [tierId, businessId]
    );

    discountByCategory = new Map(
      discountRows.map((row) => [Number(row.category_id), Number(row.discount_pct || 0)])
    );
  }

  const productIds = Array.from(
    new Set(
      normalizedItems
        .map((item) => Number(item.product_id))
        .filter((productId) => Number.isInteger(productId) && productId > 0)
    )
  );

  if (productIds.length && applyMembershipDiscount) {
    const placeholders = productIds.map(() => "?").join(", ");
    const [productRows] = await conn.execute(
      `SELECT id, category_id
       FROM products
       WHERE business_id = ? AND id IN (${placeholders})`,
      [businessId, ...productIds]
    );

    productCategoryById = new Map(
      productRows.map((row) => [Number(row.id), row.category_id ? Number(row.category_id) : null])
    );
  }

  const membershipDiscountAmount = applyMembershipDiscount
    ? roundMoney(
        normalizedItems.reduce((sum, item) => {
          const productId = Number(item.product_id);
          const categoryId = productCategoryById.get(productId) || null;
          const categoryDiscountPct =
            categoryId && discountByCategory.has(categoryId)
              ? discountByCategory.get(categoryId)
              : fallbackDiscountPct;

          return sum + getItemLineTotal(item) * (categoryDiscountPct / 100);
        }, 0)
      )
    : 0;
  const membershipDiscountPct =
    normalizedSubtotal > 0
      ? roundMoney((membershipDiscountAmount / normalizedSubtotal) * 100)
      : 0;

  return {
    customerName: String(member.name || fallbackName).trim() || fallbackName,
    memberId: member.id,
    membershipTierId: applyMembershipDiscount ? tierId : null,
    membershipTierName: applyMembershipDiscount ? member.membership_tier_name || null : null,
    membershipDiscountPct,
    membershipDiscountAmount
  };
}

function buildCheckoutTotals({
  subtotal,
  discount,
  loyaltyDiscount,
  rewardDiscount,
  giftcardDiscount,
  membershipDiscount,
  walletPayment,
  tax
}) {
  const normalizedSubtotal = roundMoney(subtotal);
  const normalizedDiscount = roundMoney(discount);
  const normalizedLoyaltyDiscount = roundMoney(loyaltyDiscount);
  const normalizedRewardDiscount = roundMoney(rewardDiscount);
  const normalizedGiftcardDiscount = roundMoney(giftcardDiscount);
  const normalizedMembershipDiscount = roundMoney(membershipDiscount);
  const normalizedWalletPayment = Math.max(0, roundMoney(walletPayment));
  const normalizedTax = roundMoney(tax);

  const taxableBase = Math.max(
    0,
    normalizedSubtotal -
      normalizedDiscount -
      normalizedMembershipDiscount -
      normalizedLoyaltyDiscount -
      normalizedRewardDiscount -
      normalizedGiftcardDiscount
  );

  const preWalletTotal = roundMoney(taxableBase + normalizedTax);

  return {
    subtotal: normalizedSubtotal,
    discount: normalizedDiscount,
    loyalty_discount: roundMoney(normalizedLoyaltyDiscount + normalizedRewardDiscount),
    reward_discount: normalizedRewardDiscount,
    giftcard_discount: normalizedGiftcardDiscount,
    membership_discount: normalizedMembershipDiscount,
    wallet_payment: normalizedWalletPayment,
    tax: normalizedTax,
    pre_wallet_total: preWalletTotal,
    total: roundMoney(Math.max(0, preWalletTotal - normalizedWalletPayment))
  };
}

async function applyMemberPointsTransaction({
  conn,
  businessId,
  branchId,
  memberId,
  transactionType,
  points,
  source,
  reference,
  note,
  userId
}) {
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

  if (!memberRows.length) {
    const error = new Error("Selected member was not found");
    error.statusCode = 400;
    throw error;
  }

  const member = memberRows[0];
  const pointsBefore = Math.floor(Number(member.points || 0));
  const lifetimeBefore = Math.floor(Number(member.lifetime_points || 0));
  const pointsAfter =
    transactionType === "redeem" ? pointsBefore - pointAmount : pointsBefore + pointAmount;

  if (pointsAfter < 0) {
    const error = new Error("Insufficient reward points");
    error.statusCode = 400;
    throw error;
  }

  const lifetimeAfter =
    transactionType === "earn" ? lifetimeBefore + pointAmount : lifetimeBefore;
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
     (member_id, transaction_type, points, points_before, points_after, source, reference, note, created_by, business_id, branch_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      memberId,
      transactionType,
      pointAmount,
      pointsBefore,
      pointsAfter,
      source,
      reference,
      note,
      userId || null,
      businessId,
      branchId || null
    ]
  );

  return { pointsBefore, pointsAfter, lifetimeAfter, rewardBadge };
}

async function debitMemberWalletForCheckout({
  conn,
  businessId,
  branchId,
  memberId,
  amount,
  saleCode,
  saleId,
  userId
}) {
  const walletAmount = roundMoney(amount);
  if (walletAmount <= 0) return null;

  if (!memberId) {
    const error = new Error("Select a member before applying wallet credit");
    error.statusCode = 400;
    throw error;
  }

  const [memberRows] = await conn.execute(
    `SELECT id, wallet_balance, wallet_token
     FROM members
     WHERE id = ? AND business_id = ?
     LIMIT 1
     FOR UPDATE`,
    [memberId, businessId]
  );

  if (!memberRows.length) {
    const error = new Error("Selected member was not found");
    error.statusCode = 400;
    throw error;
  }

  const member = memberRows[0];
  const balanceBefore = roundMoney(member.wallet_balance || 0);
  const balanceAfter = roundMoney(balanceBefore - walletAmount);

  if (balanceAfter < 0) {
    const error = new Error("Insufficient wallet balance");
    error.statusCode = 400;
    throw error;
  }

  await conn.execute(
    `UPDATE members
     SET wallet_balance = ?
     WHERE id = ? AND business_id = ?`,
    [balanceAfter, memberId, businessId]
  );

  await conn.execute(
    `INSERT INTO member_wallet_transactions
     (member_id, wallet_token, transaction_type, amount, balance_before, balance_after, source, reference, note, created_by, business_id, branch_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      memberId,
      member.wallet_token,
      "checkout",
      walletAmount,
      balanceBefore,
      balanceAfter,
      "checkout",
      saleCode || (saleId ? `SALE-${saleId}` : null),
      "Wallet applied at checkout",
      userId,
      businessId,
      branchId || null
    ]
  );

  return { balanceBefore, balanceAfter };
}

function validateWalletPayment({ memberId, walletPayment, preWalletTotal }) {
  const normalizedWalletPayment = roundMoney(walletPayment);
  if (normalizedWalletPayment <= 0) return;

  if (!memberId) {
    const error = new Error("Select a member before applying wallet credit");
    error.statusCode = 400;
    throw error;
  }

  if (normalizedWalletPayment > roundMoney(preWalletTotal)) {
    const error = new Error("Wallet payment cannot exceed the order total");
    error.statusCode = 400;
    throw error;
  }
}

// pos/split-price / quote a unit price split across multiple payers
router.post("/split-price", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  try {
    const { unit_price, split_count = 2 } = req.body;

    const unitPrice = Number(unit_price);
    const splitCount = Number(split_count);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "unit_price must be zero or greater"
      });
    }

    if (!Number.isInteger(splitCount) || splitCount < 2 || splitCount > 10) {
      return res.status(400).json({
        success: false,
        message: "split_count must be a whole number between 2 and 10"
      });
    }

    const splitUnitPrice = unitPrice / splitCount;
    const itemDiscountPct = ((splitCount - 1) / splitCount) * 100;

    res.json({
      success: true,
      data: {
        unit_price: unitPrice,
        split_count: splitCount,
        split_unit_price: splitUnitPrice,
        item_discount_pct: itemDiscountPct
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get("/sales-summary", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;

    const recentDates = buildRecentSalesDates();
    const dateKeys = recentDates.map((entry) => entry.key);
    const includeDetails =
      String(req.query.include_details || req.query.includeDetails || "0") === "1";
    const baseWhere = buildSalesSummaryWhere(req, dateKeys);

    const summarySql = `
      SELECT
        DATE(sale_date) AS sale_day,
        COUNT(*) AS sales_count,
        COALESCE(SUM(total), 0) AS sales_total
      ${baseWhere.sql}
      GROUP BY DATE(sale_date)
      ORDER BY sale_day DESC
    `;

    const [rows] = await pool.execute(summarySql, baseWhere.params);
    const rowMap = new Map(
      rows.map((row) => [
        moment(row.sale_day).format("YYYY-MM-DD"),
        {
          sales_count: Number(row.sales_count || 0),
          sales_total: roundMoney(row.sales_total || 0)
        }
      ])
    );

    const days = recentDates.map((entry) => {
      const matched = rowMap.get(entry.key);

      return {
        date: entry.key,
        label: entry.label,
        full_label: entry.fullLabel,
        sales_count: matched?.sales_count || 0,
        sales_total: matched?.sales_total || 0
      };
    });

    const totalSales = roundMoney(
      days.reduce((sum, day) => sum + Number(day.sales_total || 0), 0)
    );
    const totalCount = days.reduce(
      (sum, day) => sum + Number(day.sales_count || 0),
      0
    );

    let details = null;

    if (includeDetails) {
      const salesSql = `
        SELECT
          id,
          sale_code,
          customer,
          shift_id,
          subtotal,
          discount,
          loyalty_discount,
          giftcard_discount,
          membership_discount,
          tax,
          total,
          payment_method,
          currency,
          status,
          refund_reason,
          sale_date
        ${baseWhere.sql}
        ORDER BY sale_date DESC, id DESC
      `;

      const itemsSql = `
        SELECT
          si.sale_id,
          si.product_id,
          si.item_name,
          si.item_type,
          si.qty,
          si.unit_price,
          si.cost,
          si.item_discount_pct,
          si.final_price,
          s.sale_date
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        WHERE s.cashier_id = ?
          AND s.business_id = ?
          AND DATE(s.sale_date) IN (${dateKeys.map(() => "?").join(", ")})
          ${req.user.branch_id ? "AND s.branch_id = ?" : ""}
        ORDER BY s.sale_date DESC, si.id DESC
      `;

      const [saleRows, itemRows] = await Promise.all([
        pool.execute(salesSql, baseWhere.params),
        pool.execute(itemsSql, baseWhere.params)
      ]);

      const sales = saleRows[0].map((sale) => {
        const itemCount = 0;
        return {
          sale_id: Number(sale.id),
          sale_code: sale.sale_code,
          customer: sale.customer || "Walk-in",
          shift_id: sale.shift_id || null,
          subtotal: roundMoney(sale.subtotal || 0),
          discount: roundMoney(sale.discount || 0),
          loyalty_discount: roundMoney(sale.loyalty_discount || 0),
          giftcard_discount: roundMoney(sale.giftcard_discount || 0),
          membership_discount: roundMoney(sale.membership_discount || 0),
          tax: roundMoney(sale.tax || 0),
          total: roundMoney(sale.total || 0),
          payment_method: sale.payment_method || "unknown",
          currency: sale.currency || "NGN",
          status: sale.status || "completed",
          refund_reason: sale.refund_reason || null,
          sale_date: sale.sale_date,
          sold_items: itemCount,
          sold_units: 0
        };
      });

      const saleMap = new Map(sales.map((sale) => [sale.sale_id, sale]));
      const itemSummaryMap = new Map();
      const paymentSummaryMap = new Map();
      const daysDetailMap = new Map(
        recentDates.map((entry) => [
          entry.key,
          {
            date: entry.key,
            label: entry.label,
            full_label: entry.fullLabel,
            sales_total: 0,
            sales_count: 0,
            subtotal: 0,
            tax_total: 0,
            discounts_total: 0,
            items_sold: 0,
            unique_items: 0,
            payment_methods: [],
            top_items: [],
            sales: []
          }
        ])
      );

      for (const item of itemRows[0]) {
        const saleId = Number(item.sale_id);
        const sale = saleMap.get(saleId);
        const qty = Number(item.qty || 0);
        const finalPrice = roundMoney(item.final_price || 0);

        if (sale) {
          sale.sold_items += 1;
          sale.sold_units += qty;
        }

        const saleDayKey = moment(item.sale_date).format("YYYY-MM-DD");
        const dayDetail = daysDetailMap.get(saleDayKey);
        if (!dayDetail) continue;

        dayDetail.items_sold += qty;

        const itemKey = `${saleDayKey}::${String(item.item_name || "Item").trim().toLowerCase()}`;
        const existingItem = itemSummaryMap.get(itemKey) || {
          day: saleDayKey,
          item_name: item.item_name || "Item",
          item_type: item.item_type || "fixed",
          qty: 0,
          revenue: 0
        };

        existingItem.qty += qty;
        existingItem.revenue = roundMoney(existingItem.revenue + finalPrice);
        itemSummaryMap.set(itemKey, existingItem);
      }

      for (const sale of sales) {
        const saleDayKey = moment(sale.sale_date).format("YYYY-MM-DD");
        const dayDetail = daysDetailMap.get(saleDayKey);
        if (!dayDetail) continue;

        const discountsTotal =
          Number(sale.discount || 0) +
          Number(sale.loyalty_discount || 0) +
          Number(sale.giftcard_discount || 0) +
          Number(sale.membership_discount || 0);

        dayDetail.sales_total = roundMoney(dayDetail.sales_total + Number(sale.total || 0));
        dayDetail.sales_count += 1;
        dayDetail.subtotal = roundMoney(dayDetail.subtotal + Number(sale.subtotal || 0));
        dayDetail.tax_total = roundMoney(dayDetail.tax_total + Number(sale.tax || 0));
        dayDetail.discounts_total = roundMoney(dayDetail.discounts_total + discountsTotal);
        dayDetail.sales.push(sale);

        const paymentKey = `${saleDayKey}::${sale.payment_method}`;
        const paymentSummary = paymentSummaryMap.get(paymentKey) || {
          day: saleDayKey,
          payment_method: sale.payment_method,
          sales_count: 0,
          total: 0
        };
        paymentSummary.sales_count += 1;
        paymentSummary.total = roundMoney(paymentSummary.total + Number(sale.total || 0));
        paymentSummaryMap.set(paymentKey, paymentSummary);
      }

      for (const dayDetail of daysDetailMap.values()) {
        const paymentMethods = Array.from(paymentSummaryMap.values())
          .filter((entry) => entry.day === dayDetail.date)
          .map(({ day, ...rest }) => rest)
          .sort((a, b) => b.total - a.total);

        const topItems = Array.from(itemSummaryMap.values())
          .filter((entry) => entry.day === dayDetail.date)
          .sort((a, b) => (b.qty !== a.qty ? b.qty - a.qty : b.revenue - a.revenue))
          .map(({ day, ...rest }) => rest);

        dayDetail.payment_methods = paymentMethods;
        dayDetail.top_items = topItems;
        dayDetail.unique_items = topItems.length;
      }

      details = {
        generated_at: moment().format("YYYY-MM-DD HH:mm:ss"),
        closing_window: {
          from: recentDates[recentDates.length - 1]?.key || null,
          to: recentDates[0]?.key || null
        },
        days: recentDates.map((entry) => daysDetailMap.get(entry.key)),
        payment_methods: Array.from(paymentSummaryMap.values())
          .map(({ day, ...rest }) => rest)
          .reduce((acc, item) => {
            const existing = acc.find((entry) => entry.payment_method === item.payment_method);
            if (existing) {
              existing.sales_count += item.sales_count;
              existing.total = roundMoney(existing.total + item.total);
            } else {
              acc.push({ ...item });
            }
            return acc;
          }, [])
          .sort((a, b) => b.total - a.total),
        sold_items: Array.from(itemSummaryMap.values())
          .map(({ day, ...rest }) => rest)
          .reduce((acc, item) => {
            const existing = acc.find(
              (entry) =>
                entry.item_name === item.item_name && entry.item_type === item.item_type
            );
            if (existing) {
              existing.qty += item.qty;
              existing.revenue = roundMoney(existing.revenue + item.revenue);
            } else {
              acc.push({ ...item });
            }
            return acc;
          }, [])
          .sort((a, b) => (b.qty !== a.qty ? b.qty - a.qty : b.revenue - a.revenue))
      };
    }

    res.json({
      success: true,
      data: {
        cashier_id: req.user.id,
        branch_id: req.user.branch_id || null,
        days,
        total_sales: totalSales,
        total_count: totalCount,
        details
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// pos/pending / create new pending cart
router.post("/pending", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  const conn = await pool.getConnection();

  try {
    if (!ensureBusinessContext(req, res)) return;
    const {
      customer = "Walk-in",
      member_id = null,
      shift_id = null,
      subtotal = 0,
      discount = 0,
      loyalty_discount = 0,
      reward_points_redeemed = 0,
      giftcard_discount = 0,
      wallet_payment = 0,
      tax = 0,
      total = 0,
      currency = "NGN",
      note = null,
      items = []
    } = req.body;

    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: "No items in cart"
      });
    }

    await conn.beginTransaction();

    const membershipContext = await resolveMembershipContext(
      conn,
      req.user.business_id,
      member_id,
      customer,
      items,
      { applyMembershipDiscount: roundMoney(wallet_payment) > 0 }
    );
    const totals = buildCheckoutTotals({
      subtotal,
      discount,
      loyaltyDiscount: loyalty_discount,
      rewardDiscount: calculateRewardDiscount(reward_points_redeemed),
      giftcardDiscount: giftcard_discount,
      membershipDiscount: membershipContext.membershipDiscountAmount,
      walletPayment: wallet_payment,
      tax
    });
    validateWalletPayment({
      memberId: membershipContext.memberId,
      walletPayment: totals.wallet_payment,
      preWalletTotal: totals.pre_wallet_total
    });
    if (Number(reward_points_redeemed || 0) > 0 && !membershipContext.memberId) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: "Select a member before redeeming reward points"
      });
    }

    const cartCode = `PEND-${Date.now()}`;

    const [cartResult] = await conn.execute(
      `INSERT INTO pending_carts
      (cart_code, customer, member_id, membership_tier_id, membership_tier_name, membership_discount_pct, membership_discount, cashier_id, shift_id, subtotal, discount, loyalty_discount, reward_points_redeemed, giftcard_discount, wallet_payment, tax, total, currency, note, business_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cartCode,
        membershipContext.customerName,
        membershipContext.memberId,
        membershipContext.membershipTierId,
        membershipContext.membershipTierName,
        membershipContext.membershipDiscountPct,
        membershipContext.membershipDiscountAmount,
        req.user.id,
        shift_id,
        totals.subtotal,
        totals.discount,
        totals.loyalty_discount,
        Number(reward_points_redeemed || 0),
        totals.giftcard_discount,
        totals.wallet_payment,
        totals.tax,
        totals.total,
        currency,
        note,
        req.user.business_id,
        req.user.branch_id || null
      ]
    );

    const pendingCartId = cartResult.insertId;

    for (const item of items) {
      await conn.execute(
        `INSERT INTO pending_cart_items
	        (pending_cart_id, product_id, unit_level_id, unit_label, unit_short_name, item_name, icon, item_type, qty, unit_price, cost, item_discount_pct, session_start, session_end, elapsed_seconds, final_price, manage_stock)
	        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pendingCartId,
          item.product_id || null,
          item.unit_level_id || null,
          item.unit_label || null,
          item.unit_short_name || null,
          item.item_name,
          item.icon || null,
          normalizeItemType(item.item_type),
          item.qty || 1,
          item.unit_price || 0,
          item.cost || 0,
          item.item_discount_pct || 0,
          toMySQLDateTime(item.session_start),
          toMySQLDateTime(item.session_end),
          item.elapsed_seconds || 0,
          item.final_price || 0,
          item.manage_stock ? 1 : 0
        ]
      );
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Cart saved as pending",
      pendingCartId,
      cartCode
    });
  } catch (error) {
    await conn.rollback();
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  } finally {
    conn.release();
  }
});

// pos/pending / get all pending carts
router.get("/pending", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const isAdmin =
      req.user.role === "admin" ||
      req.user.is_admin === 1 ||
      req.user.is_admin === true;

    let sql = `
      SELECT 
        pc.id,
        pc.cart_code,
        pc.customer,
        pc.member_id,
        pc.membership_tier_name,
        pc.membership_discount_pct,
        pc.membership_discount,
        pc.reward_points_redeemed,
        pc.wallet_payment,
        pc.points_earned,
        pc.total,
        pc.currency,
        pc.status,
        pc.note,
        pc.created_at,
        pc.updated_at,
        u.name AS cashier_name,
        COALESCE(pci.items_count, 0) AS items_count
      FROM pending_carts pc
      LEFT JOIN users u ON pc.cashier_id = u.id
      LEFT JOIN (
        SELECT pending_cart_id, COUNT(*) AS items_count
        FROM pending_cart_items
        GROUP BY pending_cart_id
      ) pci ON pci.pending_cart_id = pc.id
      WHERE pc.status = 'pending'
    `;

    const params = [];

    if (!isAdmin) {
      sql += ` AND pc.business_id = ?`;
      params.push(req.user.business_id);
      if (req.user.branch_id) {
        sql += ` AND pc.branch_id = ?`;
        params.push(req.user.branch_id);
      }
    }

    sql += ` ORDER BY pc.created_at DESC`;

    const [rows] = await pool.execute(sql, params);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// pos/pending/:id / get single pending cart
router.get("/pending/:id", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { id } = req.params;
    const isAdmin = isAdminUser(req.user);

    let sql = `
      SELECT * FROM pending_carts 
      WHERE id = ? AND status = 'pending'
    `;
    const params = [id];

    if (!isAdmin) {
      sql += ` AND business_id = ?`;
      params.push(req.user.business_id);
      if (req.user.branch_id) {
        sql += ` AND branch_id = ?`;
        params.push(req.user.branch_id);
      }
    }

    sql += ` LIMIT 1`;

    const [cartRows] = await pool.execute(sql, params);

    if (!cartRows.length) {
      return res.status(404).json({
        success: false,
        message: "Pending cart not found"
      });
    }

    const [itemRows] = await pool.execute(
      `SELECT * FROM pending_cart_items WHERE pending_cart_id = ? ORDER BY id ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...cartRows[0],
        items: itemRows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// pos/pending/:id / update pending cart
router.put("/pending/:id", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  const conn = await pool.getConnection();

  try {
    if (!ensureBusinessContext(req, res)) return;
    const { id } = req.params;
    const isAdmin = isAdminUser(req.user);

    const {
      customer = "Walk-in",
      member_id = null,
      shift_id = null,
      subtotal = 0,
      discount = 0,
      loyalty_discount = 0,
      reward_points_redeemed = 0,
      giftcard_discount = 0,
      wallet_payment = 0,
      tax = 0,
      total = 0,
      currency = "NGN",
      note = null,
      items = []
    } = req.body;

    // 🔐 ownership check
    let sql = `
      SELECT id FROM pending_carts
      WHERE id = ? AND status = 'pending'
    `;
    const params = [id];

    if (!isAdmin) {
      sql += ` AND business_id = ?`;
      params.push(req.user.business_id);
      if (req.user.branch_id) {
        sql += ` AND branch_id = ?`;
        params.push(req.user.branch_id);
      }
    }

    sql += ` LIMIT 1`;

    const [cartRows] = await conn.execute(sql, params);

    if (!cartRows.length) {
      return res.status(404).json({
        success: false,
        message: "Pending cart not found"
      });
    }

    await conn.beginTransaction();

    const membershipContext = await resolveMembershipContext(
      conn,
      req.user.business_id,
      member_id,
      customer,
      items,
      { applyMembershipDiscount: roundMoney(wallet_payment) > 0 }
    );
    const totals = buildCheckoutTotals({
      subtotal,
      discount,
      loyaltyDiscount: loyalty_discount,
      rewardDiscount: calculateRewardDiscount(reward_points_redeemed),
      giftcardDiscount: giftcard_discount,
      membershipDiscount: membershipContext.membershipDiscountAmount,
      walletPayment: wallet_payment,
      tax
    });
    validateWalletPayment({
      memberId: membershipContext.memberId,
      walletPayment: totals.wallet_payment,
      preWalletTotal: totals.pre_wallet_total
    });
    if (Number(reward_points_redeemed || 0) > 0 && !membershipContext.memberId) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: "Select a member before redeeming reward points"
      });
    }

    await conn.execute(
      `UPDATE pending_carts SET
        customer = ?,
        member_id = ?,
        membership_tier_id = ?,
        membership_tier_name = ?,
        membership_discount_pct = ?,
        membership_discount = ?,
        shift_id = ?,
        subtotal = ?,
        discount = ?,
        loyalty_discount = ?,
        reward_points_redeemed = ?,
        giftcard_discount = ?,
        wallet_payment = ?,
        tax = ?,
        total = ?,
        currency = ?,
        note = ?
       WHERE id = ?`,
      [
        membershipContext.customerName,
        membershipContext.memberId,
        membershipContext.membershipTierId,
        membershipContext.membershipTierName,
        membershipContext.membershipDiscountPct,
        membershipContext.membershipDiscountAmount,
        shift_id,
        totals.subtotal,
        totals.discount,
        totals.loyalty_discount,
        Number(reward_points_redeemed || 0),
        totals.giftcard_discount,
        totals.wallet_payment,
        totals.tax,
        totals.total,
        currency,
        note,
        id
      ]
    );

    await conn.execute(
      `DELETE FROM pending_cart_items WHERE pending_cart_id = ?`,
      [id]
    );

    for (const item of items) {
      await conn.execute(
        `INSERT INTO pending_cart_items
	        (pending_cart_id, product_id, unit_level_id, unit_label, unit_short_name, item_name, icon, item_type, qty, unit_price, cost, item_discount_pct, session_start, session_end, elapsed_seconds, final_price, manage_stock)
	        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          item.product_id || null,
          item.unit_level_id || null,
          item.unit_label || null,
          item.unit_short_name || null,
          item.item_name,
          item.icon || null,
          normalizeItemType(item.item_type),
          item.qty || 1,
          item.unit_price || 0,
          item.cost || 0,
          item.item_discount_pct || 0,
          toMySQLDateTime(item.session_start),
          toMySQLDateTime(item.session_end),
          item.elapsed_seconds || 0,
          item.final_price || 0,
          item.manage_stock ? 1 : 0
        ]
      );
    }

    await conn.commit();

    res.json({
      success: true,
      message: "Pending cart updated"
    });
  } catch (error) {
    await conn.rollback();
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  } finally {
    conn.release();
  }
});

// pos/pending/:id / cancel pending cart
router.delete("/pending/:id", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { id } = req.params;
    const isAdmin = isAdminUser(req.user);

    let sql = `
      UPDATE pending_carts 
      SET status = 'cancelled' 
      WHERE id = ? AND status = 'pending'
    `;
    const params = [id];

    if (!isAdmin) {
      sql += ` AND business_id = ?`;
      params.push(req.user.business_id);
      if (req.user.branch_id) {
        sql += ` AND branch_id = ?`;
        params.push(req.user.branch_id);
      }
    }

    const [result] = await pool.execute(sql, params);

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Pending cart not found or not allowed"
      });
    }

    res.json({
      success: true,
      message: "Pending cart cancelled"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// pos/pending/:id/checkout / checkout pending cart
router.post("/pending/:id/checkout", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  const conn = await pool.getConnection();

  try {
    if (!ensureBusinessContext(req, res)) return;
    const { id } = req.params;
    const { payment_method } = req.body;
    const isAdmin = isAdminUser(req.user);

    if (!payment_method) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required"
      });
    }

    await conn.beginTransaction();

    // 🔐 ownership check
    let sql = `
      SELECT * FROM pending_carts
      WHERE id = ? AND status = 'pending'
    `;
    const params = [id];

    if (!isAdmin) {
      sql += ` AND business_id = ?`;
      params.push(req.user.business_id);
      if (req.user.branch_id) {
        sql += ` AND branch_id = ?`;
        params.push(req.user.branch_id);
      }
    }

    sql += ` LIMIT 1`;

    const [cartRows] = await conn.execute(sql, params);

    if (!cartRows.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        message: "Pending cart not found"
      });
    }

    const cart = cartRows[0];

    const [items] = await conn.execute(
      `SELECT * FROM pending_cart_items WHERE pending_cart_id = ? ORDER BY id ASC`,
      [id]
    );

    if (!items.length) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: "Pending cart has no items"
      });
    }

    const saleCode = `SALE-${Date.now()}`;
    const rewardPointsRedeemed = Math.max(0, Math.floor(Number(cart.reward_points_redeemed || 0)));
    const membershipDiscountAllowed = roundMoney(cart.wallet_payment || 0) > 0;
    const saleMembershipTierId = membershipDiscountAllowed
      ? cart.membership_tier_id || null
      : null;
    const saleMembershipTierName = membershipDiscountAllowed
      ? cart.membership_tier_name || null
      : null;
    const saleMembershipDiscountPct = membershipDiscountAllowed
      ? cart.membership_discount_pct || 0
      : 0;
    const saleMembershipDiscount = membershipDiscountAllowed
      ? cart.membership_discount || 0
      : 0;
    const saleTotal = membershipDiscountAllowed
      ? roundMoney(cart.total || 0)
      : roundMoney(
          Math.max(
            0,
            Number(cart.subtotal || 0) -
              Number(cart.discount || 0) -
              Number(cart.loyalty_discount || 0) -
              Number(cart.giftcard_discount || 0) +
              Number(cart.tax || 0)
          )
        );
    const pointsEarned = cart.points_awarded_at
      ? Number(cart.points_earned || 0)
      : calculatePointsEarned(saleTotal + Number(cart.wallet_payment || 0));

    const [saleResult] = await conn.execute(
      `INSERT INTO sales
      (sale_code, customer, member_id, membership_tier_id, membership_tier_name, membership_discount_pct, membership_discount, cashier_id, shift_id, subtotal, discount, loyalty_discount, reward_points_redeemed, giftcard_discount, wallet_payment, points_earned, tax, total, payment_method, currency, business_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saleCode,
        cart.customer,
        cart.member_id || null,
        saleMembershipTierId,
        saleMembershipTierName,
        saleMembershipDiscountPct,
        saleMembershipDiscount,
        req.user.id,
        cart.shift_id,
        cart.subtotal,
        cart.discount,
        cart.loyalty_discount,
        rewardPointsRedeemed,
        cart.giftcard_discount,
        cart.wallet_payment || 0,
        pointsEarned,
        cart.tax,
        saleTotal,
        payment_method,
        cart.currency,
        cart.business_id || req.user.business_id,
        cart.branch_id || req.user.branch_id || null
      ]
    );

    const saleId = saleResult.insertId;

    if (rewardPointsRedeemed > 0) {
      await applyMemberPointsTransaction({
        conn,
        businessId: cart.business_id || req.user.business_id,
        branchId: cart.branch_id || req.user.branch_id || null,
        memberId: cart.member_id || null,
        transactionType: "redeem",
        points: rewardPointsRedeemed,
        source: "pos_checkout",
        reference: saleCode,
        note: "Reward points redeemed at checkout",
        userId: req.user.id
      });
    }

    if (!cart.wallet_debited_at) {
      await debitMemberWalletForCheckout({
        conn,
        businessId: cart.business_id || req.user.business_id,
        branchId: cart.branch_id || req.user.branch_id || null,
        memberId: cart.member_id || null,
        amount: cart.wallet_payment || 0,
        saleCode,
        saleId,
        userId: req.user.id
      });
    }

    if (!cart.points_awarded_at && pointsEarned > 0) {
      await applyMemberPointsTransaction({
        conn,
        businessId: cart.business_id || req.user.business_id,
        branchId: cart.branch_id || req.user.branch_id || null,
        memberId: cart.member_id || null,
        transactionType: "earn",
        points: pointsEarned,
        source: "pos_checkout",
        reference: saleCode,
        note: "Points earned from POS purchase",
        userId: req.user.id
      });
    }

    for (const item of items) {
      await conn.execute(
        `INSERT INTO sale_items
	        (sale_id, product_id, unit_level_id, unit_label, unit_short_name, item_name, icon, item_type, qty, unit_price, cost, item_discount_pct, session_start, session_end, elapsed_seconds, final_price)
	        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          item.product_id || null,
          item.unit_level_id || null,
          item.unit_label || null,
          item.unit_short_name || null,
          item.item_name,
          item.icon || null,
          normalizeItemType(item.item_type),
          item.qty || 1,
          item.unit_price || 0,
          item.cost || 0,
          item.item_discount_pct || 0,
          toMySQLDateTime(item.session_start),
          toMySQLDateTime(item.session_end),
          item.elapsed_seconds || 0,
          item.final_price || 0
        ]
      );

      // 🔥 stock protection stays intact - support both traditional and unit hierarchy
      if (item.product_id && item.manage_stock && item.qty > 0) {
        const [productRows] = await conn.execute(
          `SELECT stock, is_unlimited, has_unit_hierarchy FROM products WHERE id = ? LIMIT 1`,
          [item.product_id]
        );

        if (!productRows.length) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            message: `Product ${item.product_id} not found`
          });
        }

        const product = productRows[0];
        if (Number(product.is_unlimited) === 1) continue;

        // Handle unit hierarchy products
        if (Number(product.has_unit_hierarchy) === 1) {
          const deductResult = item.unit_level_id
            ? await deductUnitInventoryByLevel(
                conn,
                item.product_id,
                item.unit_level_id,
                item.qty,
                cart.branch_id || req.user.branch_id || null
              )
            : await deductUnitInventory(
                conn,
                item.product_id,
                item.qty,
                cart.branch_id || req.user.branch_id || null
              );

          if (!deductResult.success) {
            await conn.rollback();
            return res.status(400).json({
              success: false,
              message: deductResult.message
            });
          }

          // Record history for each deduction
          for (const change of deductResult.changes) {
            await recordUnitInventoryHistory(
              conn,
              item.product_id,
              change.unit_level_id,
              change.before_qty,
              change.after_qty,
              `Sale #${saleId}`,
              req.user.id,
              cart.branch_id || req.user.branch_id || null
            );
          }
        } else {
          // Handle traditional stock products
          const beforeQty = Number(product.stock || 0);

          if (beforeQty < item.qty) {
            await conn.rollback();
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for ${item.item_name}`
            });
          }

          const afterQty = beforeQty - item.qty;

          await conn.execute(
            `UPDATE products SET stock = ? WHERE id = ?`,
            [afterQty, item.product_id]
          );

          await conn.execute(
            `INSERT INTO stock_history
            (product_id, before_qty, after_qty, change_qty, reason, by_user_id, business_id, branch_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.product_id,
              beforeQty,
              afterQty,
              -item.qty,
              `Sale #${saleId}`,
              req.user.id,
              cart.business_id || req.user.business_id,
              cart.branch_id || req.user.branch_id || null
            ]
          );
        }
      }
    }

    await conn.execute(
      `UPDATE pending_carts SET status = 'checked_out' WHERE id = ?`,
      [id]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Pending cart checked out successfully",
      saleId,
      saleCode
    });
  } catch (error) {
    await conn.rollback();
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  } finally {
    conn.release();
  }
});

// pos/checkout / create sale
router.post("/checkout", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  const conn = await pool.getConnection();

  try {
    if (!ensureBusinessContext(req, res)) return;
    const {
      customer = "Walk-in",
      member_id = null,
      shift_id = null,
      subtotal = 0,
      discount = 0,
      loyalty_discount = 0,
      reward_points_redeemed = 0,
      giftcard_discount = 0,
      wallet_payment = 0,
      tax = 0,
      total = 0,
      payment_method,
      currency = "NGN",
      items = []
    } = req.body;

    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: "No items in cart"
      });
    }

    await conn.beginTransaction();

    const membershipContext = await resolveMembershipContext(
      conn,
      req.user.business_id,
      member_id,
      customer,
      items,
      { applyMembershipDiscount: roundMoney(wallet_payment) > 0 }
    );
    const totals = buildCheckoutTotals({
      subtotal,
      discount,
      loyaltyDiscount: loyalty_discount,
      rewardDiscount: calculateRewardDiscount(reward_points_redeemed),
      giftcardDiscount: giftcard_discount,
      membershipDiscount: membershipContext.membershipDiscountAmount,
      walletPayment: wallet_payment,
      tax
    });
    validateWalletPayment({
      memberId: membershipContext.memberId,
      walletPayment: totals.wallet_payment,
      preWalletTotal: totals.pre_wallet_total
    });
    const rewardPointsRedeemed = Math.max(0, Math.floor(Number(reward_points_redeemed || 0)));
    if (rewardPointsRedeemed > 0 && !membershipContext.memberId) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: "Select a member before redeeming reward points"
      });
    }
    const pointsEarned = calculatePointsEarned(totals.total + totals.wallet_payment);

    const saleCode = `SALE-${Date.now()}`;

    const [saleResult] = await conn.execute(
      `INSERT INTO sales
      (sale_code, customer, member_id, membership_tier_id, membership_tier_name, membership_discount_pct, membership_discount, cashier_id, shift_id, subtotal, discount, loyalty_discount, reward_points_redeemed, giftcard_discount, wallet_payment, points_earned, tax, total, payment_method, currency, business_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saleCode,
        membershipContext.customerName,
        membershipContext.memberId,
        membershipContext.membershipTierId,
        membershipContext.membershipTierName,
        membershipContext.membershipDiscountPct,
        membershipContext.membershipDiscountAmount,
        req.user.id,
        shift_id,
        totals.subtotal,
        totals.discount,
        totals.loyalty_discount,
        rewardPointsRedeemed,
        totals.giftcard_discount,
        totals.wallet_payment,
        pointsEarned,
        totals.tax,
        totals.total,
        payment_method,
        currency,
        req.user.business_id,
        req.user.branch_id || null
      ]
    );

    const saleId = saleResult.insertId;

    if (rewardPointsRedeemed > 0) {
      await applyMemberPointsTransaction({
        conn,
        businessId: req.user.business_id,
        branchId: req.user.branch_id || null,
        memberId: membershipContext.memberId,
        transactionType: "redeem",
        points: rewardPointsRedeemed,
        source: "pos_checkout",
        reference: saleCode,
        note: "Reward points redeemed at checkout",
        userId: req.user.id
      });
    }

    await debitMemberWalletForCheckout({
      conn,
      businessId: req.user.business_id,
      branchId: req.user.branch_id || null,
      memberId: membershipContext.memberId,
      amount: totals.wallet_payment,
      saleCode,
      saleId,
      userId: req.user.id
    });

    if (pointsEarned > 0) {
      await applyMemberPointsTransaction({
        conn,
        businessId: req.user.business_id,
        branchId: req.user.branch_id || null,
        memberId: membershipContext.memberId,
        transactionType: "earn",
        points: pointsEarned,
        source: "pos_checkout",
        reference: saleCode,
        note: "Points earned from POS purchase",
        userId: req.user.id
      });
    }

    for (const item of items) {
      await conn.execute(
        `INSERT INTO sale_items
	        (sale_id, product_id, unit_level_id, unit_label, unit_short_name, item_name, icon, item_type, qty, unit_price, cost, item_discount_pct, session_start, session_end, elapsed_seconds, final_price)
	        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          item.product_id || null,
          item.unit_level_id || null,
          item.unit_label || null,
          item.unit_short_name || null,
          item.item_name,
          item.icon || null,
          normalizeItemType(item.item_type),
          item.qty || 1,
          item.unit_price || 0,
          item.cost || 0,
          item.item_discount_pct || 0,
          toMySQLDateTime(item.session_start),
          toMySQLDateTime(item.session_end),
          item.elapsed_seconds || 0,
          item.final_price || 0
        ]
      );

      if (item.product_id && item.manage_stock && item.qty > 0) {
        const [productRows] = await conn.execute(
          `SELECT stock, is_unlimited, has_unit_hierarchy FROM products WHERE id = ? LIMIT 1`,
          [item.product_id]
        );

        if (!productRows.length) {
          await conn.rollback();
          return res.status(400).json({
            success: false,
            message: `Product ${item.product_id} not found`
          });
        }

        const product = productRows[0];
        if (Number(product.is_unlimited) === 1) continue;

        // Handle unit hierarchy products
        if (Number(product.has_unit_hierarchy) === 1) {
          const deductResult = item.unit_level_id
            ? await deductUnitInventoryByLevel(
                conn,
                item.product_id,
                item.unit_level_id,
                item.qty,
                req.user.branch_id || null
              )
            : await deductUnitInventory(
                conn,
                item.product_id,
                item.qty,
                req.user.branch_id || null
              );

          if (!deductResult.success) {
            await conn.rollback();
            return res.status(400).json({
              success: false,
              message: deductResult.message
            });
          }

          // Record history for each deduction
          for (const change of deductResult.changes) {
            await recordUnitInventoryHistory(
              conn,
              item.product_id,
              change.unit_level_id,
              change.before_qty,
              change.after_qty,
              `Sale #${saleId}`,
              req.user.id,
              req.user.branch_id || null
            );
          }
        } else {
          // Handle traditional stock products
          const beforeQty = Number(product.stock || 0);

          if (beforeQty < item.qty) {
            await conn.rollback();
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for ${item.item_name}`
            });
          }

          const afterQty = beforeQty - item.qty;

          await conn.execute(
            `UPDATE products SET stock = ? WHERE id = ?`,
            [afterQty, item.product_id]
          );

          await conn.execute(
            `INSERT INTO stock_history
            (product_id, before_qty, after_qty, change_qty, reason, by_user_id, business_id, branch_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.product_id,
              beforeQty,
              afterQty,
              -item.qty,
              `Sale #${saleId}`,
              req.user.id,
              req.user.business_id,
              req.user.branch_id || null
            ]
          );
        }
      }
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Sale completed",
      saleId,
      saleCode
    });
  } catch (error) {
    await conn.rollback();
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  } finally {
    conn.release();
  }
});

module.exports = router;
