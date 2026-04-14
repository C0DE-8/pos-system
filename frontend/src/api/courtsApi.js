import API from "./api";

// get all courts
export const getCourts = async () => {
  const { data } = await API.get("/courts");
  return data;
};

// get single court
export const getCourtById = async (id) => {
  const { data } = await API.get(`/courts/${id}`);
  return data;
};

// create court
export const createCourt = async (payload) => {
  const { data } = await API.post("/courts", payload);
  return data;
};

// start court session
export const startCourtSession = async (id, payload) => {
  const { data } = await API.post(`/courts/${id}/start`, payload);
  return data;
};

// extend court session
export const extendCourtSession = async (id, payload) => {
  const { data } = await API.post(`/courts/${id}/extend`, payload);
  return data;
};

// end court session
export const endCourtSession = async (id) => {
  const { data } = await API.post(`/courts/${id}/end`);
  return data;
};

// delete court
export const deleteCourt = async (id) => {
  const { data } = await API.delete(`/courts/${id}`);
  return data;
};