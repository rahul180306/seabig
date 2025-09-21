import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
	try {
		const p = path.join(process.cwd(), 'india_eez.geojson');
		const raw = await fs.readFile(p, 'utf8');
		// parse once to ensure it's valid JSON
		const parsed = JSON.parse(raw);
		return new Response(JSON.stringify(parsed), { status: 200, headers: { 'Content-Type': 'application/geo+json' } });
		} catch {
				// if file missing or invalid, return a small fallback FeatureCollection
				// (simple bounding polygon around the India region) so the map can
				// display something in dev. Keep 410 behavior possible by changing
				// this fallback if you prefer the endpoint to be absent.
				const fallback = {
					type: 'FeatureCollection',
					features: [
						{
							type: 'Feature',
							properties: { name: 'India bbox fallback' },
							geometry: {
								type: 'Polygon',
								// [lng, lat] coordinates for a rough bbox over India
								coordinates: [[[68, 6], [98, 6], [98, 36], [68, 36], [68, 6]]],
							},
						},
					],
				};
				return new Response(JSON.stringify(fallback), { status: 200, headers: { 'Content-Type': 'application/geo+json' } });
		}
}
