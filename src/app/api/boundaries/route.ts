import { backendGet } from "@/lib/serverApi";
import type { FeatureCollection, GeoJsonObject } from "geojson";

export const dynamic = "force-dynamic";

const ACCEPT_HDR = { headers: { Accept: "application/geo+json, application/json" } } as const;

function isGeo(obj: unknown): obj is GeoJsonObject {
  if (!obj || typeof obj !== "object") return false;
  const rawType: unknown = (obj as { type?: unknown }).type;
  const t = typeof rawType === "string" ? rawType : "";
  return (
    t === "Feature" ||
    t === "FeatureCollection" ||
    t === "GeometryCollection" ||
    t === "Polygon" ||
    t === "MultiPolygon" ||
    t === "LineString" ||
    t === "MultiLineString"
  );
}

async function tryPaths(paths: string[]): Promise<GeoJsonObject | null> {
  for (const p of paths) {
    try {
      const data = await backendGet<unknown>(p, ACCEPT_HDR);
      if (isGeo(data)) return data;
    } catch {

    }
  }
  return null;
}

export async function GET() {
  try {
    const gcsUrl = process.env.BOUNDARIES_GCS_SIGNED_URL;
    if (gcsUrl) {
      try {
        const res = await fetch(gcsUrl, ACCEPT_HDR);
        if (res.ok) {
          const data = await res.json();
          if (isGeo(data)) return Response.json(data);
        }
      } catch (err) {
        console.error("GCS fetch failed:", err);
      }
    }

  const configured = process.env.BOUNDARIES_GEOJSON_PATH || "/map/boundaries/geojson";
  const candidates = ["/map/boundaries/geojson", configured, "/map/eez/geojson", "/map/boundaries"]; // prefer known path
    const geo = await tryPaths(candidates);
    if (geo) return Response.json(geo);

    const empty: FeatureCollection = { type: "FeatureCollection", features: [] };
    return Response.json(empty);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("/api/boundaries proxy error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}
