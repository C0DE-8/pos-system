// src/api/reportsApi.js
import API from "./api";

export const getDashboardReport = async (params = {}) => {
  const { data } = await API.get("/reports/dashboard", { params });
  return data;
};

export const getSalesTrendsReport = async (params = {}) => {
  const { data } = await API.get("/reports/sales-trends", { params });
  return data;
};

export const getProductsReport = async (params = {}) => {
  const { data } = await API.get("/reports/products", { params });
  return data;
};

export const getCashiersReport = async (params = {}) => {
  const { data } = await API.get("/reports/cashiers", { params });
  return data;
};

export const getInventoryReport = async (params = {}) => {
  const { data } = await API.get("/reports/inventory", { params });
  return data;
};

export const getCustomerOrdersReport = async (params = {}) => {
  const { data } = await API.get("/reports/customer-orders", { params });
  return data;
};

export const getBranchesReport = async (params = {}) => {
  const { data } = await API.get("/reports/branches", { params });
  return data;
};
