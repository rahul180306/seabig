"use client";
import React from 'react';
import AppleLikeMap from '../../../components/AppleLikeMap';

export default function SpeciesServiceMapPage() {
  return (
    <main className="h-[calc(100dvh-0px)] flex flex-col">
      <header
        className="px-6 pb-3 max-w-7xl w-full mx-auto"
        style={{ paddingTop: 'calc(var(--nav-offset, 8rem) + 0.5rem)' }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Species Distribution</h1>
        <p className="text-slate-600 text-sm max-w-2xl mt-1">
          Interactive map showing claimed EEZ boundaries and color‑coded marine species observation points. Colors are assigned deterministically per species name.
        </p>
      </header>
      <div className="flex-1 relative">
        <AppleLikeMap
          showBoundaries={false}
          showPalkLine={false}
          showPalkAlert={false}
          showTrackingControls={false}
          showSpecies={true}
          speciesEndpoint="/api/occurrences" // switched to occurrences normalized endpoint
          useClustering={true}
          showSpeciesFilter={true}
          zoom={5}
          center={[20.5937, 78.9629]}
        />
      </div>
    </main>
  );
}
