// cspell:words SOVEREIGNT popupable srilanka seebig
"use client";
import React, { useEffect, useRef } from 'react';
import type { Map as LeafletMapType, Layer } from 'leaflet';
import type { Feature } from 'geojson';

type Props = Readonly<{ className?: string }>;

// Helper: robustly stringify a property value for matching
function propToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.toLowerCase();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v).toLowerCase();
  // for objects/arrays, try to extract common name-like fields
  if (typeof v === 'object') {
    try {
      const obj = v as Record<string, unknown>;
      for (const key of ['name', 'NAME', 'admin', 'ADMIN']) {
        if (obj && typeof obj[key] === 'string') return String(obj[key]).toLowerCase();
      }
      return JSON.stringify(v).toLowerCase();
    } catch {
      return '';
    }
  }
  return '';
}

// Helper: detect if a feature's properties indicate India or Sri Lanka
function isTargetFeature(props: Record<string, unknown> | undefined): 'india' | 'srilanka' | null {
  if (!props) return null;
  const keys = ['SOVEREIGNT','ADMIN','COUNTRY','ISO_A3','ISO3','a3','NAME','COUNTRY_NA','SOV_A3','sovereignt','admin','name'];
  for (const k of keys) {
  const s = propToString(props[k]);
    if (!s) continue;
    if (s.includes('sri lanka') || s.includes('lka')) return 'srilanka';
    if (s.includes('india') || s.includes('indian') || s === 'ind') return 'india';
  }
  // last resort: scan all values
  for (const k in props) {
  const s = propToString(props[k]);
    if (!s) continue;
    if (s.includes('sri lanka') || s.includes('lka')) return 'srilanka';
    if (s.includes('india') || s.includes('indian') || s === 'ind') return 'india';
  }
  return null;
}

