"use client";

import { useState } from 'react';

type DatasetItem = { name: string; url: string; size?: string; updated?: string };
type DatasetResponse = { cleaned: DatasetItem[]; raw: DatasetItem[] };

export default function OccurrenceServicesPage() {
  const [data, setData] = useState<DatasetResponse | null>(null);
  // loading state removed (not used)
  const [err, setErr] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);

  const fetchDatasets = async () => {
    setErr(null);
    try {
      const headers: Record<string, string> = {};
      if (apiKey) headers['x-api-key'] = apiKey;
      const res = await fetch('/api/datasets', { headers });
      if (!res.ok) {
        const t = await res.text();
        setErr(`Error: ${res.status} ${t}`);
        return;
      }
      const j = await res.json();
      setData(j);
    } catch {
      setErr('Fetch failed');
    }
  };

  const previewFile = async (item: DatasetItem) => {
    setPreviewName(item.name);
    setPreviewText('Loading…');
    try {
      const headers: Record<string, string> = {};
      if (apiKey) headers['x-api-key'] = apiKey;
      const res = await fetch(`/api/gcs-fetch?bucket=samudriksha&object=${encodeURIComponent(item.name)}&bytes=20000`, { headers });
      if (!res.ok) {
        setPreviewText(`Preview failed: ${res.status}`);
        return;
      }
      const j = await res.json();
      setPreviewText(j.preview || j.error || 'No preview');
    } catch {
      setPreviewText('Preview failed');
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900">Occurrence APIs</h1>
          <p className="text-slate-600 mt-1">Programmatic access to cleaned and raw species datasets. Use the APIs below to list files, preview content, and integrate datasets into pipelines.</p>
        </header>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label htmlFor="api-key" className="text-sm text-slate-500">API key</label>
            <input id="api-key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste your API key (x-api-key)" className="w-full mt-1 px-3 py-2 border rounded-md" />
          </div>
          <div className="flex gap-2">
            <button onClick={fetchDatasets} className="px-4 py-2 bg-indigo-600 text-white rounded-md">List datasets</button>
            <button onClick={() => { setData(null); setPreviewText(null); setErr(null); }} className="px-4 py-2 border rounded-md">Reset</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold">Cleaned datasets</h3>
            <p className="text-sm text-slate-500 mb-3">Curated and cleaned CSV/GeoJSON files ready for analysis.</p>
            <div className="flex gap-2 mb-3 items-center">
              <code className="px-2 py-1 bg-white border rounded text-sm">GET /api/datasets</code>
              <button onClick={() => { navigator.clipboard?.writeText('/api/datasets'); }} className="px-2 py-1 border rounded text-sm">Copy</button>
              <button onClick={fetchDatasets} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Fetch</button>
            </div>
            <div className="space-y-2 max-h-64 overflow-auto">
              {data?.cleaned?.length ? data.cleaned.map((it) => (
                <div key={it.name} className="flex items-center justify-between bg-white p-2 rounded">
                  <div>
                    <div className="font-medium text-sm text-slate-900">{it.name.split('/').pop()}</div>
                    <div className="text-xs text-slate-500">{it.updated ? new Date(it.updated).toLocaleString() : ''} · {it.size ? `${(Number(it.size) / 1024).toFixed(1)} KB` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { navigator.clipboard?.writeText(it.url); }} className="text-sm px-2 py-1 border rounded">Copy URL</button>
                    <button onClick={() => previewFile(it)} className="text-sm px-2 py-1 border rounded">Preview</button>
                    <button onClick={async () => {
                      try {
                        const res = await fetch(`/api/gcs-download?object=${encodeURIComponent(it.name)}`, { headers: apiKey ? { 'x-api-key': apiKey } : {} });
                        if (!res.ok) return setErr('Download failed');
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = it.name.split('/').pop() || 'file';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      } catch {
                        setErr('Download failed');
                      }
                    }} className="text-sm px-2 py-1 bg-indigo-600 text-white rounded">Download</button>
                  </div>
                </div>
              )) : <div className="text-sm text-slate-500">No cleaned files loaded.</div>}
            </div>
          </div>

          <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold">Raw datasets</h3>
            <p className="text-sm text-slate-500 mb-3">Raw exports as uploaded — useful for re-processing or debugging.</p>
            <div className="flex gap-2 mb-3 items-center">
              <code className="px-2 py-1 bg-white border rounded text-sm">GET /api/datasets?raw</code>
              <button onClick={() => { navigator.clipboard?.writeText('/api/datasets?raw'); }} className="px-2 py-1 border rounded text-sm">Copy</button>
              <button onClick={fetchDatasets} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Fetch</button>
            </div>
            <div className="space-y-2 max-h-64 overflow-auto">
              {data?.raw?.length ? data.raw.map((it) => (
                <div key={it.name} className="flex items-center justify-between bg-white p-2 rounded">
                  <div>
                    <div className="font-medium text-sm text-slate-900">{it.name.split('/').pop()}</div>
                    <div className="text-xs text-slate-500">{it.updated ? new Date(it.updated).toLocaleString() : ''} · {it.size ? `${(Number(it.size) / 1024).toFixed(1)} KB` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { navigator.clipboard?.writeText(it.url); }} className="text-sm px-2 py-1 border rounded">Copy URL</button>
                    <button onClick={() => previewFile(it)} className="text-sm px-2 py-1 border rounded">Preview</button>
                    <button onClick={async () => {
                      try {
                        const res = await fetch(`/api/gcs-download?object=${encodeURIComponent(it.name)}`, { headers: apiKey ? { 'x-api-key': apiKey } : {} });
                        if (!res.ok) return setErr('Download failed');
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = it.name.split('/').pop() || 'file';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      } catch {
                        setErr('Download failed');
                      }
                    }} className="text-sm px-2 py-1 bg-gray-800 text-white rounded">Download</button>
                  </div>
                </div>
              )) : <div className="text-sm text-slate-500">No raw files loaded.</div>}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h4 className="font-semibold">Preview</h4>
            <div className="mt-2 p-4 bg-white border rounded max-h-80 overflow-auto text-xs font-mono whitespace-pre-wrap">{previewName ? <><div className="text-sm font-medium mb-2">{previewName}</div><div>{previewText}</div></> : <div className="text-sm text-slate-500">Select a file to preview its top rows.</div>}</div>
          </div>
          <div>
            <h4 className="font-semibold">Examples</h4>
            <div className="mt-2 bg-white p-3 border rounded text-sm">
              <div className="mb-2"><strong>List datasets</strong><div className="text-xs text-slate-500">GET /api/datasets — add header x-api-key</div></div>
              <div className="mb-2"><strong>Preview file</strong><div className="text-xs text-slate-500">GET /api/gcs-fetch?bucket=samudriksha&object=PATH_TO_FILE&bytes=20000</div></div>
              <div className="mb-2"><strong>Download</strong><div className="text-xs text-slate-500">https://storage.googleapis.com/samudriksha/PATH_TO_FILE</div></div>
            </div>
          </div>
        </div>

        {err && <div className="mt-4 text-red-600">{err}</div>}
      </div>
    </main>
  );
}
