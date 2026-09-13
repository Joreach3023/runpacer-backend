const buckets = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

const configuredOrigins = (process.env.ALLOWED_ORIGINS || 'capacitor://localhost,https://runpacer.app,https://www.runpacer.app')
  .split(',').map(value => value.trim()).filter(Boolean);
const allowedOrigins = new Set(configuredOrigins);

export function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) return false;
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
  return true;
}

export function requestIp(req) {
  return String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim().slice(0, 128);
}

export function allowRequest(key, now = Date.now()) {
  const recent = (buckets.get(key) || []).filter(timestamp => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 5_000) {
    for (const [bucketKey, timestamps] of buckets) {
      if (!timestamps.some(timestamp => now - timestamp < WINDOW_MS)) buckets.delete(bucketKey);
    }
  }
  return true;
}

export function isSmallJsonRequest(req, maxBytes = 2048) {
  const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const length = Number(req.headers['content-length'] || 0);
  return type === 'application/json' && Number.isFinite(length) && length <= maxBytes;
}

export function cleanTokenResponse(data) {
  const athlete = data?.athlete && typeof data.athlete === 'object' ? {
    id: data.athlete.id,
    username: data.athlete.username,
    firstname: data.athlete.firstname,
    lastname: data.athlete.lastname,
    profile: data.athlete.profile,
    profile_medium: data.athlete.profile_medium
  } : undefined;
  return {
    token_type: data?.token_type,
    expires_at: data?.expires_at,
    expires_in: data?.expires_in,
    refresh_token: data?.refresh_token,
    access_token: data?.access_token,
    ...(athlete ? { athlete } : {})
  };
}

export async function postToStrava(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}
