import API from "./api";

// get all users
export const getUsers = async () => {
  const { data } = await API.get("/admin/users");
  return data;
};

export const updateUserPermissions = async (id, permissions) => {
  const { data } = await API.put(`/admin/users/${id}/permissions`, permissions);
  return data;
};

// get user by id
export const getUserById = async (id) => {
  const { data } = await API.get(`/admin/users/${id}`);
  return data;
};

// clock in / out
export const toggleUserClock = async (id) => {
  const { data } = await API.get(`/admin/users/${id}/clock`);
  return data;
};

// get clock history
export const getUserClockHistory = async (id) => {
  const { data } = await API.get(`/admin/users/${id}/clock-history`);
  return data;
};

// create user
export const createUser = async (payload) => {
  const { data } = await API.post("/admin/users", payload);
  return data;
};

// disable user
export const disableUser = async (id) => {
  const { data } = await API.patch(`/admin/users/${id}/disable`);
  return data;
};

// enable user
export const enableUser = async (id) => {
  const { data } = await API.patch(`/admin/users/${id}/enable`);
  return data;
};

// delete user
export const deleteUser = async (id) => {
  const { data } = await API.delete(`/admin/users/${id}`);
  return data;
};