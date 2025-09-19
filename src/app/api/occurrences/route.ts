import { backendGet, API_BASE_URL } from "@/lib/serverApi";
import type { Feature, FeatureCollection, Geometry } from "geojson";

export const dynamic = "force-dynamic";

type RawOccurrence = Record<string, unknown> & {
  decimalLatitude?: number; decimalLongitude?: number;
  lat?: number; latitude?: number; y?: number; // latitude keys
  lng?: number; lon?: number; long?: number; longitude?: number; x?: number; // longitude keys
  species?: string; scientificName?: string; vernacularName?: string; name?: string;
  eventDate?: string; date?: string; recordedBy?: string; basisOfRecord?: string; occurrenceID?: string | number;
};

function toNum(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.trim());
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

interface RawResultsWrapper { results?: unknown; type?: unknown }

function buildFeature(item: RawOccurrence): Feature | null {
  const lat = toNum(item.decimalLatitude ?? item.lat ?? item.latitude ?? item.y);
  const lng = toNum(item.decimalLongitude ?? item.lng ?? item.lon ?? item.long ?? item.longitude ?? item.x);
  if (lat == null || lng == null) return null;
  const species = String(item.species ?? item.scientificName ?? item.vernacularName ?? item.name ?? "Unknown");
  const props: Record<string, unknown> = { species };
  if (item.eventDate || item.date) props.date = item.eventDate || item.date;
  if (item.recordedBy) props.recordedBy = item.recordedBy;
  if (item.basisOfRecord) props.basisOfRecord = item.basisOfRecord;
  if (item.occurrenceID) props.occurrenceID = item.occurrenceID;
  const geom: Geometry = { type: "Point", coordinates: [lng, lat] };
  return { type: "Feature", geometry: geom, properties: props };
}

function fromArray(arr: unknown[]): Feature[] {
  const out: Feature[] = [];
  for (const r of arr) {
    if (!r || typeof r !== "object") continue;
    const f = buildFeature(r as RawOccurrence);
    if (f) out.push(f);
  }
  return out;
}

function normalize(raw: unknown): FeatureCollection {
  if (raw && typeof raw === "object" && (raw as { type?: unknown }).type === "FeatureCollection") {
    return raw as FeatureCollection;
  }
  if (Array.isArray(raw)) {
    return { type: "FeatureCollection", features: fromArray(raw) };
  }
  if (raw && typeof raw === "object") {
    const wrapper = raw as RawResultsWrapper;
    if (Array.isArray(wrapper.results)) {
      return { type: "FeatureCollection", features: fromArray(wrapper.results) };
    }
  }
  return { type: "FeatureCollection", features: [] };
}

async function fetchDirect(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`occurrences fetch ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  if (/json/i.test(ct)) return res.json();
  return res.text();
}

export async function GET() {
  try {

    const direct = process.env.SPECIES_OCCURRENCE_URL;
    let data: unknown = null;
    if (direct) {
      try { data = await fetchDirect(direct); } catch (e) { console.warn("Direct occurrence URL failed:", (e as Error).message); }
    }
    if (data == null) {
      if (!API_BASE_URL) throw new Error("API_BASE_URL not set and no SPECIES_OCCURRENCE_URL provided");
      try {

        try { data = await backendGet<unknown>("/occurrences"); } catch { data = await backendGet<unknown>("/species"); }
      } catch (e) {
        console.error("Backend occurrences fetch failed:", (e as Error).message);
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
