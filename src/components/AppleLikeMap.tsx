import React from 'react';

export default function AppleLikeMap({ className }: Readonly<{ className?: string }>) {
  // Placeholder component — Leaflet map removed.
  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        color: '#0f172b',
      }}
    >
      <div style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>Map removed</div>
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>The Leaflet map has been disabled.</div>
      </div>
    </div>
  );
}
