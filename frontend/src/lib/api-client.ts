import axios from "axios";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "http://localhost:3001";

export const api = axios.create({
  baseURL: BACKEND_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
