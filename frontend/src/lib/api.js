//frontend/src/lib/api.js

import axios from "axios";

const RAW = import.meta.env.VITE_API_URL || "http://localhost:3000";
export const API = RAW.replace(/\/+$/, "");

export const http = axios.create({ baseURL: API });

http.interceptors.request.use((config) => {
  const t = localStorage.getItem("token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export const endpoints = {
  login: "/login",
  register: "/register",
  communities: "/api/communities",
  messages: "/api/messages",
  members: "/api/members",
  dms: "/api/direct-messages",
};