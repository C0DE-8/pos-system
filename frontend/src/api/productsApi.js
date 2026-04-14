import API from "./api";

// products
export const getProducts = async () => {
  const { data } = await API.get("/products");
  return data;
};

export const getProductSpecialLists = async () => {
  const { data } = await API.get("/products/lists");
  return data;
};

export const getProductById = async (id) => {
  const { data } = await API.get(`/products/${id}`);
  return data;
};

export const createProduct = async (payload) => {
  const { data } = await API.post("/products", payload);
  return data;
};

export const updateProduct = async (id, payload) => {
  const { data } = await API.put(`/products/${id}`, payload);
  return data;
};

export const disableProduct = async (id) => {
  const { data } = await API.patch(`/products/${id}/disable`);
  return data;
};

export const enableProduct = async (id) => {
  const { data } = await API.patch(`/products/${id}/enable`);
  return data;
};

export const deleteProduct = async (id) => {
  const { data } = await API.delete(`/products/${id}`);
  return data;
};

export const getDisabledProducts = async () => {
  const { data } = await API.get("/products/disabled/list");
  return data;
};

// categories
export const getCategories = async () => {
  const { data } = await API.get("/products/categories");
  return data;
};

export const createCategory = async (payload) => {
  const { data } = await API.post("/products/categories", payload);
  return data;
};

export const updateCategory = async (id, payload) => {
  const { data } = await API.put(`/products/categories/${id}`, payload);
  return data;
};

export const deleteCategory = async (id) => {
  const { data } = await API.delete(`/products/categories/${id}`);
  return data;
};