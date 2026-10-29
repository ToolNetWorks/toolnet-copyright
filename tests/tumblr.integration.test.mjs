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
  assert.match(client, /form\.append\('date', new Date\(requestedDisplayDate!/);
});

test('tumblr pre-verification photos require claimed source date and avoid duplicate dispatch', () => {
  const route = source('src/app/api/assets/[id]/tumblr/route.ts');
  assert.match(route, /await isAdmin\(\)/);
  assert.match(route, /requireSameOrigin/);
  assert.match(route, /preverificationPhoto/);
  assert.match(route, /original_created_at/);
  assert.match(route, /ON CONFLICT \(asset_id\)/);
  assert.match(route, /uncertain/);
});

test('Tumblr posts never send private vault original and source date is clearly claimed', () => {
  const client = source('src/lib/tumblr.ts');
  assert.match(client, /safePreviewJpeg\(asset\.preview_key\)/);
  assert.match(client, /chủ sở hữu khai báo/);
  assert.match(client, /source_url: workUrl/);
  assert.match(client, /Ngày gửi bài Tumblr thực tế/);
  assert.doesNotMatch(client, /vault_key/);
});

test('Tumblr schema is additive and references original asset', () => {
  const sql = source('db/migrations/20261029_tumblr_publications.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS tumblr_publications/);
  assert.match(sql, /PRIMARY KEY REFERENCES assets\(id\)/);
});

test('registration dispatches Tumblr only after upload completed and owner date is saved', () => {
  const form = source('src/components/upload-form.tsx');
  assert.ok(form.indexOf('/time-claims') < form.indexOf('/tumblr`'));
  assert.match(form, /isPhoto && !dates.originalCreatedAt/);
  assert.match(form, /setClaimSaved\(true\)/);
});

test('preview is prepared from private staging before user-triggered SHA verification', () => {
  const complete = source('src/app/api/assets/complete/route.ts');
  assert.match(complete, /generateImagePreview\(asset.staging_key/);
  assert.match(complete, /pending_verification/);
  const migration = source('db/migrations/20261029_tumblr_display_dates.sql');
  assert.match(migration, /displayed_at_requested/);
  assert.match(migration, /displayed_at_confirmed/);
});


test('Tumblr post uses user-supplied copyright declaration with correct creation and real signing dates', () => {
  const template = source('src/lib/tumblr-declaration.ts');
  const tumblr = source('src/lib/tumblr.ts');
  const route = source('src/app/api/assets/[id]/tumblr/route.ts');
  const upload = source('src/components/upload-form.tsx');
  assert.match(template, /DECLARATION OF COPYRIGHT OWNERSHIP/);
  assert.match(template, /COPYRIGHT OWNER: copyright-toolnet/);
  assert.match(template, /COUNTRY OF CREATION: Japan/);
  assert.match(template, /EMAIL: toolnet\.official@gmail\.com/);
  assert.match(template, /SIGNATURE: copyright-toolnet/);
  assert.match(template, /DATE OF CREATION \/ PRODUCTION: DD\/MM\/YYYY/);
  assert.match(template, /DATE OF DECLARATION: DD\/MM\/YYYY/);
  assert.match(template, /buildTumblrDeclaration\(createdAt: string, declaredAt: string\)/);
  assert.match(tumblr, /buildTumblrDeclaration\(asset\.original_created_at!, actualSubmissionTime\)/);
  assert.match(route, /confirmation\?\.declarationConfirmed !== true/);
  assert.match(upload, /confirmedDeclaration/);
});
