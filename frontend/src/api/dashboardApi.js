// src/api/dashboardApi.js
import API from "./api";

export const getDashboardData = async () => {
  const { data } = await API.get("/admin/dashboard");
  return data;
};

export const logoutUser = async () => {
  const { data } = await API.post("/auth/logout");
  return data;
};