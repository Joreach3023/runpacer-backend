import assert from 'node:assert/strict';
import test from 'node:test';
import { allowRequest, applyCors, cleanTokenResponse, isSmallJsonRequest } from '../api/_security.js';

function response() {
  const headers = new Map();
  return { headers, setHeader(name, value) { headers.set(name, value); } };
}

test('CORS accepts Capacitor and rejects arbitrary origins', () => {
  assert.equal(applyCors({ headers: { origin: 'capacitor://localhost' } }, response()), true);
  assert.equal(applyCors({ headers: { origin: 'https://attacker.invalid' } }, response()), false);
});

test('payload validation requires bounded JSON', () => {
  assert.equal(isSmallJsonRequest({ headers: { 'content-type': 'application/json', 'content-length': '128' } }), true);
  assert.equal(isSmallJsonRequest({ headers: { 'content-type': 'text/plain', 'content-length': '128' } }), false);
  assert.equal(isSmallJsonRequest({ headers: { 'content-type': 'application/json', 'content-length': '9000' } }), false);
});

test('Strava response omits unexpected internal fields', () => {
  const cleaned = cleanTokenResponse({ access_token: 'a', refresh_token: 'r', expires_at: 1, secret: 'omit', athlete: { id: 7, firstname: 'A', private: true } });
  assert.equal(cleaned.access_token, 'a');
  assert.equal(cleaned.secret, undefined);
  assert.equal(cleaned.athlete.private, undefined);
});

test('best-effort per-instance limiter caps bursts', () => {
  const key = `test-${Date.now()}`;
  for (let index = 0; index < 20; index += 1) assert.equal(allowRequest(key, 1000), true);
  assert.equal(allowRequest(key, 1000), false);
  assert.equal(allowRequest(key, 62000), true);
});
