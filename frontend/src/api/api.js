// src/api/api.js
import axios from "axios";

// https://api.pos.adsoforion.com/ https://api.pray-pos.copupbid.com/api
const API = axios.create({
  baseURL: "https://api.pos.adsoforion.com/api"
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default API;