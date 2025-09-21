"use client";
import React, { Suspense } from 'react';

// Use React.lazy inside a client component so the heavy Leaflet module is only loaded on the client.
const LeafletMap = React.lazy(() => import('./LeafletMap'));

export default function MapClientLoader(props: Readonly<{ className?: string }>) {
  return (
    <Suspense fallback={<div style={{ width: '100%', height: '100%' }} />}> 
      <LeafletMap {...props} />
    </Suspense>
  );
}
