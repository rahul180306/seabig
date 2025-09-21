import { NextResponse } from 'next/server';
import { requireApiKey } from '../../../lib/requireApiKey';

export async function GET(req: Request) {
  const bad = requireApiKey(req);
  if (bad) return bad;

  const url = new URL(req.url);
  const object = url.searchParams.get('object');
  if (!object) return NextResponse.json({ error: 'missing object' }, { status: 400 });

  // proxy the public GCS object and stream it back to the client
  const gcsUrl = `https://storage.googleapis.com/samudriksha/${object}`;
  try {
    const res = await fetch(gcsUrl);
    if (!res.ok) return NextResponse.json({ error: 'gcs fetch failed' }, { status: 502 });
    const headers: Record<string, string> = {};
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    headers['Content-Type'] = contentType;
    headers['Content-Disposition'] = `attachment; filename="${object.split('/').pop()}"`;
    const body = await res.arrayBuffer();
    return new NextResponse(body, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
