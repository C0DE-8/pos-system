import API from "./api";

export const getSettings = async () => {
  const { data } = await API.get("/settings");
  return data;
};

export const updateSettings = async (payload) => {
  const { data } = await API.put("/settings", payload);
  return data;
};

export const getExpiryAlerts = async () => {
  const { data } = await API.get("/settings/expiry-alerts");
  return data;
};

export const getSettingsProducts = async () => {
  const { data } = await API.get("/settings/products");
  return data;
};