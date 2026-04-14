const express = require("express");
const { query } = require("../config/db");
const { authenticateToken, requirePermission } = require("../middleware/auth");

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

// categories / get all categories
router.get("/categories", requirePermission("inventory"), async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, name, type, created_at
       FROM categories
       ORDER BY name ASC`
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// categories / create category
router.post("/categories", requirePermission("inventory"), async (req, res) => {
  try {
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
      `SELECT id FROM categories WHERE name = ? LIMIT 1`,
      [String(name).trim()]
    );

    if (existingCategory.length) {
      return res.status(400).json({
        success: false,
        message: "Category already exists"
      });
    }

    await query(
      `INSERT INTO categories (name, type) VALUES (?, ?)`,
      [String(name).trim(), type]
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

// products / get all active products
router.get("/", requirePermission("pos"), async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT 
        p.id,
        p.name,
        p.icon,
        p.category_id,
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
        c.name AS category_name,
        c.type AS category_type
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1
      ORDER BY p.id DESC
      `
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

// products / special product lists
router.get("/lists", requirePermission("pos"), async (req, res) => {
  try {
    const unlimitedProducts = await query(
      `
      SELECT 
        p.id,
        p.name,
        p.icon,
        p.category_id,
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
        c.name AS category_name,
        c.type AS category_type
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_unlimited = 1
      ORDER BY p.id DESC
      `
    );

    const timedProducts = await query(
      `
      SELECT 
        p.id,
        p.name,
        p.icon,
        p.category_id,
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
        c.name AS category_name,
        c.type AS category_type
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.type = 'timed'
      ORDER BY p.id DESC
      `
    );

    const expiryTrackedProducts = await query(
      `
      SELECT 
        p.id,
        p.name,
        p.icon,
        p.category_id,
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
        c.name AS category_name,
        c.type AS category_type
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.has_expiry = 1
      ORDER BY p.id DESC
      `
    );

    const disabledProducts = await query(
      `
      SELECT 
        p.id,
        p.name,
        p.icon,
        p.category_id,
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
        c.name AS category_name,
        c.type AS category_type
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 0
      ORDER BY p.id DESC
      `
    );

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
router.get("/:id", requirePermission("inventory"), async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `
      SELECT 
        p.id,
        p.name,
        p.icon,
        p.category_id,
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
        c.name AS category_name,
        c.type AS category_type
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
      LIMIT 1
      `,
      [id]
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
router.post("/", requirePermission("inventory"), async (req, res) => {
  try {
    const {
      name,
      icon = "📦",
      category_id = null,
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
        shelf_life_days
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        String(name).trim(),
        icon,
        category_id || null,
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
        finalShelfLifeDays
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
  try {
    const { id } = req.params;

    const {
      name,
      icon = "📦",
      category_id = null,
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

    const existing = await query(
      `SELECT id, stock, is_unlimited FROM products WHERE id = ? LIMIT 1`,
      [id]
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

    await query(
      `
      UPDATE products SET
        name = ?,
        icon = ?,
        category_id = ?,
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
        id
      ]
    );

    // save stock update into stock_history if stock changed
    if (!unlimitedValue && beforeQty !== afterQty && afterQty !== null) {
      await query(
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

    res.json({
      success: true,
      message: "Product updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
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
    const rows = await query(
      `
      SELECT 
        p.id,
        p.name,
        p.icon,
        p.category_id,
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
        c.name AS category_name,
        c.type AS category_type
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 0
      ORDER BY p.id DESC
      `
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

module.exports = router;