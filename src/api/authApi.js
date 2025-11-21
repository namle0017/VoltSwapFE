import axios from "axios";
const base = import.meta.env.VITE_API_BASE_URL;

const AUTH_API = axios.create({
  baseURL: `${base}/api/Auth`,
  headers: { "Content-Type": "application/json" },
});

export default AUTH_API;
//VoltSwapProjectSwp
