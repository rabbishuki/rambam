// Cloudflare Worker — Rambam Sync
// KV namespace: SYNC_STORE (bound in wrangler.toml)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// Rate limit: 10 GET requests per minute per IP
async function checkRateLimit(env, ip) {
  const key = `ratelimit:${ip}:${Math.floor(Date.now() / 60000)}`;
  const current = await env.SYNC_STORE.get(key);
  const count = current ? parseInt(current) : 0;
  if (count >= 10) return false;
  await env.SYNC_STORE.put(key, String(count + 1), { expirationTtl: 120 });
  return true;
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // POST /sync — push snapshot
    if (method === 'POST' && url.pathname === '/sync') {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'invalid_json' }, 400);
      }

      const { data, lastUpdated, existingCode } = body;

      if (!data || !lastUpdated) {
        return jsonResponse({ error: 'missing_fields' }, 400);
      }

      const payload = JSON.stringify({ data, lastUpdated, createdAt: new Date().toISOString() });

      // If existingCode provided and exists in KV, overwrite it
      if (existingCode) {
        const existing = await env.SYNC_STORE.get(String(existingCode));
        if (existing) {
          await env.SYNC_STORE.put(String(existingCode), payload);
          return jsonResponse({ code: String(existingCode) });
        }
      }

      // Generate a unique new code
      let code;
      let attempts = 0;
      do {
        code = generateCode();
        const collision = await env.SYNC_STORE.get(code);
        if (!collision) break;
        attempts++;
      } while (attempts < 10);

      await env.SYNC_STORE.put(code, payload);
      return jsonResponse({ code });
    }

    // GET /sync/:code — pull snapshot
    const getMatch = url.pathname.match(/^\/sync\/(\d{6})$/);
    if (method === 'GET' && getMatch) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const allowed = await checkRateLimit(env, ip);
      if (!allowed) {
        return jsonResponse({ error: 'rate_limited' }, 429);
      }

      const code = getMatch[1];
      const stored = await env.SYNC_STORE.get(code);
      if (!stored) {
        return jsonResponse({ error: 'not_found' }, 404);
      }

      const { data, lastUpdated } = JSON.parse(stored);
      return jsonResponse({ data, lastUpdated });
    }

    return jsonResponse({ error: 'not_found' }, 404);
  },
};
