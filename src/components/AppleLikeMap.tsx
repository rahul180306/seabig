"use client";
// cspell:words CARTO cartocdn basemaps OSM MapKit Leaflet palk அருகில் EEZ ஆபத்து எச்சரிக்கை பின்தொடரல் தொடங்கு நிறுத்து நீரிணை எல்லை எல்லைக்கு கவனி மிக பால்க் உடனே திரும்பவும் அணுகப்படுகிறது வேகத்தை குறைத்து பாதுகாப்பான தூரம் வைத்துக் கொள்ளவும் ஆங் தமி tileerror moveend zoomend geolocation turbopack
import React from "react";
import type { Map as LeafletMap, Layer, PathOptions, CircleMarker } from "leaflet";
import type { GeoJsonObject, FeatureCollection, Feature, Point } from "geojson";

const ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>';

type Props = Readonly<{
  className?: string;
  center?: [number, number];
  zoom?: number;
  fitWorld?: boolean;

  showBoundaries?: boolean; // EEZ / boundaries overlay
  showPalkLine?: boolean;   // Red dashed Palk line
  showPalkAlert?: boolean;  // Geolocation proximity alert system
  showTrackingControls?: boolean; // UI buttons for tracking + language toggle
  showSpecies?: boolean;    // Species markers + legend
  speciesEndpoint?: string; // Endpoint path for species/occurrence FeatureCollection
  useClustering?: boolean;  // Enable point clustering
  showSpeciesFilter?: boolean; // Show species text filter UI
}>;

type LeafletHandle = { map: LeafletMap | null; cleanup?: () => void };

const EARTH_R = 6371000;
function haversine(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * EARTH_R * Math.asin(Math.sqrt(h));
}

function buildMinDistanceFn(line: [number, number][]) {
  return (lat: number, lng: number): number => {
    const toXY = (p: [number, number]) => {
      const rad = Math.PI / 180;
      const x = p[1] * rad * Math.cos(lat * rad);
      const y = p[0] * rad;
      return [x, y] as [number, number];
    };
    const ptXY = toXY([lat, lng]);
    let best = Infinity;
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i];
      const b = line[i + 1];
      const aXY = toXY(a);
      const bXY = toXY(b);
      const ab: [number, number] = [bXY[0] - aXY[0], bXY[1] - aXY[1]];
      const ap: [number, number] = [ptXY[0] - aXY[0], ptXY[1] - aXY[1]];
      const abLen2 = ab[0] * ab[0] + ab[1] * ab[1];
      let t = abLen2 === 0 ? 0 : (ap[0] * ab[0] + ap[1] * ab[1]) / abLen2;
      t = Math.max(0, Math.min(1, t));
  let candidate: [number, number];
      if (t < 0.001) {
        candidate = a;
      } else if (t > 0.999) {
        candidate = b;
      } else {
        candidate = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      }
      const d = haversine([lat, lng], candidate);
      if (d < best) best = d;
    }
    return best;
  };
}

const PALK_LINE_COORDS: [number, number][] = [
  [9.25, 79.05],
  [9.20, 79.15],
  [9.15, 79.25],
  [9.05, 79.35],
  [8.95, 79.45],
  [8.85, 79.55],
  [8.75, 79.65],
  [8.65, 79.75],
  [8.55, 79.85]
];

