export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}
