import SpeciesMap from '@/components/SpeciesMap';

export default function SpeciesServicePage() {
  return (
    // increase the fallback nav offset so content sits below the fixed header
  <main style={{ paddingTop: 'calc(var(--nav-offset, 220px) + 32px)', maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
  {/* expand the article to the full main content width */}
  <article style={{ width: '90%', margin: '0 auto', marginTop: 32, borderRadius: 12, padding: 18, background: 'white', boxShadow: '0 8px 30px rgba(2,6,23,0.06)', border: '1px solid rgba(2,6,23,0.04)' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Species mapping & temperature</h2>
        <p style={{ marginTop: 8, color: 'rgba(15,23,43,0.7)' }}>Mark species occurrences on an interactive map and toggle a global temperature overlay.</p>

        <div style={{ marginTop: 16 }}>
          <div className="seabig-map-card w-full h-full" style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'stretch', width: '85vw', marginLeft: 'calc(50% - 42.5vw)', marginTop: '40px', height: 'var(--map-card-height, 800px)', borderRadius: 18, padding: 18, background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(249,250,251,0.98))', boxShadow: '0 22px 60px rgba(2,6,23,0.14)', border: '1px solid rgba(2,6,23,0.06)' }}>
            <div style={{ width: '100%', height: '100%' }}>
              {/* SpeciesMap is a client component that lazy-loads Leaflet */}
              <SpeciesMap className="w-full h-full" />
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