const MESSAGES = {
  en: {
    danger: "CRITICAL: EEZ boundary ahead in Palk Strait! Turn back immediately.",
    caution: "Caution: Approaching Palk Strait EEZ boundary. Reduce speed and turn.",
    warn: "Warning: Nearing Palk Strait boundary. Maintain safe distance.",
    trackingOn: "Tracking ON",
    trackingOff: "Tracking OFF",
    enableTracking: "Enable Tracking",
    disableTracking: "Disable Tracking",
    langEN: "EN",
    langTA: "TA"
  },
  ta: {
    danger: "மிக ஆபத்து: பால்க் நீரிணை எல்லை அருகில்! உடனே திரும்பவும்.",
    caution: "எச்சரிக்கை: பால்க் நீரிணை எல்லை அணுகப்படுகிறது. வேகத்தை குறைத்து திரும்பவும்.",
    warn: "கவனி: பால்க் நீரிணை எல்லைக்கு அருகில். பாதுகாப்பான தூரம் வைத்துக் கொள்ளவும்.",
    trackingOn: "பின்தொடரல் ON",
    trackingOff: "பின்தொடரல் OFF",
    enableTracking: "பின்தொடரல் தொடங்கு",
    disableTracking: "பின்தொடரல் நிறுத்து",
    langEN: "ஆங்",
    langTA: "தமி"
  }
};

type Lang = keyof typeof MESSAGES;

function speciesColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 65% 48%)`;
}

type LeafletNamespace = typeof import("leaflet");

function featureToMarker(
  feat: { geometry?: { type?: string; coordinates: number[] }; properties?: { species?: string } },
  L: LeafletNamespace
): { species: string; marker: CircleMarker } | null {
  if (!feat.geometry || feat.geometry.type !== "Point") return null;
  const coords = feat.geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [lngRaw, latRaw] = coords;
  const lng = Number(lngRaw); const lat = Number(latRaw);
  if (!isFinite(lat) || !isFinite(lng)) return null;
  const rawSpecies = feat.properties?.species;
  const species = rawSpecies?.trim() || "Unknown";
  const color = speciesColor(species);
  const marker: CircleMarker = L.circleMarker([lat, lng], {
    radius: 5,
    color,
    weight: 1,
    fillColor: color,
    fillOpacity: 0.75,
  }).bindTooltip(species, { direction: "top", offset: [0, -4] });
  return { species, marker };
}

function renderLegend(groups: Record<string, CircleMarker[]>, legendEl: HTMLDivElement | null) {
  if (!legendEl) return;
  const entries = Object.keys(groups).sort((a, b) => a.localeCompare(b));
  if (!entries.length) return;
  legendEl.className = "palk-legend";
  const rows: string[] = ['<div class="legend-title">Species</div>'];
  for (const s of entries.slice(0, 12)) {
    const c = speciesColor(s);
    rows.push(`<div class="legend-row"><span class="swatch" style="background:${c}"></span>${s}</div>`);
  }
  if (entries.length > 12) rows.push(`<div class="legend-more">+${entries.length - 12} more</div>`);
  legendEl.innerHTML = rows.join("");
}
export default function AppleLikeMap({
  className,
  center = [20.5937, 78.9629],
  zoom = 5,
  fitWorld = false,
  showBoundaries = true,
  showPalkLine = true,
  showPalkAlert = true,
  showTrackingControls = true,
  showSpecies = true,
  speciesEndpoint = "/api/species",
  useClustering = false,
  showSpeciesFilter = false,
}: Props) {
  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const leafletRef = React.useRef<LeafletHandle>({ map: null });
  const alertRef = React.useRef<HTMLDivElement | null>(null);
  const palkLineRef = React.useRef<Layer | null>(null);
  const speciesLayerRef = React.useRef<Layer | null>(null);
  const legendRef = React.useRef<HTMLDivElement | null>(null);
  const allFeaturesRef = React.useRef<FeatureCollection | null>(null);
  const [speciesQuery, setSpeciesQuery] = React.useState("");

  const [trackingEnabled, setTrackingEnabled] = React.useState(false);
  const [lang, setLang] = React.useState<Lang>("en");
  const [mapReady, setMapReady] = React.useState(false);
  const toggleLang = () => setLang((l: Lang) => (l === "en" ? "ta" : "en"));
  const toggleTracking = () => setTrackingEnabled(t => !t);

  React.useEffect(() => {
    let cancelled = false;
    if (!mapRef.current || leafletRef.current.map) return;
    let cleanupFn: (() => void) | undefined;

    (async () => {
      const leaflet = await import("leaflet");
      const L = leaflet.default ?? leaflet;
      if (cancelled || !mapRef.current) return;

  const m = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
        worldCopyJump: true,
  });

  const tileUrl = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  const tileLayer = L.tileLayer(tileUrl, {
        attribution: ATTR,
        maxZoom: 20,
        crossOrigin: true,
  }).addTo(m);

  let fallbackAdded = false;
  const addFallback = () => {
        if (fallbackAdded) return;
        fallbackAdded = true;
        console.warn("CARTO tiles failed; falling back to OSM base layer.");
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(m);
  };
  tileLayer.on("tileerror", addFallback);

      if (fitWorld) {
        const worldBounds = L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180));
        m.fitBounds(worldBounds, { padding: [16, 16], maxZoom: 2, animate: false });
        m.setMinZoom(2);
      } else {
        m.setView(center, zoom);
      }

  tileLayer.once("load", () => {
        m.invalidateSize();
      });

      let eezLayer: Layer | null = null;
      const eezStyle: PathOptions = {
        color: "#0f172b",
        weight: 1.5,
        opacity: 0.8,
        dashArray: "4,4",
      };
      const isGeoJsonObject = (v: unknown): v is GeoJsonObject => !!v && typeof v === "object";
      const loadEEZ = async () => {
        if (!showBoundaries) return;
        try {
          const r = await fetch("/api/boundaries", { cache: "no-store" });
          if (!r.ok) return;
          const geo: unknown = await r.json();
          if (!isGeoJsonObject(geo)) return;
          const gj = L.geoJSON(geo, { style: eezStyle });
          eezLayer = gj;
          gj.addTo(m);
        } catch {}
      };
      loadEEZ();

      if (showPalkLine) {
        const palkLine = L.polyline(PALK_LINE_COORDS, {
          color: "#dc2626",
          weight: 3,
          opacity: 0.95,
          dashArray: "6,6",
        }).addTo(m);
        palkLineRef.current = palkLine;
      }

      if (showPalkAlert) {
        const alertEl = document.createElement("div");
        alertEl.className = "palk-alert hidden";
        alertRef.current = alertEl;
        mapRef.current.appendChild(alertEl);
      }

      if (showSpecies) {
        const legendEl = document.createElement("div");
        legendEl.className = "palk-legend hidden";
        legendRef.current = legendEl;
        mapRef.current.appendChild(legendEl);
      }

  const geoWatchId: number | null = null;

  leafletRef.current.map = m;
  setMapReady(true);
      const onResize = () => m.invalidateSize();
      window.addEventListener("resize", onResize);
      setTimeout(onResize, 50);

      cleanupFn = () => {
        window.removeEventListener("resize", onResize);
  if (eezLayer) {
          try { m.removeLayer(eezLayer); } catch {}
          eezLayer = null;
        }
  if (palkLineRef.current) { try { m.removeLayer(palkLineRef.current); } catch {} palkLineRef.current = null; }
  if (speciesLayerRef.current) { try { m.removeLayer(speciesLayerRef.current); } catch {} speciesLayerRef.current = null; }
  if (geoWatchId !== null) navigator.geolocation.clearWatch(geoWatchId);
  alertRef.current?.parentNode?.removeChild(alertRef.current);
  legendRef.current?.parentNode?.removeChild(legendRef.current);
        m.remove();
        leafletRef.current.map = null;
      };

    })();

    return () => {
  cancelled = true;
  if (cleanupFn) cleanupFn();
    };
  }, [center, zoom, fitWorld, showBoundaries, showPalkLine, showPalkAlert, showSpecies]);

  React.useEffect(() => {
    if (!mapReady || !showSpecies) return;
    const map = leafletRef.current.map;
    if (!map) return;
    if (speciesLayerRef.current) {
      try { map.removeLayer(speciesLayerRef.current); } catch {}
      speciesLayerRef.current = null;
    }
    let cancelled = false;
    async function load() {
      try {
  const res = await fetch(speciesEndpoint, { cache: "no-store" });
        if (!res.ok) return;
        const data: FeatureCollection = await res.json();
        if (cancelled || data.type !== "FeatureCollection") return;
        allFeaturesRef.current = data;
        const leaflet = await import("leaflet");
        const L = leaflet.default ?? leaflet;
        const filterFeatures = (fc: FeatureCollection): FeatureCollection => {
          if (!speciesQuery.trim()) return fc;
          const q = speciesQuery.toLowerCase();
          const filtered: Feature[] = [];
          for (const f of fc.features) {
            const props = f.properties as Record<string, unknown> | undefined;
            const n = props?.species;
            if (typeof n === 'string' && n.toLowerCase().includes(q)) filtered.push(f);
          }
          return { ...fc, features: filtered };
        };

        const renderPlain = (fc: FeatureCollection) => {
          if (!map) return;
          const groups: Record<string, CircleMarker[]> = {};
          const layerGroup = L.layerGroup();
          for (const feat of fc.features) {
            const result = featureToMarker(feat as { geometry?: { type?: string; coordinates: number[] }; properties?: { species?: string } }, L);
            if (!result) continue;
            const { species, marker } = result;
            marker.addTo(layerGroup);
            if (!groups[species]) groups[species] = [];
            groups[species].push(marker);
          }
          layerGroup.addTo(map);
          speciesLayerRef.current = layerGroup;
          renderLegend(groups, legendRef.current);
        };

        interface ClusterProperties { cluster?: boolean; point_count?: number; point_count_abbreviated?: number; species?: string }
        type ClusterFeature = Feature<Point, ClusterProperties>;

        async function buildClusterIndex(fc: FeatureCollection) {
          const { default: Supercluster } = await import('supercluster');
          const pts: Feature<Point, { species?: string }>[] = [];
          for (const f of fc.features) {
            if (f.geometry?.type !== 'Point') continue;
            const g: Point = f.geometry; // already Point due to guard
            const species = (f.properties as Record<string, unknown> | undefined)?.species;
            pts.push({ type: 'Feature', geometry: g, properties: { species: typeof species === 'string' ? species : 'Unknown' } });
          }
          const idx = new Supercluster({ radius: 60, maxZoom: 16 });
          idx.load(pts);
          return idx;
        }

        type LeafletNS = typeof L;

        function addClusterMarker(ns: LeafletNS, layerGroup: L.LayerGroup, cf: ClusterFeature) {
          if (cf.geometry.type !== 'Point') return;
          const count = cf.properties?.point_count ?? 0;
          const [lng, lat] = cf.geometry.coordinates;
          ns.circleMarker([lat, lng], {
            radius: 10,
            color: '#1e3a8a',
            weight: 2,
            fillColor: '#3b82f6',
            fillOpacity: 0.7
          }).bindTooltip(count + ' pts', { direction: 'top' }).addTo(layerGroup);
        }

        function addPointMarker(ns: LeafletNS, layerGroup: L.LayerGroup, cf: ClusterFeature, groups: Record<string, CircleMarker[]>) {
          if (cf.geometry.type !== 'Point') return;
          const species = typeof cf.properties?.species === 'string' ? cf.properties?.species : 'Unknown';
          const [lng, lat] = cf.geometry.coordinates;
          const sc = speciesColor(species);
          const marker = ns.circleMarker([lat, lng], {
            radius: 5,
            color: sc,
            weight: 1,
            fillColor: sc,
            fillOpacity: 0.75
          }).bindTooltip(species, { direction: 'top', offset: [0, -4] });
          marker.addTo(layerGroup);
          if (!groups[species]) groups[species] = [];
          groups[species].push(marker);
        }

        function drawClusters(rawClusters: ClusterFeature[], mapObj: LeafletMap, ns: LeafletNS) {
          const layerGroup = ns.layerGroup();
          const groups: Record<string, CircleMarker[]> = {};
          for (const cf of rawClusters) {
            if (cf.properties?.cluster) addClusterMarker(ns, layerGroup, cf); else addPointMarker(ns, layerGroup, cf, groups);
          }
          layerGroup.addTo(mapObj);
          speciesLayerRef.current = layerGroup;
          renderLegend(groups, legendRef.current);
        }

        const renderClustered = async (fc: FeatureCollection) => {
          if (!map) return;
          const idx = await buildClusterIndex(fc);
          const b = map.getBounds();
          const clusters: ClusterFeature[] = idx.getClusters([
            b.getWest(), b.getSouth(), b.getEast(), b.getNorth()
          ], Math.round(map.getZoom())) as ClusterFeature[];
          drawClusters(clusters, map, L);
        };

        const render = () => {
          const active = allFeaturesRef.current;
          if (!active || !map) return;
          if (speciesLayerRef.current) { try { map.removeLayer(speciesLayerRef.current); } catch {} speciesLayerRef.current = null; }
          const filtered = filterFeatures(active);
          if (useClustering) {
            renderClustered(filtered);
          } else {
            renderPlain(filtered);
          }
        };
        render();
        if (map) {
          map.on('moveend zoomend', () => { if (useClustering) render(); });
        }
      } catch {

      }
    }
    load();
    return () => { cancelled = true; };
  }, [mapReady, showSpecies, speciesEndpoint, useClustering, speciesQuery]);

  React.useEffect(() => {
    if (!showPalkAlert) return; 
    const map = leafletRef.current.map;
    const alertEl = alertRef.current;
    if (!map || !alertEl) return;
    let watchId: number | null = null;
    if (!trackingEnabled) {
      alertEl.className = "palk-alert hidden";
      alertEl.textContent = "";
      return;
    }
    const msgs = MESSAGES[lang];

    const distanceToPalk = buildMinDistanceFn(PALK_LINE_COORDS);
    function updateAlert(dist: number) {
      const warn = 6000; // meters
      const caution = 3000;
      const danger = 1500;
      let level: "none" | "warn" | "caution" | "danger" = "none";
      if (dist <= danger) level = "danger"; else if (dist <= caution) level = "caution"; else if (dist <= warn) level = "warn";
      if (!alertEl) return;
      if (level === "none") {
        alertEl.className = "palk-alert hidden";
        alertEl.textContent = "";
        return;
      }
      alertEl.className = `palk-alert level-${level}`;
      let msg: string;
      if (level === "danger") msg = msgs.danger; else if (level === "caution") msg = msgs.caution; else msg = msgs.warn;
      alertEl.textContent = msg;
    }
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        pos => {
          const { latitude, longitude } = pos.coords;
          const d = distanceToPalk(latitude, longitude);
          updateAlert(d);
        },
        () => {  },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
      );
    }
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, [trackingEnabled, lang, showPalkAlert]);

  return (
  <div className={className} style={{ position: "relative", height: "100%", background: "#f5f7fb", borderRadius: 16 }}>
      <div
        ref={mapRef}
        style={{ width: "100%", height: "100%", borderRadius: 16, boxShadow: "0 8px 28px rgba(0,0,0,0.35)" }}
      />
      {showSpeciesFilter && showSpecies && (
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 5000, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', borderRadius: 12, padding: '6px 10px', boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
          <input
            value={speciesQuery}
            onChange={e => setSpeciesQuery(e.target.value)}
            placeholder="Filter species..."
            style={{
              outline: 'none',
              background: 'transparent',
              fontSize: 12,
              width: 160
            }}
          />
        </div>
      )}
      {showTrackingControls && (
        <div className="palk-controls">
          <button type="button" onClick={toggleTracking} className={trackingEnabled ? "on" : "off"}>
            {trackingEnabled ? MESSAGES[lang].disableTracking : MESSAGES[lang].enableTracking}
          </button>
          <button type="button" onClick={toggleLang} className="lang-btn">
            {lang === "en" ? MESSAGES[lang].langTA : MESSAGES[lang].langEN}
          </button>
        </div>
      )}
    </div>
  );
}
