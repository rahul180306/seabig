// cspell:ignore decimallatitude decimallongitude decimallat decimallong
import { NextResponse } from 'next/server';
import { requireApiKey } from '../../../lib/requireApiKey';

type Row = { [k: string]: string };

const cellRe = /\s*(?:"((?:[^"]|"")*)"|([^,]*))\s*(?:,|$)/g;

function parseHeader(line: string): string[] {
  const headers: string[] = [];
  let m: RegExpExecArray | null;
  cellRe.lastIndex = 0;
  while ((m = cellRe.exec(line)) !== null) {
    const val = m[1] !== undefined ? m[1].replace(/""/g, '"') : (m[2] || '');
    headers.push(val.trim());
    if (m[0].length === 0) break; // safety
  }
  return headers;
}

function parseRow(line: string, headers: string[]): Row {
  const obj: Row = {};
  let m: RegExpExecArray | null;
  cellRe.lastIndex = 0;
  let col = 0;
  while ((m = cellRe.exec(line)) !== null && col < headers.length) {
    const val = m[1] !== undefined ? m[1].replace(/""/g, '"') : (m[2] || '');
    obj[headers[col] || `col${col}`] = val;
    col++;
    if (m[0].length === 0) break;
  }
  while (col < headers.length) {
    obj[headers[col] || `col${col}`] = '';
    col++;
  }
  return obj;
}

function parseCsv(text: string): Row[] {
  const rows: Row[] = [];
  if (!text) return rows;
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines.length === 0) return rows;
  const headerLine = lines.shift() || '';
  const headers = parseHeader(headerLine);
  for (const line of lines) {
    if (!line) continue;
    rows.push(parseRow(line, headers));
  }
  return rows;
}

function inBBox(latS: number, lonS: number, minLat: number, minLon: number, maxLat: number, maxLon: number) {
  return latS >= minLat && latS <= maxLat && lonS >= minLon && lonS <= maxLon;
}

export async function GET(req: Request) {
  const bad = requireApiKey(req);
  if (bad) return bad;

  const url = new URL(req.url);
  const object = url.searchParams.get('object');
  const page = Number(url.searchParams.get('page') || '1');
  const perPage = Math.min(200, Number(url.searchParams.get('per_page') || '100'));
  const species = url.searchParams.get('species')?.toLowerCase();
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
  const latField = url.searchParams.get('lat_field') ?? '';
  const lonField = url.searchParams.get('lon_field') ?? '';
  const bbox = url.searchParams.get('bbox'); // minLon,minLat,maxLon,maxLat

  if (!object) return NextResponse.json({ error: 'missing object param' }, { status: 400 });

  try {
    const res = await fetch(`https://storage.googleapis.com/samudriksha/${object}`);
    if (!res.ok) {
      console.error('GCS fetch failed', object, res.status, res.statusText);
      return NextResponse.json({ error: 'fetch failed' }, { status: 502 });
    }
    const text = await res.text();
    let rows: Row[] = [];
    try {
      rows = parseCsv(text);
    } catch (err) {
      console.error('CSV parse error for', object, err);
      return NextResponse.json({ error: 'csv parse error' }, { status: 500 });
    }

    // detect lat/lon fields if not provided
    const commonLat = ['decimallatitude', 'decimallat', 'latitude', 'lat'];
    const commonLon = ['decimallongitude', 'decimallong', 'longitude', 'lon', 'lng'];
    const headers = rows.length ? Object.keys(rows[0]).map((h) => String(h).toLowerCase()) : [];
    const pickField = (preferred: string, candidates: string[]) => {
      if (preferred) return preferred;
      for (const c of candidates) {
        const idx = headers.indexOf(c);
        if (idx >= 0) return Object.keys(rows[0])[idx];
      }
      return null;
    };
    const latKey = pickField(latField, commonLat);
    const lonKey = pickField(lonField, commonLon);

    // filter
    let filtered = rows;
    if (species) filtered = filtered.filter((r) => (r['species'] || '').toLowerCase().includes(species));
    if (startDate) filtered = filtered.filter((r) => (r['eventDate'] || r['date'] || '') >= startDate);
    if (endDate) filtered = filtered.filter((r) => (r['eventDate'] || r['date'] || '') <= endDate);
    if (bbox) {
      const [minLon, minLat, maxLon, maxLat] = bbox.split(',').map(Number);
      filtered = filtered.filter((r) => {
        const lat = Number((latKey ? r[latKey] : r['decimalLatitude']) || r['lat'] || 'NaN');
        const lon = Number((lonKey ? r[lonKey] : r['decimalLongitude']) || r['lon'] || 'NaN');
        if (Number.isNaN(lat) || Number.isNaN(lon)) return false;
        return inBBox(lat, lon, minLat, minLon, maxLat, maxLon);
      });
    }

    const total = filtered.length;
    const start = (page - 1) * perPage;
    const pageRows = filtered.slice(start, start + perPage);
    return NextResponse.json({ total, page, per_page: perPage, results: pageRows });
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
