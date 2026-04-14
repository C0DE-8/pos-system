import API from "./api";

export const getBusinesses = async () => {
  const { data } = await API.get("/businesses");
  return data;
};

export const getBusinessById = async (id) => {
  const { data } = await API.get(`/businesses/${id}`);
  return data;
};

export const createBusiness = async (payload) => {
  const { data } = await API.post("/businesses", payload, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
};

export const updateBusiness = async (id, payload) => {
  const { data } = await API.put(`/businesses/${id}`, payload, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
};

export const updateBusinessStatus = async (id, is_active) => {
  const { data } = await API.patch(`/businesses/${id}/status`, { is_active });
  return data;
};

export const getBusinessBranches = async (businessId) => {
  const { data } = await API.get(`/businesses/${businessId}/branches`);
  return data;
};

export const getBusinessBranchById = async (businessId, branchId) => {
  const { data } = await API.get(`/businesses/${businessId}/branches/${branchId}`);
  return data;
};

export const createBusinessBranch = async (businessId, payload) => {
  const { data } = await API.post(`/businesses/${businessId}/branches`, payload, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
};

export const updateBusinessBranch = async (businessId, branchId, payload) => {
  const { data } = await API.put(`/businesses/${businessId}/branches/${branchId}`, payload, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
};

export const updateBusinessBranchStatus = async (businessId, branchId, is_active) => {
  const { data } = await API.patch(`/businesses/${businessId}/branches/${branchId}/status`, { is_active });
  return data;
};

export const assignUserToBusinessBranch = async (businessId, branchId, userId) => {
  const { data } = await API.patch(`/businesses/${businessId}/branches/${branchId}/users/${userId}`);
  return data;
};
