// src/api/posApi.js
import API from "./api";

export const checkoutSale = async (payload) => {
  const { data } = await API.post("/pos/checkout", payload);
  return data;
};

export const splitItemPrice = async (payload) => {
  const { data } = await API.post("/pos/split-price", payload);
  return data;
};

export const getSalesSummary = async (params = {}) => {
  const { data } = await API.get("/pos/sales-summary", { params });
  return data;
};

export const createPendingCart = async (payload) => {
  const { data } = await API.post("/pos/pending", payload);
  return data;
};

export const getPendingCarts = async () => {
  const { data } = await API.get("/pos/pending");
  return data;
};

export const getPendingCartById = async (id) => {
  const { data } = await API.get(`/pos/pending/${id}`);
  return data;
};

export const updatePendingCart = async (id, payload) => {
  const { data } = await API.put(`/pos/pending/${id}`, payload);
  return data;
};

export const cancelPendingCart = async (id) => {
  const { data } = await API.delete(`/pos/pending/${id}`);
  return data;
};

export const checkoutPendingCart = async (id, payload) => {
  const { data } = await API.post(`/pos/pending/${id}/checkout`, payload);
  return data;
};
