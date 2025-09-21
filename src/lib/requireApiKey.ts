import { NextResponse } from 'next/server';

export function requireApiKey(req: Request) {
  const envKey = process.env.DATA_API_KEY;
  if (!envKey) {
    // In local development allow requests to proceed but warn. In production keep the strict 500 error.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('DATA_API_KEY not set — allowing request in non-production environment');
      return null;
    }
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 });
  }

  // allow key via header 'x-api-key' or query param 'api_key'
  const url = new URL(req.url);
  const qp = url.searchParams.get('api_key');
  const header = (req.headers.get('x-api-key') || req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const supplied = qp || header;
  if (!supplied || supplied !== envKey) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return null;
}
