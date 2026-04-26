import { isAxiosError } from "axios";

export function getApiErrorMessage(err: unknown, fallback = "Request failed. Please try again."): string {
  if (isAxiosError(err) && err.response?.data) {
    const d = err.response.data as { detail?: string | Array<{ msg?: string }> };
    if (typeof d.detail === "string") return d.detail;
    if (Array.isArray(d.detail) && d.detail[0]?.msg) return d.detail[0].msg;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
