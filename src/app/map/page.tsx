import MapClientLoader from '@/components/MapClientLoader';

export default function MapPage() {
  return (
    <main style={{ paddingTop: 'var(--nav-offset, 96px)' }} className="px-4 sm:px-6">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: '#07203a' }}>Interactive map</h1>
      </div>

      <div style={{ width: '100%', height: 'calc(100vh - 160px)', minHeight: 520 }}>
        <MapClientLoader className="w-full h-full" />
      </div>
    </main>
  );
}