export default function LeafletMap({ className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);
  const mapRef = useRef<LeafletMapType | null>(null);

  useEffect(() => {
    let mounted = true;
    // keep a reference to the map object so helper functions can access it without deep nesting
    const ra = () => {
      if (mapRef.current && typeof mapRef.current.invalidateSize === 'function') {
        // TypeScript: narrow mapRef.current before calling
        const m = mapRef.current;
        setTimeout(() => m.invalidateSize(), 150);
      }
    };

  async function init() {
      if (!containerRef.current) return;

      // Load Leaflet only on the client.
      const L = await import('leaflet');
      // Inject Leaflet CSS at runtime (avoid TypeScript import for css files)
      if (!document.querySelector('link[data-leaflet-css]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.setAttribute('data-leaflet-css', '');
        document.head.appendChild(link);
      }

      if (!mounted || !containerRef.current) return;

  // create map
  const map = L.map(containerRef.current, {
        center: [20, 78],
        zoom: 5,
        zoomControl: true,
        attributionControl: false,
        preferCanvas: true,
      });
  mapRef.current = map;

      // themed tile layer (subtle contrast + crisp tiles)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        detectRetina: false,
        tileSize: 256,
      }).addTo(map);

      // small, elegant map attribution badge (manual DOM insertion to avoid typing mismatch)
      const mapContainer = containerRef.current;
      if (mapContainer) {
        const badge = document.createElement('div');
        badge.className = 'seabig-map-attr';
        badge.style.cssText = 'position:absolute; right:12px; bottom:12px; background: rgba(255,255,255,0.9); padding:6px 8px; border-radius:6px; box-shadow:0 6px 18px rgba(2,6,23,0.06); font-size:11px; color:rgba(15,23,43,.7);';
        badge.innerHTML = '<a href="https://openstreetmap.org" target="_blank" rel="noreferrer noopener" style="color:inherit; text-decoration:none">© OSM</a>';
        mapContainer.appendChild(badge);
      }

      // Load EEZ GeoJSON from Google Cloud Storage and highlight India & Sri Lanka
      try {
        const url = 'https://storage.googleapis.com/samudriksha/eez_borders_20250920_222109.geojson';
        const res = await fetch(url);
          if (res.ok) {
            const geo = await res.json();

                  // Create separate layers for India and Sri Lanka for styling
                  const indiaLayer = L.geoJSON(null, {
                    style: { color: '#000000', weight: 3, opacity: 1, fillColor: '#0369a1', fillOpacity: 0.32 },
              onEachFeature: (feature: Feature | null, layer: Layer) => {
                const props = feature?.properties as Record<string, unknown> | undefined;
                let name = 'India EEZ';
                if (props) {
                  if (typeof props.NAME === 'string') name = props.NAME;
                  else if (typeof props.ADMIN === 'string') name = props.ADMIN;
                  else if (typeof props.SOVEREIGNT === 'string') name = props.SOVEREIGNT;
                }
                const popupable = layer as { bindPopup?: (html: string) => void };
                if (popupable.bindPopup) popupable.bindPopup(`<strong>${name}</strong>`);
              }
            }).addTo(map);

            const slLayer = L.geoJSON(null, {
              style: { color: '#000000', weight: 3, opacity: 1, fillColor: '#0ea5a4', fillOpacity: 0.32 },
              onEachFeature: (feature: Feature | null, layer: Layer) => {
                const props = feature?.properties as Record<string, unknown> | undefined;
                let name = 'Sri Lanka EEZ';
                if (props) {
                  if (typeof props.NAME === 'string') name = props.NAME;
                  else if (typeof props.ADMIN === 'string') name = props.ADMIN;
                  else if (typeof props.SOVEREIGNT === 'string') name = props.SOVEREIGNT;
                }
                const popupable = layer as { bindPopup?: (html: string) => void };
                if (popupable.bindPopup) popupable.bindPopup(`<strong>${name}</strong>`);
              }
            }).addTo(map);

            const features = geo?.features ?? [];
            for (const f of features) {
              const props = f?.properties as Record<string, unknown> | undefined;
              const target = isTargetFeature(props);
              if (target === 'srilanka') {
                slLayer.addData(f);
              } else if (target === 'india') {
                indiaLayer.addData(f);
              }
            }

            // Ensure stroke is visible above tiles by bringing layers to front
            setTimeout(() => {
              const s = slLayer as unknown as { bringToFront?: () => void };
              const i = indiaLayer as unknown as { bringToFront?: () => void };
              s.bringToFront?.();
              i.bringToFront?.();
            }, 250);

            // Fit bounds to both layers if any features were added
            const group = L.featureGroup([indiaLayer, slLayer]);
            if (group.getLayers().length > 0) map.fitBounds(group.getBounds(), { padding: [20, 20] });
          }
      } catch (err) {
        console.debug('Failed to load EEZ GeoJSON from GCS', err);
      }

  // ensure map resizes correctly
  ra();
  const ro = new ResizeObserver(ra as ResizeObserverCallback);
      ro.observe(containerRef.current);
      window.addEventListener('resize', ra);

      cleanupRef.current = () => {
        ro.disconnect();
        window.removeEventListener('resize', ra);
        if (mapRef.current) mapRef.current.remove();
      };
    }

    init();

    return () => {
      mounted = false;
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

      return (
        <div
          className={['seabig-map-card w-full h-full', className].filter(Boolean).join(' ')}
          style={{
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'stretch',
            width: '100%',
            height: 'var(--map-card-height, 800px)',
            maxWidth: 1400,
            margin: '0 auto',
            borderRadius: 18,
            padding: 18,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(249,250,251,0.98))',
            boxShadow: '0 22px 60px rgba(2,6,23,0.14)',
            border: '1px solid rgba(2,6,23,0.06)',
          }}
        >
          <section
            aria-label="Interactive map"
            ref={containerRef}
            className={['w-full h-full leaflet-container leaflet-touch leaflet-retina leaflet-fade-anim leaflet-grab leaflet-touch-drag leaflet-touch-zoom'].join(' ')}
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(2,6,23,0.08)',
              border: '1px solid rgba(2,6,23,0.06)',
              outlineStyle: 'none',
            }}
          />
          {/* Focus helper for keyboard users: visible on keyboard focus */}
          <button
            onClick={() => containerRef.current?.focus()}
            aria-label="Focus map"
            style={{
              position: 'absolute',
              left: 8,
              top: 8,
              background: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(2,6,23,0.06)',
              padding: '6px 8px',
              borderRadius: 8,
              fontSize: 12,
              display: 'none',
            }}
            onFocus={(e) => (e.currentTarget.style.display = 'block')}
            onBlur={(e) => (e.currentTarget.style.display = 'none')}
          >
            Focus map
          </button>
        </div>
      );
}
