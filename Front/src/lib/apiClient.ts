import axios, { AxiosError } from "axios";
import { clearToken, getToken } from "./authStorage";

/**
 * Axios instance pointed at VITE_API_BASE_URL. The mock service layer in
 * `src/shared/services/hospitalService.ts` does NOT go through this client
 * yet — swap the service implementations to call this instance when the
 * real backend lands.
 */
export const apiClient = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ??
    import.meta.env.VITE_API_URL ??
    "http://localhost:8000/api/v1",
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearToken();
      // Soft-redirect; route guard will handle the rest.
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
