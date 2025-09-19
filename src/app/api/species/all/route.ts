import { backendGet, API_BASE_URL } from '@/lib/serverApi';
import type { FeatureCollection, Feature, Geometry } from 'geojson';

export const dynamic = 'force-dynamic';

interface RawPointLike { [k: string]: unknown }

function toNum(v: unknown): number | null {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string') { const n = Number(v.trim()); if (!Number.isNaN(n)) return n; }
  return null;
}

function featureFromRecord(rec: RawPointLike): Feature | null {
  const lat = toNum(rec.lat ?? rec.latitude ?? rec.decimalLatitude ?? rec.y);
  const lng = toNum(rec.lng ?? rec.lon ?? rec.long ?? rec.longitude ?? rec.decimalLongitude ?? rec.x);
  if (lat == null || lng == null) return null;
  const rawSpecies = (rec as Record<string, unknown>).species
    ?? (rec as Record<string, unknown>).scientificName
    ?? (rec as Record<string, unknown>).vernacularName
    ?? (rec as Record<string, unknown>).name
    ?? (rec as Record<string, unknown>).taxon
    ?? 'Unknown';
  const species = typeof rawSpecies === 'string' ? rawSpecies : 'Unknown';
  const props: Record<string, unknown> = { species };
  if (rec.eventDate || rec.date) props.date = rec.eventDate || rec.date;
  if (rec.recordedBy) props.recordedBy = rec.recordedBy;
  if (rec.basisOfRecord) props.basisOfRecord = rec.basisOfRecord;
  const geom: Geometry = { type: 'Point', coordinates: [lng, lat] };
  return { type: 'Feature', geometry: geom, properties: props };
}

function normalizeAny(raw: unknown): Feature[] {
  if (!raw) return [];
  if (typeof raw === 'object' && (raw as { type?: unknown }).type === 'FeatureCollection') {
    return (raw as FeatureCollection).features ?? [];
  }
  if (Array.isArray(raw)) {
    const out: Feature[] = [];
    for (const r of raw) {
      if (!r || typeof r !== 'object') continue;
      const f = featureFromRecord(r as RawPointLike); if (f) out.push(f);
    }
    return out;
  }
  if (typeof raw === 'object') {
    const maybe = (raw as { results?: unknown }).results;
    if (Array.isArray(maybe)) return normalizeAny(maybe);
  }
  return [];
}

function collectFeatures(paths: string[]): Promise<Feature[]> {
  const collected: Feature[] = [];
  const seen = new Set<string>();
  return paths.reduce(async (chain, p) => {
    await chain;
    try {
      const data = await backendGet<unknown>(p.startsWith('/') ? p : '/' + p);
      const feats = normalizeAny(data);
      for (const f of feats) {
        if (f.geometry?.type !== 'Point' || !Array.isArray(f.geometry.coordinates)) continue;
        const coords = f.geometry.coordinates as [number, number];
        const [lng, lat] = coords;
        const props = (f.properties ?? {}) as Record<string, unknown>;
        const speciesVal = props.species;
        const speciesStr = typeof speciesVal === 'string' ? speciesVal : 'Unknown';
        const key = speciesStr + '|' + lat + '|' + lng;
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push(f);
      }
    } catch (e) {
      console.warn('Aggregate species endpoint failed for', p, (e as Error).message);
    }
  }, Promise.resolve()).then(() => collected);
}

export async function GET() {
  try {
    if (!API_BASE_URL) throw new Error('API_BASE_URL not set');
    const pathsEnv = process.env.SPECIES_DATA_ENDPOINTS || '/species';
    const paths = pathsEnv.split(',').map(s => s.trim()).filter(Boolean);
    const features = await collectFeatures(paths);
    const fc: FeatureCollection = { type: 'FeatureCollection', features };
    return Response.json(fc);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 502, headers: { 'content-type': 'application/json' } });
  }
}
