# RunPacer Strava backend

Vercel functions exchange and refresh Strava OAuth tokens. `STRAVA_CLIENT_SECRET`
must be configured only as a Vercel environment variable; it must never be
embedded in the iOS/web bundle or committed here.

Required environment variables:

- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`

Optional `ALLOWED_ORIGINS` is a comma-separated allowlist. Its default accepts
`capacitor://localhost`, `https://runpacer.app`, and
`https://www.runpacer.app`. Update it to the actual production web origins
before deployment.

The functions reject non-POST methods, non-JSON or oversized requests, bound
credential input lengths, time out upstream calls, and return only OAuth fields
the client needs. The included per-IP limiter is best-effort per warm Vercel
instance. Production should also enable a Vercel Firewall rate-limit rule (or a
shared durable limiter) because in-memory counters are not global across
serverless instances.
