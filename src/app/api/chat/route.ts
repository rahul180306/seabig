import { NextResponse } from 'next/server';

type Body = { message?: string };

async function callGenericUpstream(url: string, apiKey: string, message: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ prompt: message }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '<no-body>');
    console.error('upstream non-ok', { url, status: res.status, body: txt.slice ? txt.slice(0, 2000) : String(txt) });
    throw new Error(`upstream ${res.status}: ${String(txt).slice(0,200)}`);
  }
  const json = await res.json();
  return json.reply ?? JSON.stringify(json);
}

async function callGoogleModel(key: string, model: string, message: string) {
  // Select URL and headers (service-account vs. key) in a helper to reduce complexity.
  const bodyPayload = { prompt: { text: message }, temperature: 0.2, candidateCount: 1 };

  async function prepareRequest() {
    const useServiceAccount = !!(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS);
    const urlBase = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateText`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let url = urlBase;
    if (useServiceAccount) {
      const token = await getGoogleAccessToken();
      headers.Authorization = `Bearer ${token}`;
    } else {
      url = `${urlBase}?key=${encodeURIComponent(key)}`;
    }
    return { url, headers };
  }

  const { url, headers } = await prepareRequest();
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(bodyPayload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '<no-body>');
    console.error('google upstream non-ok', { url, status: res.status, body: txt.slice ? txt.slice(0, 2000) : String(txt) });
    // If the model was not found, try Vertex publisher endpoint as a fallback (requires an API key).
    if (res.status === 404) {
      const fallbackKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (fallbackKey) {
        console.debug('model not found on generativelanguage v1; trying Vertex publisher fallback', { model });
        try {
          return await callVertexAI(fallbackKey, model, message);
        } catch (fallbackErr) {
          console.error('vertex fallback failed', fallbackErr);
          throw fallbackErr;
        }
      }
    }
    throw new Error(`google upstream ${res.status}: ${String(txt).slice(0,200)}`);
  }
  const json = await res.json();
  const candidate = json?.candidates?.[0];
  if (candidate) return candidate?.content ?? candidate?.output ?? JSON.stringify(candidate);
  const out0 = json?.output?.[0];
  if (out0) return out0?.content ?? JSON.stringify(out0);
  return JSON.stringify(json);
}

// Minimal service-account JWT flow to obtain an access token for Google Cloud APIs.
// Expects either GOOGLE_SERVICE_ACCOUNT_KEY (JSON string) or GOOGLE_APPLICATION_CREDENTIALS (path to file).
let _cachedToken: { token: string; expiresAt: number } | null = null;
async function getGoogleAccessToken() {
  if (_cachedToken && Date.now() < _cachedToken.expiresAt - 60_000) return _cachedToken.token;

  type SAKey = { private_key: string; client_email: string };
  let keyJson: unknown = null;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      keyJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    } catch {
      throw new Error('invalid GOOGLE_SERVICE_ACCOUNT_KEY JSON');
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const fs = await import('fs');
    const p = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const raw = fs.readFileSync(p, 'utf8');
    keyJson = JSON.parse(raw);
  } else {
    throw new Error('no service account credentials configured');
  }

  if (!keyJson || typeof keyJson !== 'object') throw new Error('service account key is not an object');
  const maybeSA = keyJson as SAKey;
  if (!maybeSA.private_key || !maybeSA.client_email) throw new Error('service account key missing fields');

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  // Request both cloud-platform and generative language scopes to satisfy Generative Language API
  const scope = 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/generative-language';
  console.debug('requesting google access token', { client_email: maybeSA.client_email, scope });
  const claim = {
    iss: maybeSA.client_email,
    sub: maybeSA.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  function b64(input: string) {
    return Buffer.from(input).toString('base64url');
  }

  const toSign = `${b64(JSON.stringify(header))}.${b64(JSON.stringify(claim))}`;

  // Sign with RSA SHA256 using the private_key
  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(toSign);
  sign.end();
  const signature = sign.sign(maybeSA.private_key, 'base64url');
  const jwt = `${toSign}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(jwt)}`,
  });

  if (!tokenRes.ok) {
    const txt = await tokenRes.text().catch(() => '<no-body>');
    console.error('google token exchange failed', { status: tokenRes.status, body: txt.slice ? txt.slice(0, 2000) : String(txt) });
    throw new Error(`google token exchange ${tokenRes.status}: ${String(txt).slice(0,200)}`);
  }

  const tokenJson = await tokenRes.json();
  const token = tokenJson.access_token;
  const expiresIn = tokenJson.expires_in || 3600;
  _cachedToken = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}

async function callVertexAI(key: string, model: string, message: string) {
  // Call Vertex AI openapi endpoint for DeepSeek or publisher for others.
  // Use non-streaming.
  const useServiceAccount = !!(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS);
  const projectId = 'samudriksha-cloud';
  const region = 'us-central1';
  const endpoint = `${region}-aiplatform.googleapis.com`;

  let url: string;
  let body: unknown;
  if (model.startsWith('deepseek')) {
    url = `https://${endpoint}/v1/projects/${projectId}/locations/${region}/endpoints/openapi/chat/completions`;
    body = {
      model: 'deepseek-ai/deepseek-r1-0528-maas',
      messages: [{ role: 'user', content: message }],
      stream: false,
    };
  } else {
    url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
    body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: message }],
        },
      ],
    };
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (useServiceAccount) {
    const token = await getGoogleAccessToken();
    headers.Authorization = `Bearer ${token}`;
  } else {
    url = `${url}?key=${encodeURIComponent(key)}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '<no-body>');
    console.error('vertex upstream non-ok', { url, status: res.status, body: txt.slice ? txt.slice(0, 2000) : String(txt) });
    throw new Error(`vertex upstream ${res.status}: ${String(txt).slice(0, 1000)}`);
  }

  const json = await res.json().catch(() => null);
  if (model.startsWith('deepseek')) {
    // OpenAI style response
    const choice = json?.choices?.[0];
    if (choice) return choice?.message?.content ?? JSON.stringify(choice);
  } else {
    // Vertex style
    const candidate = json?.candidates?.[0] ?? json?.content?.[0] ?? json?.outputs?.[0];
    if (candidate) return candidate?.text ?? candidate?.content ?? JSON.stringify(candidate);
  }
  return JSON.stringify(json);
}

async function callGemini(apiKey: string, message: string) {
  const geminiUrl = process.env.GEMINI_API_URL;
  const geminiKey = process.env.GEMINI_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY ?? process.env.API_KEY;

  // Optional Vertex AI path (accepts API keys via ?key=). Enable by setting USE_VERTEX=1 and VERTEX_MODEL.
  const useVertex = !!process.env.USE_VERTEX;
  const vertexModel = process.env.VERTEX_MODEL || process.env.GEMINI_MODEL || 'gemini-1.0';

  if (geminiUrl && apiKey === geminiKey) {
    return callGenericUpstream(geminiUrl, apiKey, message);
  }

  if (geminiKey && apiKey === geminiKey) {
    const model = process.env.GEMINI_MODEL || 'gemini-1.0';
    if (useVertex) return callVertexAI(geminiKey, vertexModel, message);
    return callGoogleModel(geminiKey, model, message);
  }

  if (googleKey && apiKey === googleKey) {
    return callGoogleModel(googleKey, 'text-bison-001', message);
  }

  const fallbackUrl = process.env.GEMINI_API_URL || process.env.GENERIC_CHAT_URL || 'https://api.example.com/gemini/v1/chat';
  return callGenericUpstream(fallbackUrl, apiKey, message);
}

function extractErrorMessage(e: unknown) {
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object' && 'message' in e) {
    const maybe = (e as { message?: unknown }).message;
    if (typeof maybe === 'string') return maybe;
  }
  try {
    return String(e);
  } catch {
    return '<unknown error>';
  }
}

export async function POST(req: Request) {
  try {
    const body: Body = await req.json();
    const message = String(body.message || '').trim();
    if (!message) return NextResponse.json({ error: 'missing message' }, { status: 400 });

  // Support either GEMINI_API_KEY (preferred) or a Google-style API key in GOOGLE_API_KEY.
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? process.env.API_KEY;
  if (!apiKey) {
      // Fallback: simple echo for local dev
      return NextResponse.json({ reply: `Echo: ${message}` });
    }

    try {
      const reply = await callGemini(apiKey, message);
      return NextResponse.json({ reply });
    } catch (err: unknown) {
      console.error('Gemini proxy error', err);
      // If the error message contains an upstream status/body snippet, return it for debugging.
      const message = extractErrorMessage(err).slice(0, 1000);
      return NextResponse.json({ error: 'upstream error', details: message }, { status: 502 });
    }
  } catch (err) {
    console.error('chat route invalid body', err);
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
}
