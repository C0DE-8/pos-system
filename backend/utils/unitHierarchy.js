/**
 * Unit hierarchy helpers.
 *
 * The hierarchy is modeled as a linear chain per product:
 * level 1 -> level 2 -> ... -> smallest level
 *
 * `conversion_factor` on a child level means:
 *   1 parent unit contains N child units.
 *
 * Examples:
 * - Carton -> Piece: piece conversion_factor = 24
 * - Carton -> Pack -> Piece: pack = 10, piece = 5
 */

async function loadHierarchy(conn, productId) {
  const [rows] = await conn.execute(
    `SELECT
       pul.id,
       pul.product_id,
       pul.unit_id,
       pul.level,
       pul.parent_level_id,
       pul.conversion_factor,
       pul.is_smallest_unit
     FROM product_unit_levels pul
     WHERE pul.product_id = ?
     ORDER BY pul.level ASC`,
    [productId]
  );

  if (!rows.length) {
    const error = new Error("No unit hierarchy found for product");
    error.statusCode = 400;
    throw error;
  }

  const hierarchy = rows.map((row) => ({
    ...row,
    level: Number(row.level),
    conversion_factor: Number(row.conversion_factor || 1),
    is_smallest_unit: Number(row.is_smallest_unit || 0)
  }));

  for (let index = 0; index < hierarchy.length; index += 1) {
    const current = hierarchy[index];

    if (index === 0) {
      current.parent_level_id = null;
      continue;
    }

    const parent = hierarchy[index - 1];

    if (Number(current.conversion_factor) <= 1) {
      const error = new Error(
        `Invalid conversion factor for level ${current.level}. Child levels must be greater than 1.`
      );
      error.statusCode = 400;
      throw error;
    }

    if (Number(current.parent_level_id || 0) !== Number(parent.id)) {
      const error = new Error("Unit hierarchy must be a single ordered chain");
      error.statusCode = 400;
      throw error;
    }
  }

  const smallestIndex = hierarchy.length - 1;
  const smallest = hierarchy[smallestIndex];
  if (Number(smallest.is_smallest_unit) !== 1) {
    const error = new Error("The last unit level must be marked as the smallest unit");
    error.statusCode = 400;
    throw error;
  }

  for (let index = 0; index < hierarchy.length; index += 1) {
    let multiplier = 1;

    for (let childIndex = smallestIndex; childIndex > index; childIndex -= 1) {
      multiplier *= Number(hierarchy[childIndex].conversion_factor);
    }

    hierarchy[index].smallest_unit_multiplier = multiplier;
  }

  return hierarchy;
}

async function loadInventoryMap(conn, productId, branchId, lockRows = true) {
  const lockClause = lockRows ? " FOR UPDATE" : "";
  const [rows] = await conn.execute(
    `SELECT id, product_id, unit_level_id, qty, branch_id
     FROM unit_inventory
     WHERE product_id = ? AND branch_id <=> ?${lockClause}`,
    [productId, branchId]
  );

  const inventoryMap = new Map();
  for (const row of rows) {
    inventoryMap.set(Number(row.unit_level_id), {
      id: row.id,
      qty: Number(row.qty || 0)
    });
  }

  return inventoryMap;
}

function ensureInventoryEntry(inventoryMap, unitLevelId) {
  if (!inventoryMap.has(unitLevelId)) {
    inventoryMap.set(unitLevelId, {
      id: null,
      qty: 0
    });
  }

  return inventoryMap.get(unitLevelId);
}

function createChangeTracker() {
  return new Map();
}

function trackChange(changeMap, unitLevelId, beforeQty, afterQty) {
  const existing = changeMap.get(unitLevelId);

  if (!existing) {
    changeMap.set(unitLevelId, {
      unit_level_id: unitLevelId,
      before_qty: beforeQty,
      after_qty: afterQty
    });
    return;
  }

  existing.after_qty = afterQty;
}

