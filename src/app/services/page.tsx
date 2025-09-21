import Link from 'next/link';

export default function ServicesPage() {
  const cards = [
    { title: 'Data & Boundaries', desc: 'GeoJSON services, boundary exports and spatial APIs.' },
  { title: 'Occurrence APIs', desc: 'Query species occurrences with filters and paging.' },
    { title: 'Analytics', desc: 'Aggregated statistics, charts and spatial summaries.' },
    { title: 'Custom Integrations', desc: 'Embeddable maps, export pipelines and consulting.' },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-12" style={{ paddingTop: 96 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto 28px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#07203a' }}>Services</h1>
        <p style={{ color: 'rgba(15,23,43,0.7)' }}>Explore our core offerings — lightweight, API-first and spatially-aware.</p>
      </div>

      <section style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 20,
          }}
        >
          {cards.map((c) => {
            if (c.title === 'Data & Boundaries') {
              return (
                <Link key={c.title} href="/map" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <article style={{ borderRadius: 12, padding: 18, background: 'white', boxShadow: '0 8px 30px rgba(2,6,23,0.06)', border: '1px solid rgba(2,6,23,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 10, background: 'linear-gradient(135deg,#e6f2ff,#c7f6f0)' }} />
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#07203a' }}>{c.title}</h3>
                    </div>
                    <p style={{ marginTop: 12, color: 'rgba(15,23,43,0.7)' }}>{c.desc}</p>
                  </article>
                </Link>
              );
            }
            if (c.title === 'Occurrence APIs') {
              return (
                <Link key={c.title} href="/services/occurrence" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <article style={{ borderRadius: 12, padding: 18, background: 'white', boxShadow: '0 8px 30px rgba(2,6,23,0.06)', border: '1px solid rgba(2,6,23,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 10, background: 'linear-gradient(135deg,#e6f2ff,#c7f6f0)' }} />
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#07203a' }}>{c.title}</h3>
                    </div>
                    <p style={{ marginTop: 12, color: 'rgba(15,23,43,0.7)' }}>{c.desc}</p>
                  </article>
                </Link>
              );
            }
            return (
              <article key={c.title} style={{ borderRadius: 12, padding: 18, background: 'white', boxShadow: '0 8px 30px rgba(2,6,23,0.06)', border: '1px solid rgba(2,6,23,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: 'linear-gradient(135deg,#e6f2ff,#c7f6f0)' }} />
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#07203a' }}>{c.title}</h3>
                </div>
                <p style={{ marginTop: 12, color: 'rgba(15,23,43,0.7)' }}>{c.desc}</p>
              </article>
            );
          })}

          {/* Species service card */}
          <article style={{ borderRadius: 12, padding: 18, background: 'white', boxShadow: '0 8px 30px rgba(2,6,23,0.06)', border: '1px solid rgba(2,6,23,0.04)' }}>
            <a href="/services/species" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: 'linear-gradient(135deg,#fff0e6,#ffe6f0)' }} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#07203a' }}>Species mapping</h3>
              </div>
              <p style={{ marginTop: 12, color: 'rgba(15,23,43,0.7)' }}>Interactive species maps with temperature overlay and occurrence markers.</p>
            </a>
          </article>
        </div>
      </section>
    </main>
  );
}
