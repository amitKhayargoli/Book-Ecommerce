import axios from "axios";

const BACKEND_BASE_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "http://localhost:4500";

export const api = axios.create({
  baseURL: BACKEND_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  paramsSerializer(params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== "") {
        searchParams.set(key, String(value));
      }
    }
    return searchParams.toString();
  },
});

// ─── 401 Interceptor: redirect to login when token expires ───────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // Avoid redirect loops - only redirect if not already on the login page
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login?expired=true";
      }
    }
    return Promise.reject(error);
  },
);