function applyQuantityDelta(inventoryMap, changeMap, unitLevelId, delta) {
  if (!delta) return;

  const entry = ensureInventoryEntry(inventoryMap, unitLevelId);
  const beforeQty = Number(entry.qty || 0);
  const afterQty = beforeQty + Number(delta);

  if (afterQty < 0) {
    const error = new Error("Cannot reduce unit inventory below zero");
    error.statusCode = 400;
    throw error;
  }

  entry.qty = afterQty;
  trackChange(changeMap, unitLevelId, beforeQty, afterQty);
}

async function persistInventoryMap(conn, productId, branchId, inventoryMap) {
  for (const [unitLevelId, entry] of inventoryMap.entries()) {
    if (entry.id) {
      await conn.execute(
        `UPDATE unit_inventory
         SET qty = ?
         WHERE id = ?`,
        [entry.qty, entry.id]
      );
      continue;
    }

    const [result] = await conn.execute(
      `INSERT INTO unit_inventory (product_id, unit_level_id, qty, branch_id)
       VALUES (?, ?, ?, ?)`,
      [productId, unitLevelId, entry.qty, branchId]
    );

    entry.id = result.insertId;
  }
}

function calculateTotalInSmallestUnits(hierarchy, inventoryMap) {
  return hierarchy.reduce((total, level) => {
    const qty = Number(inventoryMap.get(Number(level.id))?.qty || 0);
    return total + qty * Number(level.smallest_unit_multiplier || 1);
  }, 0);
}

async function syncProductStock(conn, productId, branchId) {
  const hierarchy = await loadHierarchy(conn, productId);
  const inventoryMap = await loadInventoryMap(conn, productId, branchId, false);
  const total = calculateTotalInSmallestUnits(hierarchy, inventoryMap);

  await conn.execute(
    `UPDATE products
     SET stock = ?
     WHERE id = ?`,
    [total, productId]
  );

  return total;
}

function formatTrackedChanges(changeMap) {
  return Array.from(changeMap.values())
    .map((change) => ({
      ...change,
      change_qty: Number(change.after_qty) - Number(change.before_qty)
    }))
    .filter((change) => change.change_qty !== 0);
}

function breakParentUnit(hierarchy, inventoryMap, changeMap) {
  for (let index = hierarchy.length - 2; index >= 0; index -= 1) {
    const parent = hierarchy[index];
    const parentEntry = ensureInventoryEntry(inventoryMap, Number(parent.id));

    if (parentEntry.qty <= 0) continue;

    for (let currentIndex = index; currentIndex < hierarchy.length - 1; currentIndex += 1) {
      const current = hierarchy[currentIndex];
      const child = hierarchy[currentIndex + 1];

      applyQuantityDelta(inventoryMap, changeMap, Number(current.id), -1);
      applyQuantityDelta(
        inventoryMap,
        changeMap,
        Number(child.id),
        Number(child.conversion_factor)
      );
    }

    return true;
  }

  return false;
}

