import API from "./api";

// get all members
export const getMembers = async () => {
  const { data } = await API.get("/members");
  return data;
};

export const getMembershipTiers = async () => {
  const { data } = await API.get("/members/tiers");
  return data;
};

export const getMembershipDiscountCategories = async () => {
  const { data } = await API.get("/members/tiers/discount-categories");
  return data;
};

export const createMembershipTier = async (payload) => {
  const { data } = await API.post("/members/tiers", payload);
  return data;
};

export const updateMembershipTier = async (id, payload) => {
  const { data } = await API.put(`/members/tiers/${id}`, payload);
  return data;
};

export const updateMembershipTierCategoryDiscounts = async (id, payload) => {
  const { data } = await API.put(`/members/tiers/${id}/category-discounts`, payload);
  return data;
};

export const getWalletTransactions = async (params = {}) => {
  const { data } = await API.get("/members/wallet/transactions", { params });
  return data;
};

export const createWalletTransaction = async (payload) => {
  const { data } = await API.post("/members/wallet/transactions", payload);
  return data;
};

export const getPointsLedger = async (params = {}) => {
  const { data } = await API.get("/members/points/ledger", { params });
  return data;
};

export const createPointsLedgerEntry = async (payload) => {
  const { data } = await API.post("/members/points/ledger", payload);
  return data;
};

export const getWalletBalanceByToken = async (token) => {
  const { data } = await API.get(`/members/wallet/balance/${encodeURIComponent(token)}`);
  return data;
};

// create member
export const createMember = async (payload) => {
  const { data } = await API.post("/members", payload);
  return data;
};

export const updateMember = async (id, payload) => {
  const { data } = await API.put(`/members/${id}`, payload);
  return data;
};

export const deleteMember = async (id) => {
  const { data } = await API.delete(`/members/${id}`);
  return data;
};

// get member history
export const getMemberHistory = async (id) => {
  const { data } = await API.get(`/members/${id}/history`);
  return data;
};
