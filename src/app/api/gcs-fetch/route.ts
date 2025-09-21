import { NextResponse } from 'next/server';
import { requireApiKey } from '../../../lib/requireApiKey';

export async function GET(req: Request) {
  const bad = requireApiKey(req);
  if (bad) return bad;
  const { searchParams } = new URL(req.url);
  const bucket = searchParams.get('bucket');
  const object = searchParams.get('object');
  const bytes = Number(searchParams.get('bytes') || '65536');

  if (!bucket || !object) return NextResponse.json({ error: 'missing params' }, { status: 400 });

  const url = `https://storage.googleapis.com/${bucket}/${object}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: 'fetch failed' }, { status: 502 });
    // read as text but limit bytes client-side by slicing
    const text = await res.text();
    return NextResponse.json({ preview: text.slice(0, bytes) });
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 });
  }
}
