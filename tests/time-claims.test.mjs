import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('migration is additive, claims are revisioned and cannot rewrite event timestamps', () => {
  const sql = source('db/migrations/20261029_asset_time_claims.sql');
  assert.match(sql, /ADD COLUMN IF NOT EXISTS original_created_at TIMESTAMPTZ/);
  assert.match(sql, /asset_time_claim_versions/);
  assert.match(sql, /CREATE TRIGGER time_claim_versions_immutable/);
  assert.match(sql, /BEFORE UPDATE OR DELETE ON asset_time_claim_versions/);
  assert.match(sql, /WHERE id = p_asset_id FOR UPDATE/);
  assert.match(sql, /VERSION_CONFLICT/);
  assert.match(sql, /append_evidence_event\(/);
  assert.doesNotMatch(sql, /SET\s+(created_at|verified_at|published_at|sha256)\s*=/i);
});

test('owner-declared dates cannot bypass admin/origin validation', () => {
  const api = source('src/app/api/assets/[id]/time-claims/route.ts');
  const schema = source('src/lib/time-claims.ts');
  assert.match(api, /await isAdmin\(\)/);
  assert.match(api, /requireSameOrigin\(request\)/);
  assert.match(api, /timeClaimUpdateSchema\.safeParse/);
  assert.match(api, /update_asset_time_claim\(/);
  assert.match(schema, /expectedVersion: z\.number\(\)\.int\(\)\.nonnegative\(\)/);
  assert.match(schema, /correctionReason: z\.string\(\)\.trim\(\)\.min\(10\)/);
  assert.match(schema, /acknowledged: z\.literal\(true\)/);
});

test('public pages identify claimed and server timestamps independently', () => {
  const page = source('src/app/works/[id]/page.tsx');
  assert.match(page, /Ngày sáng tạo gốc \(chủ sở hữu khai báo\)/);
  assert.match(page, /Ngày tải lên ToolNet \(hệ thống ghi nhận\)/);
  assert.match(page, /Ngày xác minh file \(hệ thống ghi nhận\)/);
  assert.match(page, /formatViDate\(asset\.original_created_at\)/);
  assert.match(page, /formatViDate\(asset\.created_at\)/);
});

test('private evidence manifest exports claimed date revisions and system times', () => {
  const evidence = source('src/app/api/assets/[id]/evidence/route.ts');
  assert.match(evidence, /toolnet-copyright-evidence-v3/);
  assert.match(evidence, /time_claim_revisions: claimRevisions/);
  assert.match(evidence, /created_at: asset\.created_at, verified_at: asset\.verified_at/);
  assert.match(evidence, /original_created_at_claimed: asset\.original_created_at/);
});
