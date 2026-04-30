const express = require("express");
const { query, pool } = require("../config/db");
const { authenticateToken, requirePermission, requireAnyPermission } = require("../middleware/auth");
const { ensureBusinessContext, isAdmin } = require("../utils/tenant");
const branchAccessMiddleware = require("../middleware/branchAccessMiddleware");
const {
  deductUnitInventory,
  loadHierarchy,
  loadInventoryMap,
  calculateTotalInSmallestUnits,
  recordUnitInventoryHistory,
  restoreUnitInventory,
  syncProductStock
} = require("../utils/unitHierarchy");

const router = express.Router();

router.use(authenticateToken);

const ALLOWED_CATEGORY_TYPES = ["sporty", "consumable", "service", "other"];
const ALLOWED_PRODUCT_TYPES = ["timed", "fixed", "gear", "food", "drink", "service"];
const ALLOWED_CONSUMABLE_TYPES = ["food", "drink", "other"];

function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

function normalizeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}

function normalizeNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function normalizeOptionalText(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

async function findScopedProductUnit(unitId, businessId) {
  return query(
    `SELECT id, name, short_name
     FROM product_units
     WHERE id = ? AND business_id = ?
     LIMIT 1`,
    [unitId, businessId]
  );
}

function normalizePositiveInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    const error = new Error(`${fieldName} must be a positive whole number`);
    error.statusCode = 400;
    throw error;
  }

  return parsed;
}

function normalizeCurrencyAmount(value, fieldName) {
  const parsed = Number(value);

  if (Number.isNaN(parsed) || parsed < 0) {
    const error = new Error(`${fieldName} must be zero or greater`);
    error.statusCode = 400;
    throw error;
  }

  return Number(parsed.toFixed(2));
}

async function buildHierarchyPayload(units, businessId) {
  if (!Array.isArray(units) || units.length < 2) {
    const error = new Error("At least two unit levels are required");
    error.statusCode = 400;
    throw error;
  }

  const seenUnitIds = new Set();
  const prepared = [];

  for (let index = 0; index < units.length; index += 1) {
    const entry = units[index] || {};
    const unitId = normalizePositiveInteger(entry.unit_id, `units[${index}].unit_id`);
    const unitRows = await findScopedProductUnit(unitId, businessId);

    if (!unitRows.length) {
      const error = new Error(`Unit ${unitId} was not found`);
      error.statusCode = 404;
      throw error;
    }

    if (seenUnitIds.has(unitId)) {
      const error = new Error("A unit can only appear once in a hierarchy");
      error.statusCode = 400;
      throw error;
    }

    seenUnitIds.add(unitId);

    const isRoot = index === 0;
    const conversionFactor = isRoot
      ? 1
      : normalizePositiveInteger(
          entry.conversion_factor,
          `units[${index}].conversion_factor`
        );

    if (!isRoot && conversionFactor <= 1) {
      const error = new Error("Child unit conversion factors must be greater than 1");
      error.statusCode = 400;
      throw error;
    }

    prepared.push({
      unit_id: unitId,
      level: index + 1,
      conversion_factor: conversionFactor,
      price: normalizeCurrencyAmount(entry.price, `units[${index}].price`),
      is_smallest_unit: index === units.length - 1 ? 1 : 0
    });
  }

  return prepared;
}

