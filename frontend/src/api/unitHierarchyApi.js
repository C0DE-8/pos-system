import API from "./api";

// Get unit hierarchy for a specific product
export const getProductUnitHierarchy = async (productId) => {
  const { data } = await API.get(`/products/unit-hierarchy/${productId}`);
  return data;
};

// Create or update unit hierarchy for a product
export const createProductUnitHierarchy = async (productId, units) => {
  const { data } = await API.post(`/products/unit-hierarchy/${productId}`, {
    units
  });
  return data;
};

// Get inventory breakdown by unit levels for a product
export const getUnitInventoryBreakdown = async (productId) => {
  const { data } = await API.get(`/products/unit-hierarchy/${productId}/inventory`);
  return data;
};

// Adjust inventory for a specific unit level
export const adjustUnitInventory = async (productId, unitLevelId, qtyChange, reason) => {
  const { data } = await API.post(
    `/products/unit-hierarchy/${productId}/inventory/adjust`,
    {
      unit_level_id: unitLevelId,
      qty_change: qtyChange,
      reason
    }
  );
  return data;
};

// Get inventory breakdown from inventory routes
export const getUnitHierarchyInventoryBreakdown = async (productId) => {
  const { data } = await API.get(`/inventory/unit-hierarchy/${productId}/breakdown`);
  return data;
};

// Sync traditional stock with unit hierarchy
export const syncUnitHierarchyInventory = async (productId, action = "sync-to-smallest") => {
  const { data } = await API.post(`/inventory/unit-hierarchy/${productId}/sync`, {
    action
  });
  return data;
};
