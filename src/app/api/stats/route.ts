import { backendGet } from "@/lib/serverApi";

export const dynamic = "force-dynamic";

type GeoJSONFeatureCollection = { type: "FeatureCollection"; features?: unknown[] };

export async function GET() {
  try {
    const [health, boundaries] = await Promise.all([
      backendGet<{ status: string }>("/health"),
      backendGet<GeoJSONFeatureCollection | unknown[] | null>("/map/boundaries").catch(() => null),
    ]);

    let boundariesCount = 0;
    if (Array.isArray(boundaries)) {
      boundariesCount = boundaries.length;
    } else if (boundaries && typeof boundaries === "object") {
      const maybeFC = boundaries as Partial<GeoJSONFeatureCollection>;
      if (Array.isArray(maybeFC.features)) boundariesCount = maybeFC.features.length;
    }

    return Response.json({
      online: health?.status === "ok",
      boundariesCount,
    });
  } catch {
    return Response.json({ online: false, boundariesCount: 0 }, { status: 200 });
  }
}
