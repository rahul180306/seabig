import { backendGet, API_BASE_URL } from "@/lib/serverApi";
import type { Feature, FeatureCollection, Geometry } from "geojson";

export const dynamic = "force-dynamic";

type RawPoint = Record<string, unknown> & {
  lat?: number; lng?: number; latitude?: number; longitude?: number; species?: string; name?: string; id?: string | number;
};

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function normalize(raw: unknown): FeatureCollection {
  const features: Feature[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw as RawPoint[]) {
      if (!item || typeof item !== "object") continue;
      const lat = toNumber(item.lat ?? item.latitude);
      const lng = toNumber(item.lng ?? item.longitude);
      if (lat == null || lng == null) continue;
  const species = String(item.species || item.name || "Unknown");
      const geom: Geometry = { type: "Point", coordinates: [lng, lat] };
      features.push({ type: "Feature", geometry: geom, properties: { species } });
    }
  } else if (raw && typeof raw === "object" && (raw as { type?: unknown }).type === "FeatureCollection") {

    return raw as FeatureCollection;
  }
  return { type: "FeatureCollection", features };
}

async function fetchFromDirectUrl(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`species fetch ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  if (/json/i.test(ct)) return res.json();
  return res.text();
}

export async function GET() {
  try {

    const direct = process.env.SPECIES_DATA_URL;
    let data: unknown = null;
    if (direct) {
      try {
        data = await fetchFromDirectUrl(direct);
      } catch (e) {
        console.warn("Direct species URL failed, attempting backend fallback:", (e as Error).message);
      }
    }
    if (data == null) {
      if (!API_BASE_URL) throw new Error("API_BASE_URL not set and no SPECIES_DATA_URL provided");
      try {
        data = await backendGet<unknown>("/species");
      } catch (e) {
        console.error("Backend species fetch failed:", (e as Error).message);
        data = [];
      }
    }
    const fc = normalize(data);
    return Response.json(fc);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 502, headers: { "content-type": "application/json" } });
  }
}