async function deductUnitInventory(conn, productId, qtyToDeduct, branchId = null) {
  const requestedQty = Number(qtyToDeduct);

  if (!Number.isInteger(requestedQty) || requestedQty <= 0) {
    return {
      success: false,
      message: "Quantity must be a positive whole number",
      changes: []
    };
  }

  try {
    const hierarchy = await loadHierarchy(conn, productId);
    const inventoryMap = await loadInventoryMap(conn, productId, branchId, true);
    const totalAvailable = calculateTotalInSmallestUnits(hierarchy, inventoryMap);

    if (totalAvailable < requestedQty) {
      return {
        success: false,
        message: `Insufficient inventory. Available ${totalAvailable}, requested ${requestedQty}`,
        changes: []
      };
    }

    const smallestLevel = hierarchy[hierarchy.length - 1];
    const smallestLevelId = Number(smallestLevel.id);
    const changeMap = createChangeTracker();
    let remaining = requestedQty;

    while (remaining > 0) {
      const smallestEntry = ensureInventoryEntry(inventoryMap, smallestLevelId);

      if (smallestEntry.qty > 0) {
        const directTake = Math.min(smallestEntry.qty, remaining);
        applyQuantityDelta(inventoryMap, changeMap, smallestLevelId, -directTake);
        remaining -= directTake;
        continue;
      }

      const brokeParent = breakParentUnit(hierarchy, inventoryMap, changeMap);
      if (!brokeParent) {
        return {
          success: false,
          message: "Unable to roll inventory down from parent units",
          changes: []
        };
      }
    }

    await persistInventoryMap(conn, productId, branchId, inventoryMap);
    const totalAfter = await syncProductStock(conn, productId, branchId);

    return {
      success: true,
      message: "Inventory deducted successfully",
      total_after: totalAfter,
      changes: formatTrackedChanges(changeMap)
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      changes: []
    };
  }
}

async function restoreUnitInventory(conn, productId, qtyToRestore, branchId = null) {
  const requestedQty = Number(qtyToRestore);

  if (!Number.isInteger(requestedQty) || requestedQty <= 0) {
    return {
      success: false,
      message: "Quantity must be a positive whole number",
      changes: []
    };
  }

  try {
    const hierarchy = await loadHierarchy(conn, productId);
    const inventoryMap = await loadInventoryMap(conn, productId, branchId, true);
    const smallestLevel = hierarchy[hierarchy.length - 1];
    const smallestLevelId = Number(smallestLevel.id);
    const changeMap = createChangeTracker();

    applyQuantityDelta(inventoryMap, changeMap, smallestLevelId, requestedQty);

    for (let index = hierarchy.length - 1; index > 0; index -= 1) {
      const child = hierarchy[index];
      const parent = hierarchy[index - 1];
      const childEntry = ensureInventoryEntry(inventoryMap, Number(child.id));
      const factor = Number(child.conversion_factor);

      if (factor <= 1) continue;

      const carry = Math.floor(childEntry.qty / factor);
      if (carry <= 0) continue;

      applyQuantityDelta(inventoryMap, changeMap, Number(child.id), -(carry * factor));
      applyQuantityDelta(inventoryMap, changeMap, Number(parent.id), carry);
    }

    await persistInventoryMap(conn, productId, branchId, inventoryMap);
    const totalAfter = await syncProductStock(conn, productId, branchId);

    return {
      success: true,
      message: "Inventory restored successfully",
      total_after: totalAfter,
      changes: formatTrackedChanges(changeMap)
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      changes: []
    };
  }
}

async function getTotalInventoryInSmallestUnits(conn, productId, branchId = null) {
  try {
    const hierarchy = await loadHierarchy(conn, productId);
    const inventoryMap = await loadInventoryMap(conn, productId, branchId, false);
    return calculateTotalInSmallestUnits(hierarchy, inventoryMap);
  } catch (error) {
    return 0;
  }
}

async function recordUnitInventoryHistory(
  conn,
  productId,
  unitLevelId,
  beforeQty,
  afterQty,
  reason,
  userId,
  branchId
) {
  try {
    await conn.execute(
      `INSERT INTO unit_inventory_history
       (product_id, unit_level_id, before_qty, after_qty, change_qty, reason, by_user_id, branch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        unitLevelId,
        beforeQty,
        afterQty,
        Number(afterQty) - Number(beforeQty),
        reason,
        userId,
        branchId
      ]
    );
  } catch (error) {
    console.error("Error recording unit inventory history:", error);
  }
}

module.exports = {
  deductUnitInventory,
  restoreUnitInventory,
  getTotalInventoryInSmallestUnits,
  loadHierarchy,
  loadInventoryMap,
  calculateTotalInSmallestUnits,
  recordUnitInventoryHistory,
  syncProductStock
};
