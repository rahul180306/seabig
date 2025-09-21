"use client";
// cspell:ignore scientificname moveend sciname
import React, { useEffect, useRef, useState } from 'react';
import Supercluster from 'supercluster';
import type { Map as LeafletMapType, TileLayer as LeafletTileLayer, LayerGroup as LeafletLayerGroup } from 'leaflet';
type MapWithCleanup = LeafletMapType & { __cleanupCanvas?: () => void };
type SuperWithExpand = InstanceType<typeof Supercluster> & { getClusterExpansionZoom?: (id: number) => number };

function coerceName(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    try { return JSON.stringify(raw); } catch { return 'unknown'; }
  }
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  return 'unknown';
}

export default function SpeciesMap({ className }: Readonly<{ className?: string }>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const tempLayerRef = useRef<LeafletTileLayer | null>(null);
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [speciesQuery, setSpeciesQuery] = useState('');
  const [currentObject, setCurrentObject] = useState<string | null>(null);
  const markersLayerRef = useRef<LeafletLayerGroup | null>(null);
  const [occPage, setOccPage] = useState(1);
  const [occHasMore, setOccHasMore] = useState(true);
  const [datasets, setDatasets] = useState<string[]>([]);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);
  const [occCount, setOccCount] = useState(0);
  const [apiKey, setApiKey] = useState('');
  type Cluster = { geometry: { coordinates: [number, number] }; properties?: { cluster?: number; point_count?: number; cluster_id?: number } & Record<string, unknown>; id?: number };
  const superRef = useRef<SuperWithExpand | null>(null);
  type OccFeature = { type: 'Feature'; geometry: { type: 'Point'; coordinates: [number, number] }; properties: Record<string, unknown> };
  const featuresRef = useRef<OccFeature[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef<LeafletMapType | null>(null);
  const [lastSampleKeys, setLastSampleKeys] = useState<string[] | null>(null);
  const [confirmFullLoad, setConfirmFullLoad] = useState(false);
  const [randomColors, setRandomColors] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [renderMode, setRenderMode] = useState<'heat' | 'points'>('heat');

  // compute top-20 species/color pairs from current features (non-memoized snapshot)
  const legendItems = (() => {
    const map: Record<string, string> = {};
    for (const f of featuresRef.current) {
      const props = f.properties as Record<string, unknown> | undefined;
      if (!props) continue;
      const raw = props['scientificName'] ?? props['species'] ?? props['sciname'];
      const name = coerceName(raw);
      const col = (props['__color'] as string | undefined) ?? `hsl(${(Object.keys(map).length * 137) % 360} 70% 45%)`;
      if (!map[name]) map[name] = col;
      if (Object.keys(map).length >= 20) break;
    }
    return Object.entries(map).map(([name, color]) => ({ name, color }));
  })();

  // export current overlay canvas as PNG
  const exportHeatmap = () => {
    const c = canvasRef.current;
    if (!c) return;
    try {
      const url = c.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = (currentObject ? currentObject.replace(/[^a-z0-9._-]/gi, '_') : 'heatmap') + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.debug('export failed', e);
    }
  };

  // Helper to safely read the runtime API key from window or env
  function getRuntimeKey(): string {
    if (typeof window !== 'undefined') {
      const w = window as unknown as { __NEXT_PUBLIC_OWM_API_KEY?: string };
      if (w.__NEXT_PUBLIC_OWM_API_KEY) return w.__NEXT_PUBLIC_OWM_API_KEY;
    }
    return process.env.NEXT_PUBLIC_OWM_API_KEY ?? '';
  }

  // draw clusters and points on the canvas overlay
  const drawCanvas = React.useCallback(() => {
    const map = mapRef.current;
    const canvas = canvasRef.current;
    const sc = superRef.current;
    if (!map || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // compute clusters for current bbox and zoom
  const bounds = map.getBounds();
  const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()] as [number, number, number, number];
    const zoom = Math.round(map.getZoom());
    let clusters: Cluster[] = [];
    if (renderMode === 'points') {
      if (!sc) return;
      try {
        clusters = sc.getClusters(bbox, zoom) as Cluster[];
      } catch {
        return;
      }
    }
    // If heat mode, we'll render density below without using Supercluster
    if (renderMode === 'heat') {
      // heatmap accumulation on an offscreen reduced-resolution canvas
      const renderHeat = () => {
        const heatScale = 0.25; // smaller buffer for accumulation
        const w = Math.max(1, Math.round(canvas.width * heatScale));
        const h = Math.max(1, Math.round(canvas.height * heatScale));
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const offCtx = off.getContext('2d');
        if (!offCtx) return;
        offCtx.clearRect(0, 0, w, h);
        offCtx.globalCompositeOperation = 'lighter';
        // draw small circles for each feature into offscreen buffer
        const radius = Math.max(6, Math.round(12 * heatScale));
        for (const f of featuresRef.current) {
          const [lon, lat] = f.geometry.coordinates;
          if (lon < bbox[0] || lon > bbox[2] || lat < bbox[1] || lat > bbox[3]) continue;
          const p = map.latLngToContainerPoint([lat, lon]);
          const x = Math.round((p.x * dpr) * heatScale);
          const y = Math.round((p.y * dpr) * heatScale);
          offCtx.beginPath();
          offCtx.fillStyle = 'rgba(0,0,0,0.06)';
          offCtx.arc(x, y, radius, 0, Math.PI * 2);
          offCtx.fill();
        }
        // colorize: map alpha to a color gradient
        const img = offCtx.getImageData(0, 0, w, h);
        const data = img.data;
        // gradient stops (r,g,b)
        const stops = [ [33,150,243], [0,200,83], [255,235,59], [244,67,54] ];
        for (let pi = 0; pi < data.length; pi += 4) {
          const alpha = data[pi + 3] / 255; // 0..1
          if (alpha <= 0) {
            data[pi + 3] = 0;
            continue;
          }
          // enhance contrast
          const t = Math.min(1, alpha * 3);
          const idx = Math.floor(t * (stops.length - 1));
          const frac = t * (stops.length - 1) - idx;
          const a = stops[idx];
          const b = stops[Math.min(stops.length - 1, idx + 1)];
          const r = Math.round(a[0] + (b[0] - a[0]) * frac);
          const g = Math.round(a[1] + (b[1] - a[1]) * frac);
          const bl = Math.round(a[2] + (b[2] - a[2]) * frac);
          data[pi] = r;
          data[pi + 1] = g;
          data[pi + 2] = bl;
          // set alpha scaled for visibility
          data[pi + 3] = Math.min(255, Math.round(alpha * 255 * 1.8));
        }
        offCtx.putImageData(img, 0, 0);
        // draw the colorized offscreen canvas back to the main canvas scaled to full size
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      };
      renderHeat();
      return;
    }
  // draw every feature within bbox as a very small dot; use feature.__color if assigned
  for (const [i, f] of featuresRef.current.entries()) {
      const [lon, lat] = f.geometry.coordinates;
      if (lon < bbox[0] || lon > bbox[2] || lat < bbox[1] || lat > bbox[3]) continue;
      const p = map.latLngToContainerPoint([lat, lon]);
      const x = Math.round(p.x * dpr);
      const y = Math.round(p.y * dpr);
      const r = Math.max(0.45 * dpr, 0.45);
  const col = (f.properties as Record<string, string | undefined>)['__color'] ?? `hsl(${(i * 137) % 360} 70% 45%)`;
  ctx.beginPath();
  ctx.fillStyle = col;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // draw clusters on top (so cluster counts remain visible)
    for (const c of clusters) {
      const coords = c.geometry.coordinates;
      const lat = coords[1];
      const lon = coords[0];
      const p = map.latLngToContainerPoint([lat, lon]);
      const x = Math.round(p.x * dpr);
      const y = Math.round(p.y * dpr);
      if (c.properties?.cluster) {
        const count = c.properties.point_count ?? c.properties.cluster ?? 0;
        const radius = Math.min(40, 8 + Math.log(count + 1) * 4) * dpr;
        // outer circle
        ctx.beginPath();
        ctx.fillStyle = 'rgba(59,130,246,0.9)';
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        // inner count
        ctx.fillStyle = 'white';
        ctx.font = `${12 * dpr}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(count), x, y);
      }
    }
  }, [renderMode]);

  useEffect(() => {
    // Read env at runtime from the client-side global set by Next.js
    const key = getRuntimeKey();
    setHasApiKey(!!key);

    let mounted = true;
    async function init() {
      if (!ref.current) {
        return;
      }
      // If a map is already initialized for this component instance, avoid re-initializing.
      if (mapRef.current) {
        return;
      }
      const L = await import('leaflet');
      if (!document.querySelector('link[data-leaflet-css]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.setAttribute('data-leaflet-css', '');
        document.head.appendChild(link);
      }

      if (!mounted) return;
  const map = L.map(ref.current, { center: [20, 78], zoom: 3, preferCanvas: true });
      mapRef.current = map;

      // Ensure map panes are behind other page chrome; lowers z-index of Leaflet container panes
      try {
        const container = map.getContainer();
        // map container itself
        container.style.zIndex = '0';
        // common panes
        const panes = container.querySelectorAll('.leaflet-pane');
        panes.forEach((p) => { (p as HTMLElement).style.zIndex = '0'; });
      } catch (err) {
        // non-fatal; log for debugging
        console.debug('pane z-index set failed', err);
      }

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

      // Example marker for a species sighting
      const marker = L.circleMarker([6.9271, 79.8612], { radius: 8, color: '#ff5722', fillOpacity: 0.9 }).addTo(map);
      marker.bindPopup('<strong>Example sighting</strong><br/>Colombo, Sri Lanka');

      // layer for fetched occurrence markers
      const markersLayer = L.layerGroup().addTo(map);
      // store as Leaflet LayerGroup
      markersLayerRef.current = markersLayer as unknown as LeafletLayerGroup;

      // create an overlay canvas for cluster drawing
      try {
        const container = map.getContainer();
        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'auto';
        canvas.style.zIndex = '100';
        container.appendChild(canvas);
        canvasRef.current = canvas;

        const resizeCanvas = () => {
          const dpr = window.devicePixelRatio || 1;
          const w = container.clientWidth;
          const h = container.clientHeight;
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
          canvas.style.width = `${w}px`;
          canvas.style.height = `${h}px`;
        };
        resizeCanvas();

        // redraw on relevant map events
        const drawHandler = () => drawCanvas();
  map.on('move', drawHandler);
  map.on('zoom', drawHandler);
  window.addEventListener('resize', resizeCanvas);

        // click handling to zoom into clusters
        const onClick = (ev: MouseEvent) => {
          const canvasEl = canvasRef.current;
          const m = mapRef.current;
          const sc = superRef.current;
          if (!canvasEl || !m || !sc) return;
          const rect = canvasEl.getBoundingClientRect();
          const x = ev.clientX - rect.left;
          const y = ev.clientY - rect.top;
          const bounds = m.getBounds();
          const bbox2 = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()] as [number, number, number, number];
          const zoom2 = Math.round(m.getZoom());
          const clusters2 = sc.getClusters(bbox2, zoom2) as Cluster[];
          let nearest: Cluster | null = null;
          let bestDist = Infinity;
          for (const c of clusters2) {
            const [lon, lat] = c.geometry.coordinates;
            const p = m.latLngToContainerPoint([lat, lon]);
            const dx = p.x - x;
            const dy = p.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < bestDist) {
              bestDist = dist;
              nearest = c;
            }
          }
          if (nearest?.properties?.cluster && bestDist < 40) {
            const clusterIdRaw = nearest.properties?.cluster_id ?? nearest.id;
            const clusterId: number = typeof clusterIdRaw === 'number' ? clusterIdRaw : Number(clusterIdRaw ?? NaN);
            if (!Number.isFinite(clusterId)) return;
            const expZoom = sc.getClusterExpansionZoom?.(clusterId);
            if (typeof expZoom === 'number') {
              m.setView([nearest.geometry.coordinates[1], nearest.geometry.coordinates[0]], expZoom + 1);
            }
          }
        };
        canvas.addEventListener('click', onClick);

        // cleanup for canvas on map removal
        const cleanupCanvas = () => {
          map.off('move', drawHandler);
          map.off('zoom', drawHandler);
          window.removeEventListener('resize', resizeCanvas);
          canvas.removeEventListener('click', onClick);
          try { container.removeChild(canvas); } catch { /* ignore */ }
          canvasRef.current = null;
        };

        // attach cleanup to map remove
  (map as unknown as MapWithCleanup).__cleanupCanvas = cleanupCanvas;
      } catch (err) {
        console.debug('canvas overlay init failed', err);
      }

  // (moveend binding is added in a separate effect so it can depend on callbacks)

      // If overlay should start enabled and API key exists, create it now but don't add until toggled
      if (key) {
        const tempUrl = `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${key}`;
        try {
          const tl = L.tileLayer(tempUrl, { opacity: 0.45 });
          tempLayerRef.current = tl as unknown as LeafletTileLayer;
        } catch (e) {
          // debug but continue; layer creation can be retried when user toggles
          console.debug('temp layer init failed', e);
        }
      }

      // cleanup
      return () => {
        mounted = false;
        // ensure canvas cleanup runs before map removal
        try { (map as MapWithCleanup).__cleanupCanvas?.(); } catch { /* ignore */ }
        try { map.remove(); } catch { /* ignore */ }
        tempLayerRef.current = null;
        mapRef.current = null;
      };
    }

    init();
    return () => {
      mounted = false;
    };
  }, [drawCanvas]);

  

  // fetch available datasets (cleaned list) on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/datasets');
        if (!res.ok) return;
        const body = await res.json();
        // expect { cleaned: [{ name, url, ... }], raw: [...] }
        const cleaned = Array.isArray(body.cleaned)
          ? body.cleaned.map((i: { name?: string; url?: string } | string) => {
              if (typeof i === 'string') return i;
              return i.name ?? i.url ?? '';
            }).filter(Boolean)
          : [];
        if (mounted) {
          setDatasets(cleaned);
          if (cleaned.length && !currentObject) setCurrentObject(cleaned[0]);
        }
      } catch (e) {
        console.debug('datasets fetch failed', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [currentObject]);

  // load occurrences for the selected dataset (with optional bbox)
  
    // types for occurrence rows
    type OccRow = Record<string, string | number | null | undefined>;
  
    const getLatLonFromRow = React.useCallback((r: OccRow): { lat: number; lon: number } | null => {
      const latKeys = ['decimalLatitude', 'lat', 'latitude'];
      const lonKeys = ['decimalLongitude', 'lon', 'longitude', 'lng'];
      let lat: number | null = null;
      let lon: number | null = null;
      for (const k of latKeys) {
        const v = r[k];
        if (v != null && String(v) !== '') { lat = Number(v); break; }
      }
      for (const k of lonKeys) {
        const v = r[k];
        if (v != null && String(v) !== '') { lon = Number(v); break; }
      }
      if (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) return null;
      return { lat, lon };
    }, []);

  // createMarkerForRow removed: rendering now uses canvas clusters instead of individual Leaflet markers
  
  const loadOccurrences = React.useCallback(async ({ page = 1, perPage = 5000, bbox }: { page?: number; perPage?: number; bbox?: string } = {}) => {
      if (!currentObject) {
        console.debug('loadOccurrences called but no currentObject selected');
        return;
      }
      setLoadingOccurrences(true);
      try {
        const allFeatures: OccFeature[] = [];
        const fetchPageAndProcess = async (pageNum: number) => {
          try {
            const params = new URLSearchParams();
            params.set('object', currentObject);
            params.set('per_page', String(perPage));
            params.set('page', String(pageNum));
            if (speciesQuery) params.set('species', speciesQuery);
            if (bbox) params.set('bbox', bbox);
            const url = `/api/occurrences?${params.toString()}`;
            const res = await fetch(url, { headers: apiKey ? { 'x-api-key': apiKey } : undefined });
            if (!res.ok) {
              console.debug('occ fetch failed', res.statusText);
              return null;
            }
            const body = await res.json();
            const rows = Array.isArray(body.results) ? body.results : [];
            if (!rows || rows.length === 0) return 0;
            if (!lastSampleKeys) setLastSampleKeys(Object.keys(rows[0] || {}));
            let added = 0;
            for (const rRaw of rows) {
              const r = rRaw as OccRow;
              const ll = getLatLonFromRow(r);
              if (!ll) continue;
              const col = randomColors
                ? `hsl(${Math.floor(Math.random() * 360)} 70% 45%)`
                : (() => {
                    const seedText = `${ll.lat},${ll.lon},${String(r['scientificName'] ?? r['species'] ?? '')}`;
                    let h = 0;
                    for (let i = 0; i < seedText.length; i++) h = (h * 179 + seedText.charCodeAt(i)) >>> 0;
                    const hue = h % 360;
                    return `hsl(${hue} 70% 45%)`;
                  })();
              allFeatures.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [ll.lon, ll.lat] },
                properties: { ...r, __color: col }
              });
              added++;
            }
            return added;
          } catch (err) {
            console.debug('page fetch error', err);
            return null;
          }
        };
        // iterate pages and process via helper to reduce complexity
        let currentPage = page;
        while (true) {
          const added = await fetchPageAndProcess(currentPage);
          if (added === null) break;
          if (added === 0) break;
          if (added < perPage) break;
          currentPage += 1;
        }
        featuresRef.current = allFeatures;
        setOccCount(allFeatures.length);

        // build cluster index
        try {
          const sc = new Supercluster({ radius: 40, maxZoom: 16 });
          sc.load(allFeatures);
          superRef.current = sc as unknown as InstanceType<typeof Supercluster>;
        } catch (err) {
          console.debug('supercluster build failed', err);
          superRef.current = null;
        }
        if (mapRef.current) drawCanvas();
        setOccPage(page);
        setOccHasMore(false);
      } catch (e) {
        console.debug('load occurrences error', e);
      } finally {
        setLoadingOccurrences(false);
      }
  }, [currentObject, speciesQuery, getLatLonFromRow, apiKey, drawCanvas, lastSampleKeys, randomColors]);
  
    const loadOccurrencesInView = React.useCallback(async () => {
      const map = mapRef.current;
      if (!map?.getBounds) return;
      const b = map.getBounds();
      const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
      await loadOccurrences({ page: 1, perPage: 5000, bbox });
    }, [loadOccurrences]);

  // bind moveend to load occurrences when callback is ready
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = () => { void loadOccurrencesInView(); };
    map.on('moveend', handler);
    return () => { map.off('moveend', handler); };
  }, [loadOccurrencesInView]);

  // toggle handler: adds/removes the temp layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Re-read key from runtime global
    const key = getRuntimeKey();
    if (!key) return;

    (async () => {
      const L = await import('leaflet');
      if (!tempLayerRef.current) {
        const tempUrl = `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${key}`;
        tempLayerRef.current = L.tileLayer(tempUrl, { opacity: 0.45 });
      }
      if (overlayEnabled) {
        tempLayerRef.current?.addTo(map);
        return;
      }

      if (tempLayerRef.current && map.hasLayer(tempLayerRef.current)) {
        map.removeLayer(tempLayerRef.current);
      }
    })();
  }, [overlayEnabled]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 360, zIndex: 0 }}>
      <div ref={ref} className={className} style={{ width: '100%', height: '100%', zIndex: 0 }} />

      {/* Controls: toggle and legend (collapsible) */}
      {controlsCollapsed ? (
        <div style={{ position: 'absolute', left: 12, top: 12 }}>
          <button onClick={() => setControlsCollapsed(false)} aria-label="Expand controls" style={{ background: 'white', border: '1px solid rgba(2,6,23,0.06)', padding: 6, borderRadius: 6, boxShadow: '0 6px 18px rgba(2,6,23,0.06)' }}>☰</button>
        </div>
      ) : (
        <div style={{ position: 'absolute', left: 12, top: 12, background: 'white', padding: '8px 10px', borderRadius: 8, boxShadow: '0 6px 18px rgba(2,6,23,0.08)', border: '1px solid rgba(2,6,23,0.06)', fontSize: 13, minWidth: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontWeight: 700 }}>Controls</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={() => setControlsCollapsed(true)} aria-label="Minimize controls" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14 }}>—</button>
            </div>
          </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" disabled={!hasApiKey} checked={overlayEnabled} onChange={(e) => setOverlayEnabled(e.target.checked)} />
            <span>Temperature overlay</span>
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <select value={currentObject ?? ''} onChange={(e) => setCurrentObject(e.target.value)} style={{ flex: 1 }}>
            {datasets.length === 0 && <option value="">(no datasets)</option>}
            {datasets.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={() => {
            if (!confirmFullLoad) {
              const ok = typeof window !== 'undefined' ? window.confirm('Load full dataset into browser memory? This may be slow and use significant memory. Continue?') : true;
              if (!ok) return;
              setConfirmFullLoad(true);
            }
            void loadOccurrences({ page: 1 });
          }} style={{ marginLeft: 6 }}>Load</button>
          <button onClick={() => { const path = 'marine_species_data/20250921_145724_marine_species_cleaned.csv'; setCurrentObject(path); void loadOccurrences({ page: 1 }); }} style={{ marginLeft: 6 }}>Load cleaned sample</button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={randomColors} onChange={(e) => { setRandomColors(e.target.checked); }} />
            <span style={{ fontSize: 13 }}>Random colors</span>
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 12 }}>
            <input type="checkbox" checked={showLegend} onChange={(e) => setShowLegend(e.target.checked)} />
            <span style={{ fontSize: 13 }}>Show legend</span>
          </label>
          <div style={{ marginLeft: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setRenderMode('heat')} style={{ padding: '4px 8px', background: renderMode === 'heat' ? '#111827' : 'white', color: renderMode === 'heat' ? 'white' : '#111827', borderRadius: 6, border: '1px solid rgba(2,6,23,0.06)' }}>Heatmap</button>
            <button onClick={() => setRenderMode('points')} style={{ padding: '4px 8px', background: renderMode === 'points' ? '#111827' : 'white', color: renderMode === 'points' ? 'white' : '#111827', borderRadius: 6, border: '1px solid rgba(2,6,23,0.06)' }}>Points</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input placeholder="species filter" value={speciesQuery} onChange={(e) => setSpeciesQuery(e.target.value)} style={{ flex: 1 }} />
          <button onClick={() => void loadOccurrencesInView()} style={{ marginLeft: 6 }}>Load in view</button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <input placeholder="DATA API key (x-api-key)" value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={{ flex: 1 }} />
        </div>
        <div style={{ marginTop: 6, color: '#6b7280', fontSize: 12 }}>
          {loadingOccurrences ? 'Loading occurrences...' : `Page ${occPage}`}{occHasMore ? ' (more available)' : ''} — {occCount} shown
        </div>
        {currentObject && (
          <div style={{ marginTop: 6, color: '#374151', fontSize: 12 }}>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Selected object:</div>
            <div style={{ fontSize: 12, wordBreak: 'break-all' }}>{`https://storage.googleapis.com/samudriksha/${currentObject}`}</div>
            {lastSampleKeys && <div style={{ marginTop: 4, fontSize: 11, color: '#6b7280' }}>Sample fields: {lastSampleKeys.join(', ')}</div>}
          </div>
        )}
        {!hasApiKey && (
          <div style={{ marginTop: 6, color: '#6b7280', fontSize: 12 }}>
            Provide NEXT_PUBLIC_OWM_API_KEY in your environment to enable live tiles.
          </div>
        )}
        </div>
      )}
      {showLegend && (
        <div style={{ position: 'absolute', right: 12, bottom: 12, background: 'rgba(255,255,255,0.95)', padding: 8, borderRadius: 8, border: '1px solid rgba(2,6,23,0.06)', fontSize: 12, maxWidth: 260, maxHeight: 300, overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontWeight: 700 }}>Legend</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => exportHeatmap()} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6 }}>Export heatmap</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ width: 14, height: 14, background: '#ff5722', display: 'inline-block', borderRadius: 7 }} />
            <span>Species sighting (points)</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ width: 14, height: 14, background: '#3b82f6', display: 'inline-block', borderRadius: 2, opacity: 0.6 }} />
            <span>Temperature (overlay)</span>
          </div>
          <div style={{ marginTop: 6 }}>
            {legendItems.map(({ name, color }) => (
              <div key={name} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ width: 12, height: 12, background: color, display: 'inline-block', borderRadius: 6 }} />
                <span style={{ fontSize: 12 }}>{name}</span>
              </div>
            ))}
            {legendItems.length === 0 && <div style={{ fontSize: 12, color: '#6b7280' }}>No species loaded yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
