// src/api/inventoryApi.js
import API from "./api";

// =========================
// INVENTORY
// =========================
export const getLowStockProducts = async () => {
  const { data } = await API.get("/inventory/low-stock");
  return data;
};

export const restockProduct = async (productId, payload) => {
  const { data } = await API.post(`/inventory/restock/${productId}`, payload);
  return data;
};

export const adjustProductStock = async (productId, payload) => {
  const { data } = await API.post(`/inventory/adjust/${productId}`, payload);
  return data;
};

export const getStockHistory = async () => {
  const { data } = await API.get("/inventory/history");
  return data;
};

// =========================
// WAREHOUSE
// =========================
export const getWarehouseProducts = async () => {
  const { data } = await API.get("/inventory/warehouse");
  return data;
};

export const getWarehouseProductById = async (productId) => {
  const { data } = await API.get(`/inventory/warehouse/${productId}`);
  return data;
};

export const addWarehouseStock = async (productId, payload) => {
  const { data } = await API.post(`/inventory/warehouse/add/${productId}`, payload);
  return data;
};

export const removeWarehouseStock = async (productId, payload) => {
  const { data } = await API.post(`/inventory/warehouse/remove/${productId}`, payload);
  return data;
};

export const transferWarehouseToStore = async (productId, payload) => {
  const { data } = await API.post(
    `/inventory/warehouse/transfer-to-store/${productId}`,
    payload
  );
  return data;
};

export const transferStoreToWarehouse = async (productId, payload) => {
  const { data } = await API.post(
    `/inventory/warehouse/transfer-from-store/${productId}`,
    payload
  );
  return data;
};

export const getWarehouseHistory = async () => {
  const { data } = await API.get("/inventory/warehouse/history");
  return data;
};