import { allowRequest, applyCors, cleanTokenResponse, isSmallJsonRequest, postToStrava, requestIp } from './_security.js';

export default async function handler(req, res) {
  if (!applyCors(req, res)) return res.status(403).json({ error: 'Origin not allowed' });
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isSmallJsonRequest(req)) return res.status(415).json({ error: 'Small JSON body required' });
  if (!allowRequest(`exchange:${requestIp(req)}`)) return res.status(429).json({ error: 'Too many requests' });

  try {
    const { code } = req.body || {};
    if (typeof code !== 'string' || !code.trim() || code.length > 512) return res.status(400).json({ error: 'Invalid code' });
    if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) return res.status(503).json({ error: 'Service unavailable' });

    const r = await postToStrava({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code: code.trim(),
      grant_type: 'authorization_code'
    });

    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'Strava rejected the authorization code' });
    return res.status(200).json(cleanTokenResponse(data));
  } catch (e) {
    console.error('[strava-token]', e instanceof Error ? e.message : 'request failed');
    return res.status(500).json({ error: 'Token exchange failed' });
  }
}
