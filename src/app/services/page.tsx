export default function ServicesPage() {
  return (
  <main className="mx-auto max-w-5xl px-6 pb-16" style={{ paddingTop: 'var(--nav-offset, 8rem)' }}>
      <h1 className="text-3xl font-bold mb-8">Services</h1>
      <div className="grid gap-6 sm:grid-cols-2">
        {}
        <a href="/services/species" className="group relative overflow-hidden rounded-2xl bg-black text-white p-5 ring-1 ring-white/10 shadow-[0_8px_28px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] hover:ring-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
          <span className="pointer-events-none absolute top-0 left-[-40%] h-full w-[40%] bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12 transform translate-x-0 transition-transform duration-800 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-[240%]" />
          <div className="flex items-start gap-4 relative z-10">
            <div className="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden ring-1 ring-white/20 bg-white/10 grid place-items-center text-xs text-white/60 font-semibold tracking-wide">
              MAP
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold mb-1">Species Distribution Map</h2>
              <p className="text-sm text-white/75 leading-snug">
                View EEZ boundaries and colored point markers for reported marine species observations.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide font-semibold text-white/60">
                <span className="px-2 py-1 rounded-full bg-white/5 ring-1 ring-white/15">EEZ</span>
                <span className="px-2 py-1 rounded-full bg-white/5 ring-1 ring-white/15">Species</span>
                <span className="px-2 py-1 rounded-full bg-white/5 ring-1 ring-white/15">Live</span>
              </div>
            </div>
            <span className="ml-auto text-white/70 text-2xl transition-transform group-hover:translate-x-0.5">→</span>
          </div>
        </a>
        {}
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="font-semibold mb-2">More Coming Soon</h2>
          <p className="text-sm text-slate-600">Additional analytics and intelligence modules will appear here.</p>
        </div>
      </div>
    </main>
  );
}
