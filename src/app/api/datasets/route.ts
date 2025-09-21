import { NextResponse } from 'next/server';
import { requireApiKey } from '../../../lib/requireApiKey';

export async function GET(req: Request) {
  const bad = requireApiKey(req);
  if (bad) return bad;

  const bucket = 'samudriksha';
  const prefixes = { cleaned: 'marine_species_data/', raw: 'raw_data/' };

  try {
    const [cleanRes, rawRes] = await Promise.all([
      fetch(`https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=${encodeURIComponent(prefixes.cleaned)}&fields=items(name,mediaLink,size,updated)`),
      fetch(`https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=${encodeURIComponent(prefixes.raw)}&fields=items(name,mediaLink,size,updated)`),
    ]);
    if (!cleanRes.ok || !rawRes.ok) return NextResponse.json({ error: 'gcs error' }, { status: 502 });
    const cleanJson = await cleanRes.json();
    const rawJson = await rawRes.json();
    const normalize = (data: unknown) => {
      const d = data as { items?: Array<{ name?: string; size?: string; updated?: string }> };
      return (d.items || []).map((it) => ({ name: it.name || '', url: `https://storage.googleapis.com/${bucket}/${it.name || ''}`, size: it.size, updated: it.updated }));
    };
    return NextResponse.json({ cleaned: normalize(cleanJson), raw: normalize(rawJson) });
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 });
  }
}
