import API from "./api";

// get all members
export const getMembers = async () => {
  const { data } = await API.get("/members");
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