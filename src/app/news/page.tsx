export default function NewsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-3xl font-bold mb-4">Latest News</h1>
      <div className="space-y-6">
        <article className="border-b pb-4">
          <h2 className="text-xl font-semibold mb-2">New AI Model Released</h2>
          <p className="text-slate-700 mb-2">We have integrated the latest DeepSeek R1 model for enhanced chatbot capabilities.</p>
          <time className="text-sm text-slate-500">September 22, 2025</time>
        </article>
        <article className="border-b pb-4">
          <h2 className="text-xl font-semibold mb-2">Species Mapping Update</h2>
          <p className="text-slate-700 mb-2">Improved performance with Supercluster and canvas rendering for better visualization.</p>
          <time className="text-sm text-slate-500">September 20, 2025</time>
        </article>
        <article>
          <h2 className="text-xl font-semibold mb-2">Welcome to SeaBig</h2>
          <p className="text-slate-700 mb-2">Exploring marine biodiversity with cutting-edge technology.</p>
          <time className="text-sm text-slate-500">September 15, 2025</time>
        </article>
      </div>
    </main>
  );
}
