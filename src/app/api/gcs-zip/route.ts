import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { requireApiKey } from '../../../lib/requireApiKey';

export async function POST(req: Request) {
  const bad = requireApiKey(req);
  if (bad) return bad;
  const body = await req.json();
  const { bucket, objects } = body as { bucket?: string; objects?: string[] };
  if (!bucket || !(objects?.length)) return NextResponse.json({ error: 'missing' }, { status: 400 });

  const zip = new JSZip();
  await Promise.all(objects.map(async (obj) => {
    const url = `https://storage.googleapis.com/${bucket}/${obj}`;
    const res = await fetch(url);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      // JSZip accepts ArrayBuffer or Uint8Array for file contents
      zip.file(obj.split('/').pop() || obj, buf);
    }
  }));

  // generate as a Uint8Array so it can be returned directly as a Response body
  const content = await zip.generateAsync({ type: 'uint8array' });
  // return a Blob built from the Uint8Array so it is a valid BodyInit
  // copy into a new ArrayBuffer-backed Uint8Array to avoid SharedArrayBuffer typing
  const copy = new Uint8Array(content.byteLength);
  copy.set(content, 0);
  const blob = new Blob([copy.buffer], { type: 'application/zip' });
  return new NextResponse(blob, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${bucket}-selection.zip"`,
    },
  });
}
