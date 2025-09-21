import { NextResponse } from 'next/server';
import { requireApiKey } from '../../../lib/requireApiKey';

// Simple server-side proxy to Google Cloud Storage JSON API for public buckets.
// Query params:
//  - bucket (string) required, e.g. 'samudriksha'
//  - prefix (string) optional, e.g. 'marine_species_data/'

export async function GET(req: Request) {
  const bad = requireApiKey(req);
  if (bad) return bad;
  const { searchParams } = new URL(req.url);
  const bucket = searchParams.get('bucket');
  const prefix = searchParams.get('prefix') || '';

  if (!bucket) return NextResponse.json({ error: 'missing bucket' }, { status: 400 });

  const apiUrl = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o?prefix=${encodeURIComponent(prefix)}&fields=items(name,mediaLink,size,updated)`;

  try {
    const res = await fetch(apiUrl);
    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json({ error: 'gcs error', detail: t }, { status: 502 });
    }
    const data = await res.json();
    // normalize items
    const items = (data.items || []).map((it: unknown) => {
      const maybe = it as { name?: string; size?: string; updated?: string };
      return { name: maybe.name || '', url: `https://storage.googleapis.com/${bucket}/${maybe.name || ''}`, size: maybe.size, updated: maybe.updated };
    });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 });
  }
}
