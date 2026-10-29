import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('registration-time owner dates are captured before user-triggered SHA verification', () => {
  const form = source('src/components/upload-form.tsx');
  assert.match(form, /asVietnamIso/);
  assert.match(form, /\/time-claims/);
  assert.match(form, /expectedVersion: 0/);
  assert.match(form, /router\.push\('\/dashboard\?uploaded=1'\)/);
  assert.doesNotMatch(form, /fetch\([^\n]*\/verify/);
});

test('Tumblr OAuth only uses server-side credentials and never stores secrets in source', () => {
  const client = source('src/lib/tumblr.ts');
  for (const name of ['TUMBLR_OAUTH_CONSUMER_KEY', 'TUMBLR_SECRET_KEY', 'TUMBLR_TOKEN', 'TUMBLR_TOKEN_SECRET', 'TUMBLR_BLOG']) {
    assert.ok(client.includes(`process.env.${name}`));
  }
  assert.match(client, /createHmac\('sha1'/);
  assert.doesNotMatch(client, /state:\s*'published'[^\n]*date\s*:/);
});

test('publishing requires admin, same-origin, verified and public asset, and prevents duplicate dispatch', () => {
  const route = source('src/app/api/assets/[id]/tumblr/route.ts');
  assert.match(route, /await isAdmin\(\)/);
  assert.match(route, /requireSameOrigin/);
  assert.match(route, /!asset\.is_public/);
  assert.match(route, /status !== 'verified'/);
  assert.match(route, /ON CONFLICT \(asset_id\)/);
  assert.match(route, /uncertain/);
});

test('Tumblr posts never send private vault original and source date is clearly claimed', () => {
  const client = source('src/lib/tumblr.ts');
  assert.match(client, /safePreviewJpeg\(asset\.preview_key\)/);
  assert.match(client, /chủ sở hữu khai báo/);
  assert.match(client, /source_url: workUrl/);
  assert.doesNotMatch(client, /vault_key/);
});

test('Tumblr schema is additive and references original asset', () => {
  const sql = source('db/migrations/20261029_tumblr_publications.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS tumblr_publications/);
  assert.match(sql, /PRIMARY KEY REFERENCES assets\(id\)/);
});
