This is a specialized Next.js mapping project (originally bootstrapped with `create-next-app`) extended to:

- Render an Apple-like Leaflet map with CARTO + OSM fallback.
- Overlay (optionally) EEZ boundaries & Palk Strait safety alert system.
- Visualize marine species / occurrence point data with deterministic color hashing and legend.
- Provide feature flags to show/hide boundaries, alert, controls, and species layers.

## Data Endpoints

Internal API routes normalize heterogeneous upstream formats to GeoJSON `FeatureCollection`s:

| Route | Purpose | Env Variable Priority | Backend Fallback |
|-------|---------|-----------------------|------------------|
| `/api/boundaries` | EEZ / maritime boundaries | `BOUNDARIES_GEOJSON_PATH` (if implemented) | `/map/boundaries/geojson` etc. |
| `/api/species` | Simple species points (lat/lng + species|name) | `SPECIES_DATA_URL` | `/species` |
| `/api/occurrences` | Rich occurrence datasets (GBIF/OBIS style) | `SPECIES_OCCURRENCE_URL` | `/occurrences` then `/species` |
| `/api/species/all` | Aggregated union of multiple backend endpoints | `SPECIES_DATA_ENDPOINTS` | Comma list of backend paths |

Each route guarantees a `FeatureCollection` (possibly empty) so the front-end stays resilient.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `API_BASE_URL` | Base URL of FastAPI backend (server-side). |
| `NEXT_PUBLIC_API_BASE_URL` | Public base URL if client needs direct calls (optional). |
| `BACKEND_API_KEY` | Optional auth key sent to backend (if required). |
| `BOUNDARIES_GCS_SIGNED_URL` | Signed URL for GCS EEZ GeoJSON (e.g., gs://samudriksha/eez_borders.geojson). |
| `SPECIES_DATA_URL` | Absolute URL (e.g., GCS signed URL) for simple species array/GeoJSON. |
| `SPECIES_OCCURRENCE_URL` | Absolute URL for occurrence dataset (GBIF/OBIS style JSON or GeoJSON). |
| `SPECIES_DATA_ENDPOINTS` | Comma-separated backend paths to aggregate (e.g. `/species,/occurrences,/plankton`). |

If both a direct URL and a backend fallback exist, the direct URL is attempted first.

### Pointing to a LAN / Windows FastAPI Backend (Option A)

If you already run the Python backend on another machine (e.g. Windows box at `192.168.1.4:8000`):

1. Ensure that machine is reachable from your dev machine (ping or curl).
2. Create / update `.env.local` in this repo with:
	```bash
	NEXT_PUBLIC_API_BASE_URL=http://192.168.1.4:8000
	API_BASE_URL=http://192.168.1.4:8000
	# BACKEND_API_KEY=your-secret-if-needed
	```
3. Restart Next.js dev server so env vars load.
4. Validate connectivity:
	```bash
	curl http://192.168.1.4:8000/health
	curl http://192.168.1.4:8000/map/boundaries/geojson | head -n 5
	```
5. Open `http://localhost:3000/health` (if present) or the map pages; network tab should show 200 responses for proxied `/api/*` routes.

Troubleshooting:
* If requests hang, verify Windows firewall allows inbound on 8000.
* If CORS errors appear for direct client calls, prefer using the internal Next.js API routes which proxy server-side.
* If you add an API key, set `BACKEND_API_KEY` and confirm backend expects header `X-API-Key`.

### Fetching EEZ Boundaries from Google Cloud Storage (GCS)

If your EEZ GeoJSON is stored in GCS (e.g., bucket `samudriksha`):

1. Generate a signed URL for the file (e.g., `gs://samudriksha/eez_borders.geojson`):
   - Use `gsutil signurl` or Google Cloud Console to create a signed URL with read access.
   - Example command: `gsutil signurl -d 1d gs://samudriksha/eez_borders.geojson`
2. Add to `.env.local`:
   ```bash
   BOUNDARIES_GCS_SIGNED_URL=https://storage.googleapis.com/samudriksha/eez_borders.geojson?X-Goog-Algorithm=GOOG4-RSA-SHA256&...
   ```
3. Restart dev server.
4. The `/api/boundaries` route will prioritize GCS if the URL is set, falling back to backend if fetch fails.

Note: Signed URLs expire; regenerate as needed. For permanent access, make the bucket/object public or use service account credentials.

## Map Component Flags

`<AppleLikeMap />` props:

```ts
showBoundaries?: boolean;      // default true
showPalkLine?: boolean;        // default true
showPalkAlert?: boolean;       // default true (geolocation proximity alerts)
showTrackingControls?: boolean;// default true (tracking + language buttons)
showSpecies?: boolean;         // default true (species markers + legend)
speciesEndpoint?: string;      // default "/api/species" (can set "/api/occurrences" or "/api/species/all")
```

To render only occurrence points (no EEZ or alerts):

```tsx
<AppleLikeMap
	showBoundaries={false}
	showPalkLine={false}
	showPalkAlert={false}
	showTrackingControls={false}
	speciesEndpoint="/api/occurrences"
/>
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Development

Run dev server:

```bash
npm run dev
```

Visit http://localhost:3000/services/species for the occurrence visualization page.

## Future Enhancements

- (Done) Marker clustering for dense occurrence datasets.
- Time slider filtering by eventDate.
- (Done) Species filter / search box.
- Caching layer (edge) for large GCS JSON payloads.

---
Generated documentation additions reflect current code state.
