export const API_BASE_URL = process.env.API_BASE_URL?.replace(/\/$/, "") || "";
const API_KEY = process.env.BACKEND_API_KEY;

export async function backendGet<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) throw new Error("API_BASE_URL not set");
  const suffix = path.startsWith("/") ? path : "/" + path;
  const url = API_BASE_URL + suffix;
  const originalHeaders = init.headers instanceof Headers ? Object.fromEntries(init.headers.entries()) : (init.headers as Record<string, string> | undefined) || {};
  const headers: Record<string, string> = { ...originalHeaders };
  if (API_KEY) headers["X-API-Key"] = API_KEY;
  const res = await fetch(url, { ...init, headers, cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Backend ${res.status} for ${url} - ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (/\bjson\b/i.test(ct)) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}