// categories / get all categories
router.get("/categories", requirePermission("inventory"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const rows = await query(
      `SELECT id, name, type, created_at
       FROM categories
       WHERE business_id = ?
       ORDER BY name ASC`
      , [req.user.business_id]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// categories / create category
router.post("/categories", requirePermission("inventory"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { name, type = "other" } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required"
      });
    }

    if (!ALLOWED_CATEGORY_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category type"
      });
    }

    const existingCategory = await query(
      `SELECT id FROM categories WHERE name = ? AND business_id = ? LIMIT 1`,
      [String(name).trim(), req.user.business_id]
    );

    if (existingCategory.length) {
      return res.status(400).json({
        success: false,
        message: "Category already exists"
      });
    }

    await query(
      `INSERT INTO categories (name, type, business_id) VALUES (?, ?, ?)`,
      [String(name).trim(), type, req.user.business_id]
    );

    res.status(201).json({
      success: true,
      message: "Category created successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// categories/:id update category
router.put("/categories/:id", requirePermission("inventory"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type = "other" } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required"
      });
    }

    if (!ALLOWED_CATEGORY_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category type"
      });
    }

    const existingCategory = await query(
      `SELECT id FROM categories WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!existingCategory.length) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    const duplicateCategory = await query(
      `SELECT id FROM categories WHERE name = ? AND id != ? LIMIT 1`,
      [String(name).trim(), id]
    );

    if (duplicateCategory.length) {
      return res.status(400).json({
        success: false,
        message: "Another category with this name already exists"
      });
    }

    await query(
      `UPDATE categories
       SET name = ?, type = ?
       WHERE id = ?`,
      [String(name).trim(), type, id]
    );

    res.json({
      success: true,
      message: "Category updated successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// categories/:id delete category
router.delete("/categories/:id", requirePermission("inventory"), async (req, res) => {
  try {
    const { id } = req.params;

    const existingCategory = await query(
      `SELECT id FROM categories WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!existingCategory.length) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    const linkedProducts = await query(
      `SELECT id FROM products WHERE category_id = ? LIMIT 1`,
      [id]
    );

    if (linkedProducts.length) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete category because it is linked to product(s)"
      });
    }

    await query(`DELETE FROM categories WHERE id = ?`, [id]);

    res.json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// product units / list all units
