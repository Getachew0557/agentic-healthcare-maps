import axios, { AxiosError } from "axios";
import { clearToken, getToken } from "./authStorage";

const isDev = import.meta.env.DEV;
const log = (...a: unknown[]) => {
  if (isDev) console.info("[ChatMap API]", ...a);
};

/**
 * Axios instance pointed at VITE_API_BASE_URL. The mock service layer in
 * `src/shared/services/hospitalService.ts` does NOT go through this client
 * yet — swap the service implementations to call this instance when the
 * real backend lands.
 */
const baseURL =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:8000/api/v1";

if (isDev) {
  log("baseURL =", baseURL, "| env VITE_API_BASE_URL =", import.meta.env.VITE_API_BASE_URL ?? "(unset)");
}

export const apiClient = axios.create({
  baseURL,
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  log("request →", (config.method ?? "get").toUpperCase(), {
    baseURL: config.baseURL,
    path: config.url,
    params: config.params,
  });
  return config;
});

apiClient.interceptors.response.use(
  (r) => {
    log("response ←", r.status, r.config.method?.toUpperCase(), r.config.url, r.status < 400 ? "ok" : "");
    return r;
  },
  (error: AxiosError) => {
    const msg = error.message;
    const noResponse = !error.response;
    const code = error.code;
    log("error", {
      message: msg,
      code,
      noResponse,
      hint: noResponse
        ? "Request never got an HTTP response (wrong URL, CORS, or server not running)."
        : undefined,
      status: error.response?.status,
      baseURL: error.config?.baseURL,
      path: error.config?.url,
    });
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
