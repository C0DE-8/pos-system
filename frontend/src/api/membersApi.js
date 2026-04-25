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

export const createMembershipTier = async (payload) => {
  const { data } = await API.post("/members/tiers", payload);
  return data;
};

export const updateMembershipTier = async (id, payload) => {
  const { data } = await API.put(`/members/tiers/${id}`, payload);
  return data;
};

// create member
export const createMember = async (payload) => {
  const { data } = await API.post("/members", payload);
  return data;
};

// get member history
export const getMemberHistory = async (id) => {
  const { data } = await API.get(`/members/${id}/history`);
  return data;
};