router.get("/units", requirePermission("inventory"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const rows = await query(
      `SELECT id, name, short_name, created_at, updated_at
       FROM product_units
       WHERE business_id = ?
       ORDER BY name ASC`,
      [req.user.business_id]
    );

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// product units / create unit
router.post("/units", requirePermission("inventory"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const name = normalizeOptionalText(req.body?.name);
    const shortName = normalizeOptionalText(req.body?.short_name);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Unit name is required"
      });
    }

    const existingUnit = await query(
      `SELECT id
       FROM product_units
       WHERE business_id = ? AND name = ?
       LIMIT 1`,
      [req.user.business_id, name]
    );

    if (existingUnit.length) {
      return res.status(400).json({
        success: false,
        message: "Unit type already exists"
      });
    }

    await query(
      `INSERT INTO product_units (name, short_name, business_id)
       VALUES (?, ?, ?)`,
      [name, shortName, req.user.business_id]
    );

    res.status(201).json({
      success: true,
      message: "Unit type created successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// product units / update unit
router.put("/units/:id", requirePermission("inventory"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { id } = req.params;
    const name = normalizeOptionalText(req.body?.name);
    const shortName = normalizeOptionalText(req.body?.short_name);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Unit name is required"
      });
    }

    const existingUnit = await query(
      `SELECT id
       FROM product_units
       WHERE id = ? AND business_id = ?
       LIMIT 1`,
      [id, req.user.business_id]
    );

    if (!existingUnit.length) {
      return res.status(404).json({
        success: false,
        message: "Unit type not found"
      });
    }

    const duplicateUnit = await query(
      `SELECT id
       FROM product_units
       WHERE business_id = ? AND name = ? AND id != ?
       LIMIT 1`,
      [req.user.business_id, name, id]
    );

    if (duplicateUnit.length) {
      return res.status(400).json({
        success: false,
        message: "Another unit type with this name already exists"
      });
    }

    await query(
      `UPDATE product_units
       SET name = ?, short_name = ?
       WHERE id = ? AND business_id = ?`,
      [name, shortName, id, req.user.business_id]
    );

    res.json({
      success: true,
      message: "Unit type updated successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// product units / delete unit
router.delete("/units/:id", requirePermission("inventory"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { id } = req.params;

    const existingUnit = await query(
      `SELECT id
       FROM product_units
       WHERE id = ? AND business_id = ?
       LIMIT 1`,
      [id, req.user.business_id]
    );

    if (!existingUnit.length) {
      return res.status(404).json({
        success: false,
        message: "Unit type not found"
      });
    }

    await query(
      `UPDATE products
       SET product_unit_id = NULL
       WHERE product_unit_id = ? AND business_id = ?`,
      [id, req.user.business_id]
    );

    await query(
      `DELETE FROM product_units
       WHERE id = ? AND business_id = ?`,
      [id, req.user.business_id]
    );

    res.json({
      success: true,
      message: "Unit type deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// products / get all active products
router.get("/", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const branchId = req.query.branch_id;
    const rows = await query(
      `
      SELECT 
        p.id,
        p.name,
        p.icon,
        p.category_id,
        p.product_unit_id,
        p.type,
        p.hourly_rate,
        p.price,
        p.cost,
        p.stock,
        p.low_stock,
        p.modifier_group_id,
        p.is_unlimited,
        p.is_active,
        p.has_unit_hierarchy,
        p.consumable_type,
        p.has_expiry,
        p.expiry_date,
        p.shelf_life_days,
        pu.name AS product_unit_name,
        pu.short_name AS product_unit_short_name,
        c.name AS category_name,
        c.type AS category_type
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_units pu ON pu.id = p.product_unit_id
      WHERE p.is_active = 1
        AND p.business_id = ?
        ${!isAdmin(req.user) ? "AND p.branch_id = ?" : branchId ? "AND p.branch_id = ?" : ""}
      ORDER BY p.id DESC
      `
    , !isAdmin(req.user) ? [req.user.business_id, req.user.branch_id] : branchId ? [req.user.business_id, branchId] : [req.user.business_id]);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// products / special product lists
router.get("/lists", requirePermission("pos"), branchAccessMiddleware, async (req, res) => {
  try {
    const branchId = req.query.branch_id;
    const scopedBranchSql = !isAdmin(req.user) ? "AND p.branch_id = ?" : branchId ? "AND p.branch_id = ?" : "";
    const scopedParams = !isAdmin(req.user) ? [req.user.business_id, req.user.branch_id] : branchId ? [req.user.business_id, branchId] : [req.user.business_id];
    const unlimitedProducts = await query(
      `
      SELECT 
        p.id,
        p.name,
        p.icon,
        p.category_id,
        p.product_unit_id,
        p.type,
        p.hourly_rate,
        p.price,
        p.cost,
        p.stock,
        p.low_stock,
        p.modifier_group_id,
        p.is_unlimited,
        p.is_active,
        p.has_unit_hierarchy,
        p.consumable_type,
        p.has_expiry,
        p.expiry_date,
        p.shelf_life_days,
        pu.name AS product_unit_name,
        pu.short_name AS product_unit_short_name,
        c.name AS category_name,
        c.type AS category_type
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_units pu ON pu.id = p.product_unit_id
      WHERE p.is_unlimited = 1
        AND p.business_id = ?
        ${scopedBranchSql}
      ORDER BY p.id DESC
      `
    , scopedParams);

    const timedProducts = await query(
      `
      SELECT 
        p.id,
        p.name,
        p.icon,
        p.category_id,
        p.product_unit_id,
        p.type,
        p.hourly_rate,
        p.price,
        p.cost,
        p.stock,
        p.low_stock,
        p.modifier_group_id,
        p.is_unlimited,
        p.is_active,
        p.has_unit_hierarchy,
        p.consumable_type,
        p.has_expiry,
        p.expiry_date,
        p.shelf_life_days,
        pu.name AS product_unit_name,
        pu.short_name AS product_unit_short_name,
        c.name AS category_name,
        c.type AS category_type
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_units pu ON pu.id = p.product_unit_id
      WHERE p.type = 'timed'
        AND p.business_id = ?
        ${scopedBranchSql}
      ORDER BY p.id DESC
      `
    , scopedParams);

    const expiryTrackedProducts = await query(
      `
      SELECT 
        p.id,
        p.name,
        p.icon,
        p.category_id,
        p.product_unit_id,
        p.type,
        p.hourly_rate,
        p.price,
        p.cost,
        p.stock,
        p.low_stock,
        p.modifier_group_id,
        p.is_unlimited,
        p.is_active,
        p.has_unit_hierarchy,
        p.consumable_type,
        p.has_expiry,
        p.expiry_date,
        p.shelf_life_days,
        pu.name AS product_unit_name,
        pu.short_name AS product_unit_short_name,
        c.name AS category_name,
        c.type AS category_type
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_units pu ON pu.id = p.product_unit_id
      WHERE p.has_expiry = 1
        AND p.business_id = ?
        ${scopedBranchSql}
      ORDER BY p.id DESC
      `
    , scopedParams);

    const disabledProducts = await query(
      `
      SELECT 
        p.id,
        p.name,
        p.icon,
        p.category_id,
        p.product_unit_id,
        p.type,
        p.hourly_rate,
        p.price,
        p.cost,
        p.stock,
        p.low_stock,
        p.modifier_group_id,
        p.is_unlimited,
        p.is_active,
        p.has_unit_hierarchy,
        p.consumable_type,
        p.has_expiry,
        p.expiry_date,
        p.shelf_life_days,
        pu.name AS product_unit_name,
        pu.short_name AS product_unit_short_name,
        c.name AS category_name,
        c.type AS category_type
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_units pu ON pu.id = p.product_unit_id
      WHERE p.is_active = 0
        AND p.business_id = ?
        ${scopedBranchSql}
      ORDER BY p.id DESC
      `
    , scopedParams);

    res.json({
      success: true,
      data: {
        unlimited: unlimitedProducts,
        timed: timedProducts,
        expiry_tracked: expiryTrackedProducts,
        disabled: disabledProducts
      },
      counts: {
        unlimited: unlimitedProducts.length,
        timed: timedProducts.length,
        expiry_tracked: expiryTrackedProducts.length,
        disabled: disabledProducts.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// products / get single product by id
router.get("/:id", requirePermission("inventory"), branchAccessMiddleware, async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { id } = req.params;

    const rows = await query(
      `
      SELECT 
        p.id,
        p.name,
        p.icon,
        p.category_id,
        p.product_unit_id,
        p.type,
        p.hourly_rate,
        p.price,
        p.cost,
        p.stock,
        p.low_stock,
        p.modifier_group_id,
        p.is_unlimited,
        p.is_active,
        p.has_unit_hierarchy,
        p.consumable_type,
        p.has_expiry,
        p.expiry_date,
        p.shelf_life_days,
        pu.name AS product_unit_name,
        pu.short_name AS product_unit_short_name,
        c.name AS category_name,
        c.type AS category_type
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_units pu ON pu.id = p.product_unit_id
      WHERE p.id = ? AND p.business_id = ?
      ${!isAdmin(req.user) ? "AND p.branch_id = ?" : req.query.branch_id ? "AND p.branch_id = ?" : ""}
      LIMIT 1
      `,
      !isAdmin(req.user)
        ? [id, req.user.business_id, req.user.branch_id]
        : req.query.branch_id
          ? [id, req.user.business_id, req.query.branch_id]
          : [id, req.user.business_id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// products / create product
router.post("/", requirePermission("inventory"), branchAccessMiddleware, async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const {
      name,
      icon = "📦",
      category_id = null,
      product_unit_id = null,
      type = "fixed",
      hourly_rate = 0,
      price = 0,
      cost = 0,
      stock = 0,
      low_stock = 5,
      modifier_group_id = null,
      is_unlimited = false,
      consumable_type = null,
      has_expiry = false,
      expiry_date = null,
      shelf_life_days = null
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required"
      });
    }

    if (!ALLOWED_PRODUCT_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product type"
      });
    }

    let categoryType = null;
    let finalProductUnitId = null;

    if (category_id) {
      const categoryRows = await query(
        `SELECT id, type FROM categories WHERE id = ? LIMIT 1`,
        [category_id]
      );

      if (!categoryRows.length) {
        return res.status(404).json({
          success: false,
          message: "Selected category not found"
        });
      }

      categoryType = categoryRows[0].type;
    }

    if (product_unit_id !== null && product_unit_id !== undefined && product_unit_id !== "") {
      const unitId = Number(product_unit_id);

      if (!Number.isInteger(unitId) || unitId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid product unit"
        });
      }

      const unitRows = await findScopedProductUnit(unitId, req.user.business_id);

      if (!unitRows.length) {
        return res.status(404).json({
          success: false,
          message: "Selected unit type not found"
        });
      }

      finalProductUnitId = unitId;
    }

    const unlimitedValue = is_unlimited ? 1 : 0;
    const expiryValue = has_expiry ? 1 : 0;

    const finalHourlyRate = type === "timed" ? normalizeNumber(hourly_rate) : 0;
    const finalPrice = type === "timed" ? 0 : normalizeNumber(price);
    const finalCost = normalizeNumber(cost);

    const finalStock = unlimitedValue ? null : normalizeNumber(stock);
    const finalLowStock = unlimitedValue ? 0 : normalizeNumber(low_stock, 5);

    let finalConsumableType = null;
    let finalExpiryDate = null;
    let finalShelfLifeDays = null;

    if (categoryType === "consumable") {
      finalConsumableType = consumable_type || "other";

      if (!ALLOWED_CONSUMABLE_TYPES.includes(finalConsumableType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid consumable type"
        });
      }

      if (expiryValue) {
        if (expiry_date && !isValidDate(expiry_date)) {
          return res.status(400).json({
            success: false,
            message: "Invalid expiry date"
          });
        }

        finalExpiryDate = expiry_date || null;
        finalShelfLifeDays = normalizeNullableNumber(shelf_life_days);

        if (!finalExpiryDate && !finalShelfLifeDays) {
          return res.status(400).json({
            success: false,
            message: "Consumable products with expiry enabled must have expiry_date or shelf_life_days"
          });
        }
      }
    } else {
      finalConsumableType = null;
    }

    await query(
      `
      INSERT INTO products
      (
        name,
        icon,
        category_id,
        product_unit_id,
        type,
        hourly_rate,
        price,
        cost,
        stock,
        low_stock,
        modifier_group_id,
        is_unlimited,
        consumable_type,
        has_expiry,
        expiry_date,
        shelf_life_days,
        business_id,
        branch_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        String(name).trim(),
        icon,
        category_id || null,
        finalProductUnitId,
        type,
        finalHourlyRate,
        finalPrice,
        finalCost,
        finalStock,
        finalLowStock,
        modifier_group_id || null,
        unlimitedValue,
        finalConsumableType,
        expiryValue,
        finalExpiryDate,
        finalShelfLifeDays,
        req.user.business_id,
        req.user.branch_id || null
      ]
    );

    res.status(201).json({
      success: true,
      message: "Product created successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// products/:id update product
router.put("/:id", requirePermission("inventory"), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;

    const {
      name,
      icon = "📦",
      category_id = null,
      product_unit_id = null,
      type = "fixed",
      hourly_rate = 0,
      price = 0,
      cost = 0,
      stock = 0,
      low_stock = 5,
      modifier_group_id = null,
      is_unlimited = false,
      consumable_type = null,
      has_expiry = false,
      expiry_date = null,
      shelf_life_days = null,
      reason
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required"
      });
    }

    if (!ensureBusinessContext(req, res)) return;

    const [existing] = await conn.execute(
      `SELECT id, stock, is_unlimited, has_unit_hierarchy
       FROM products
       WHERE id = ? AND business_id = ?
       LIMIT 1
       FOR UPDATE`,
      [id, req.user.business_id]
    );

    if (!existing.length) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    if (!ALLOWED_PRODUCT_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product type"
      });
    }

    let categoryType = null;
    let finalProductUnitId = null;

    if (category_id) {
      const [categoryRows] = await conn.execute(
        `SELECT id, type FROM categories WHERE id = ? LIMIT 1`,
        [category_id]
      );

      if (!categoryRows.length) {
        return res.status(404).json({
          success: false,
          message: "Selected category not found"
        });
      }

      categoryType = categoryRows[0].type;
    }

    if (product_unit_id !== null && product_unit_id !== undefined && product_unit_id !== "") {
      const unitId = Number(product_unit_id);

      if (!Number.isInteger(unitId) || unitId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid product unit"
        });
      }

      const unitRows = await findScopedProductUnit(unitId, req.user.business_id);

      if (!unitRows.length) {
        return res.status(404).json({
          success: false,
          message: "Selected unit type not found"
        });
      }

      finalProductUnitId = unitId;
    }

    const unlimitedValue = is_unlimited ? 1 : 0;
    const expiryValue = has_expiry ? 1 : 0;

    const finalHourlyRate = type === "timed" ? normalizeNumber(hourly_rate) : 0;
    const finalPrice = type === "timed" ? 0 : normalizeNumber(price);
    const finalCost = normalizeNumber(cost);

    const finalStock = unlimitedValue ? null : normalizeNumber(stock);
    const finalLowStock = unlimitedValue ? 0 : normalizeNumber(low_stock, 5);

    let finalConsumableType = null;
    let finalExpiryDate = null;
    let finalShelfLifeDays = null;

    if (categoryType === "consumable") {
      finalConsumableType = consumable_type || "other";

      if (!ALLOWED_CONSUMABLE_TYPES.includes(finalConsumableType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid consumable type"
        });
      }

      if (expiryValue) {
        if (expiry_date && !isValidDate(expiry_date)) {
          return res.status(400).json({
            success: false,
            message: "Invalid expiry date"
          });
        }

        finalExpiryDate = expiry_date || null;
        finalShelfLifeDays = normalizeNullableNumber(shelf_life_days);

        if (!finalExpiryDate && !finalShelfLifeDays) {
          return res.status(400).json({
            success: false,
            message: "Consumable products with expiry enabled must have expiry_date or shelf_life_days"
          });
        }
      }
    }

    const beforeQty = existing[0].stock === null ? null : Number(existing[0].stock);
    const afterQty = finalStock === null ? null : Number(finalStock);
    const usesHierarchy = Number(existing[0].has_unit_hierarchy) === 1;

    await conn.beginTransaction();

    await conn.execute(
      `
      UPDATE products SET
        name = ?,
        icon = ?,
        category_id = ?,
        product_unit_id = ?,
        type = ?,
        hourly_rate = ?,
        price = ?,
        cost = ?,
        stock = ?,
        low_stock = ?,
        modifier_group_id = ?,
        is_unlimited = ?,
        consumable_type = ?,
        has_expiry = ?,
        expiry_date = ?,
        shelf_life_days = ?
      WHERE id = ?
      `,
      [
        String(name).trim(),
        icon,
        category_id || null,
        finalProductUnitId,
        type,
        finalHourlyRate,
        finalPrice,
        finalCost,
        usesHierarchy ? beforeQty : finalStock,
        finalLowStock,
        modifier_group_id || null,
        unlimitedValue,
        finalConsumableType,
        expiryValue,
        finalExpiryDate,
        finalShelfLifeDays,
        id
      ]
    );

    if (usesHierarchy && !unlimitedValue && beforeQty !== afterQty && afterQty !== null) {
      const branchId = req.query.branch_id || req.user.branch_id || null;
      const delta = afterQty - (beforeQty ?? 0);
      const result =
        delta >= 0
          ? await restoreUnitInventory(conn, id, delta, branchId)
          : await deductUnitInventory(conn, id, Math.abs(delta), branchId);

      if (!result.success) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      for (const change of result.changes) {
        await recordUnitInventoryHistory(
          conn,
          Number(id),
          change.unit_level_id,
          change.before_qty,
          change.after_qty,
          reason || "Product stock updated from product edit",
          req.user.id,
          branchId
        );
      }
    }

    if (!unlimitedValue && beforeQty !== afterQty && afterQty !== null) {
      await conn.execute(
        `INSERT INTO stock_history (product_id, before_qty, after_qty, change_qty, reason, by_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          beforeQty ?? 0,
          afterQty,
          afterQty - (beforeQty ?? 0),
          reason || "Product stock updated from product edit",
          req.user.id
        ]
      );
    }

    await conn.commit();
    res.json({
      success: true,
      message: "Product updated successfully"
    });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    conn.release();
  }
});

// products/:id/disable
router.patch("/:id/disable", requirePermission("inventory"), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE products SET is_active = 0 WHERE id = ?`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.json({
      success: true,
      message: "Product disabled successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// products/:id/enable
router.patch("/:id/enable", requirePermission("inventory"), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE products SET is_active = 1 WHERE id = ?`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.json({
      success: true,
      message: "Product enabled successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// products/:id soft delete
router.delete("/:id", requirePermission("inventory"), async (req, res) => {
  try {
    const result = await query(
      `UPDATE products SET is_active = 0 WHERE id = ?`,
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// products/disabled/list / get all disabled products
router.get("/disabled/list", requirePermission("inventory"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const rows = await query(
      `
      SELECT 
        p.id,
        p.name,
        p.icon,
        p.category_id,
        p.product_unit_id,
        p.type,
        p.hourly_rate,
        p.price,
        p.cost,
        p.stock,
        p.low_stock,
        p.modifier_group_id,
        p.is_unlimited,
        p.is_active,
        p.consumable_type,
        p.has_expiry,
        p.expiry_date,
        p.shelf_life_days,
        pu.name AS product_unit_name,
        pu.short_name AS product_unit_short_name,
        c.name AS category_name,
        c.type AS category_type
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_units pu ON pu.id = p.product_unit_id
      WHERE p.is_active = 0
        AND p.business_id = ?
      ORDER BY p.id DESC
      `,
      [req.user.business_id]
    );

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ========================================================
// UNIT HIERARCHY ENDPOINTS
// ========================================================

// GET /products/unit-hierarchy/:productId
// Get the unit hierarchy for a specific product
router.get("/unit-hierarchy/:productId", requireAnyPermission("inventory", "pos"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { productId } = req.params;

    // Verify product exists and belongs to user's business
    const productRows = await query(
      `SELECT id, has_unit_hierarchy FROM products WHERE id = ? AND business_id = ? LIMIT 1`,
      [productId, req.user.business_id]
    );

    if (!productRows.length) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const levels = await loadHierarchy(pool, productId).catch(() => []);
    const branchId = req.query.branch_id || req.user.branch_id || null;
    let inventoryMap = new Map();
    let totalInSmallestUnits = 0;

    if (levels.length) {
      inventoryMap = await loadInventoryMap(pool, productId, branchId, false);
      totalInSmallestUnits = calculateTotalInSmallestUnits(levels, inventoryMap);
    }

    res.json({
      success: true,
      data: {
        product_id: productId,
        has_hierarchy: productRows[0].has_unit_hierarchy === 1,
        total_in_smallest_units: totalInSmallestUnits,
        unit_levels: levels.map((level) => {
          const multiplier = Number(level.smallest_unit_multiplier || 1);
          return {
            ...level,
            current_qty: Number(inventoryMap.get(Number(level.id))?.qty || 0),
            available_qty:
              multiplier > 0
                ? Math.floor(totalInSmallestUnits / multiplier)
                : 0
          };
        })
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /products/unit-hierarchy/:productId
// Create or update unit hierarchy for a product
// Body: { units: [ { unit_id, conversion_factor?, price }, ... ] }
router.post("/unit-hierarchy/:productId", requirePermission("inventory"), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { productId } = req.params;
    const { units } = req.body;
    const branchId = req.query.branch_id || req.user.branch_id || null;
    const preparedUnits = await buildHierarchyPayload(units, req.user.business_id);

    await conn.beginTransaction();

    const [productRows] = await conn.execute(
      `SELECT id, stock, has_unit_hierarchy
       FROM products
       WHERE id = ? AND business_id = ?
       LIMIT 1
       FOR UPDATE`,
      [productId, req.user.business_id]
    );

    if (!productRows.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const product = productRows[0];
    let carryForwardStock = Number(product.stock || 0);

    if (Number(product.has_unit_hierarchy) === 1) {
      const existingHierarchy = await loadHierarchy(conn, productId);
      const existingInventoryMap = await loadInventoryMap(conn, productId, branchId);
      carryForwardStock = calculateTotalInSmallestUnits(existingHierarchy, existingInventoryMap);
    }

    await conn.execute(`DELETE FROM product_unit_levels WHERE product_id = ?`, [productId]);
    let previousLevelId = null;
    let smallestLevelId = null;

    for (const unit of preparedUnits) {
      const [result] = await conn.execute(
        `INSERT INTO product_unit_levels
         (product_id, unit_id, level, parent_level_id, conversion_factor, price, is_smallest_unit)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          productId,
          unit.unit_id,
          unit.level,
          previousLevelId,
          unit.conversion_factor,
          unit.price,
          unit.is_smallest_unit
        ]
      );

      previousLevelId = result.insertId;
      if (unit.is_smallest_unit) {
        smallestLevelId = result.insertId;
      }
    }

    if (smallestLevelId && carryForwardStock > 0) {
      await conn.execute(
        `INSERT INTO unit_inventory (product_id, unit_level_id, qty, branch_id)
         VALUES (?, ?, ?, ?)`,
        [productId, smallestLevelId, carryForwardStock, branchId]
      );
    }

    await conn.execute(
      `UPDATE products
       SET has_unit_hierarchy = 1, stock = ?
       WHERE id = ?`,
      [carryForwardStock, productId]
    );

    await conn.commit();

    res.json({
      success: true,
      message: "Unit hierarchy created successfully",
      data: { product_id: Number(productId), units: preparedUnits, stock: carryForwardStock }
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

// GET /products/unit-hierarchy/:productId/inventory
// Get inventory for each unit level of a product
router.get("/unit-hierarchy/:productId/inventory", requirePermission("inventory"), async (req, res) => {
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { productId } = req.params;
    const branchId = req.query.branch_id || req.user.branch_id;

    // Verify product exists
    const productRows = await query(
      `SELECT id, has_unit_hierarchy FROM products WHERE id = ? AND business_id = ? LIMIT 1`,
      [productId, req.user.business_id]
    );

    if (!productRows.length) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Get inventory for each unit level
    const hierarchy = await loadHierarchy(pool, productId);
    const inventoryMap = await loadInventoryMap(pool, productId, branchId, false);

    const inventory = hierarchy.map((level) => ({
      product_id: Number(productId),
      unit_level_id: Number(level.id),
      qty: Number(inventoryMap.get(Number(level.id))?.qty || 0),
      branch_id: branchId,
      level: Number(level.level),
      conversion_factor: Number(level.conversion_factor),
      smallest_unit_multiplier: Number(level.smallest_unit_multiplier || 1),
      is_smallest_unit: Number(level.is_smallest_unit || 0),
      unit_name: null,
      unit_short_name: null
    }));

    const names = await query(
      `SELECT pul.id, pu.name AS unit_name, pu.short_name AS unit_short_name
       FROM product_unit_levels pul
       JOIN product_units pu ON pu.id = pul.unit_id
       WHERE pul.product_id = ?`,
      [productId]
    );
    const nameMap = new Map(names.map((row) => [Number(row.id), row]));
    inventory.forEach((item) => {
      const meta = nameMap.get(Number(item.unit_level_id));
      item.unit_name = meta?.unit_name || null;
      item.unit_short_name = meta?.unit_short_name || null;
    });

    res.json({
      success: true,
      data: inventory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /products/unit-hierarchy/:productId/inventory/adjust
// Adjust inventory for a specific unit level
// Body: { unit_level_id, qty_change, reason }
router.post("/unit-hierarchy/:productId/inventory/adjust", requirePermission("inventory"), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    if (!ensureBusinessContext(req, res)) return;
    const { productId } = req.params;
    const { unit_level_id, qty_change, reason } = req.body;
    const branchId = req.query.branch_id || req.user.branch_id;

    const changeQty = Number(qty_change);
    if (!Number.isInteger(changeQty) || changeQty === 0) {
      return res.status(400).json({
        success: false,
        message: "qty_change must be a non-zero whole number"
      });
    }

    await conn.beginTransaction();

    // Verify product exists
    const productRows = await conn.execute(
      `SELECT id, has_unit_hierarchy FROM products WHERE id = ? AND business_id = ? LIMIT 1`,
      [productId, req.user.business_id]
    );

    if (!productRows[0].length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const [levelRows] = await conn.execute(
      `SELECT id FROM product_unit_levels WHERE id = ? AND product_id = ? LIMIT 1`,
      [unit_level_id, productId]
    );

    if (!levelRows.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        message: "Unit level not found for this product"
      });
    }

    const inventoryMap = await loadInventoryMap(conn, productId, branchId);
    const existing = inventoryMap.get(Number(unit_level_id));
    const beforeQty = Number(existing?.qty || 0);
    const afterQty = beforeQty + changeQty;

    if (afterQty < 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: "Insufficient unit inventory for this adjustment"
      });
    }

    if (existing?.id) {
      await conn.execute(
        `UPDATE unit_inventory SET qty = ? WHERE id = ?`,
        [afterQty, existing.id]
      );
    } else {
      await conn.execute(
        `INSERT INTO unit_inventory (product_id, unit_level_id, qty, branch_id)
         VALUES (?, ?, ?, ?)`,
        [productId, unit_level_id, afterQty, branchId]
      );
    }

    await syncProductStock(conn, productId, branchId);
    await recordUnitInventoryHistory(
      conn,
      productId,
      Number(unit_level_id),
      beforeQty,
      afterQty,
      reason || "Manual adjustment",
      req.user.id,
      branchId
    );

    await conn.commit();

    res.json({
      success: true,
      message: "Inventory adjusted successfully",
      data: {
        product_id: Number(productId),
        unit_level_id,
        before_qty: beforeQty,
        after_qty: afterQty,
        change_qty: changeQty
      }
    });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    conn.release();
  }
});

module.exports = router;
