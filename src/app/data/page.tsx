"use client";

import { useEffect, useState } from 'react';

type Item = { name: string; url: string; size?: string; updated?: string };

export default function DataPage() {
  const [cleaned, setCleaned] = useState<Item[] | null>(null);
  const [raw, setRaw] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const fetchList = async (prefix: string, setter: (v: Item[]) => void) => {
      try {
        const res = await fetch(`/api/gcs-list?bucket=samudriksha&prefix=${encodeURIComponent(prefix)}&api_key=seabig-data-key`);
        const json = await res.json();
        if (json.items) setter(json.items);
        else setErr('no items');
      } catch {
        setErr('fetch error');
      }
    };
    fetchList('marine_species_data/', setCleaned);
    fetchList('raw_data/', setRaw);
  }, [setErr]);

  const [query, setQuery] = useState('');

  const formatSize = (sz?: string | number) => {
    if (!sz) return '';
    const n = typeof sz === 'string' ? parseInt(sz, 10) : sz;
    if (isNaN(n)) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const filter = (items: Item[] | null) => {
    if (!items) return null;
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((it) => it.name.toLowerCase().includes(q));
  };

  const cleanedFiltered = filter(cleaned);
  const rawFiltered = filter(raw);

  // selection, sort and pagination state
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [sortKey, setSortKey] = useState<'name' | 'size' | 'updated'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [preview, setPreview] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);

  const sortItems = (items: Item[] | null) => {
    if (!items) return null;
    const copy = [...items];
    copy.sort((a, b) => {
      const avRaw = a[sortKey as keyof Item];
      const bvRaw = b[sortKey as keyof Item];
      if (sortKey === 'size') {
        const avN = Number(avRaw) || 0;
        const bvN = Number(bvRaw) || 0;
        return sortDir === 'asc' ? avN - bvN : bvN - avN;
      }
      const avS = (avRaw ?? '').toString();
      const bvS = (bvRaw ?? '').toString();
      if (avS === bvS) return 0;
      if (sortDir === 'asc') {
        return avS > bvS ? 1 : -1;
      } else {
        return avS > bvS ? -1 : 1;
      }
    });
    return copy;
  };

  const paginated = (items: Item[] | null) => {
    if (!items) return null;
    const start = (page - 1) * perPage;
    return items.slice(start, start + perPage);
  };

  const cleanedSorted = sortItems(cleanedFiltered ?? cleaned);
  const rawSorted = sortItems(rawFiltered ?? raw);

  const toggleSelect = (name: string) => setSelected((s) => ({ ...s, [name]: !s[name] }));

  const previewFile = async (item: Item) => {
    setPreviewName(item.name);
    setPreview('Loading…');
    const res = await fetch(`/api/gcs-fetch?bucket=samudriksha&object=${encodeURIComponent(item.name)}&bytes=50000&api_key=seabig-data-key`);
    const j = await res.json();
    setPreview(j.preview || j.error || 'No preview');
  };

  const downloadZip = async () => {
    const objects = Object.keys(selected).filter((k) => selected[k]);
    if (!objects.length) return alert('Select files first');
    const res = await fetch('/api/gcs-zip', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': 'seabig-data-key' }, body: JSON.stringify({ bucket: 'samudriksha', objects }) });
    if (!res.ok) return alert('Zip failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selection.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl font-extrabold">Datasets</h1>
              <p className="text-slate-600 mt-1">Download cleaned and raw species datasets hosted on GCS.</p>
            </div>
            {err && <div className="w-full text-red-600 font-medium">{err}</div>}
            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-500 text-right">
                <div>Cleaned: <span className="font-medium">{cleaned?.length ?? '—'}</span></div>
                <div>Raw: <span className="font-medium">{raw?.length ?? '—'}</span></div>
              </div>
            </div>
          </div>

          <div className="mb-6 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 flex items-center gap-3">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search files, e.g. species, 2024, .csv" className="flex-1 px-4 py-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <select value={sortKey} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortKey(e.target.value as 'name' | 'size' | 'updated')} className="px-3 py-2 border rounded-md">
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="updated">Updated</option>
              </select>
              <select value={sortDir} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortDir(e.target.value as 'asc' | 'desc')} className="px-3 py-2 border rounded-md">
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <a href="https://console.cloud.google.com/storage/browser/samudriksha/marine_species_data" target="_blank" rel="noreferrer" className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm">Open GCS (cleaned)</a>
              <a href="https://console.cloud.google.com/storage/browser/samudriksha/raw_data" target="_blank" rel="noreferrer" className="px-4 py-2 bg-gray-800 text-white rounded-md text-sm">Open GCS (raw)</a>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">Cleaned datasets</h3>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                {!cleaned && <div className="text-sm text-slate-500">Loading…</div>}
                {cleaned && cleaned.length === 0 && <div className="text-sm text-slate-500">No cleaned files found.</div>}
                {cleanedSorted && cleanedSorted.length > 0 && (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-slate-500">Showing {cleanedSorted.length} files</div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setSelected({}); }} className="text-sm text-slate-500">Clear selection</button>
                        <button onClick={downloadZip} className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm">Download selected</button>
                      </div>
                    </div>
                    <ul className="divide-y">
                      {(paginated(cleanedSorted) || []).map((it) => (
                        <li key={it.name} className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <input type="checkbox" checked={!!selected[it.name]} onChange={() => toggleSelect(it.name)} className="w-4 h-4" />
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm font-semibold text-indigo-600 border">F</div>
                            <div>
                              <a href={it.url} className="font-medium text-slate-900 hover:underline" target="_blank" rel="noreferrer">{it.name}</a>
                              <div className="text-xs text-slate-500">{it.updated ? new Date(it.updated).toLocaleString() : ''}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-slate-500">{formatSize(it.size)}</div>
                            <button onClick={() => previewFile(it)} className="px-2 py-1 border rounded-md text-sm">Preview</button>
                            <a href={it.url} className="px-3 py-1 rounded-md bg-indigo-600 text-white text-sm" target="_blank" rel="noreferrer">Download</a>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-sm text-slate-500">Page {page}</div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPage(Math.max(1, page - 1))} className="px-2 py-1 border rounded">Prev</button>
                        <button onClick={() => setPage(page + 1)} className="px-2 py-1 border rounded">Next</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Raw datasets</h3>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                {!raw && <div className="text-sm text-slate-500">Loading…</div>}
                {raw && raw.length === 0 && <div className="text-sm text-slate-500">No raw files found.</div>}
                {rawSorted && rawSorted.length > 0 && (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-slate-500">Showing {rawSorted.length} files</div>
                    </div>
                    <ul className="divide-y">
                      {(paginated(rawSorted) || []).map((it) => (
                        <li key={it.name} className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <input type="checkbox" checked={!!selected[it.name]} onChange={() => toggleSelect(it.name)} className="w-4 h-4" />
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm font-semibold text-emerald-600 border">R</div>
                            <div>
                              <a href={it.url} className="font-medium text-slate-900 hover:underline" target="_blank" rel="noreferrer">{it.name}</a>
                              <div className="text-xs text-slate-500">{it.updated ? new Date(it.updated).toLocaleString() : ''}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-slate-500">{formatSize(it.size)}</div>
                            <button onClick={() => previewFile(it)} className="px-2 py-1 border rounded-md text-sm">Preview</button>
                            <a href={it.url} className="px-3 py-1 rounded-md bg-gray-800 text-white text-sm" target="_blank" rel="noreferrer">Download</a>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-sm text-slate-500">Page {page}</div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPage(Math.max(1, page - 1))} className="px-2 py-1 border rounded">Prev</button>
                        <button onClick={() => setPage(page + 1)} className="px-2 py-1 border rounded">Next</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
      {/* Preview drawer/modal */}
  {preview !== null && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none">
          <button aria-label="Close preview" onClick={() => { setPreview(null); setPreviewName(null); }} className="bg-black/40 absolute inset-0 focus:outline-none" />
          <div className="relative pointer-events-auto bg-white rounded-t-lg md:rounded-lg max-w-3xl w-full m-4 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Preview: {previewName}</div>
              <button onClick={() => { setPreview(null); setPreviewName(null); }} className="text-sm text-slate-500">Close</button>
            </div>
            <div className="max-h-[60vh] overflow-auto text-xs whitespace-pre-wrap font-mono text-slate-800">{preview}</div>
          </div>
        </div>
      )}
    </>
  );
}
