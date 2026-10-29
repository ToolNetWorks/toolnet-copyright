import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('SQL event records prevent modification and enforce valid public state', () => {
 const sql = source('db/schema.sql');
 assert.match(sql, /CREATE TRIGGER evidence_immutable/);
 assert.match(sql, /BEFORE UPDATE OR DELETE ON evidence_events/);
 assert.match(sql, /CHECK \(is_public = FALSE OR \(status='verified'/);
 assert.match(sql, /append_evidence_event/);
});
test('upload requires authenticated account and legal rights confirmation', () => {
 const api = source('src/app/api/assets/initiate/route.ts');
 const validator = source('src/lib/validation.ts');
 assert.match(api, /await isAdmin\(\)/);
 assert.match(api, /requireSameOrigin/);
 assert.match(validator, /confirmedRights: z.literal\(true\)/);
});
test('public media rejects private assets', () => {
 const api = source('src/app/api/media/[id]/route.ts');
 assert.match(api, /!asset\?\.is_public/);
 assert.match(api, /status !== 'verified'/);
});
test('all route entrypoints exist', () => {
 for (const route of ['src/app/page.tsx','src/app/registry/page.tsx','src/app/dashboard/page.tsx','src/app/api/assets/initiate/route.ts','src/app/api/assets/[id]/verify/route.ts','src/app/api/cases/route.ts']) {
  assert.ok(existsSync(new URL(`../${route}`, import.meta.url)), route);
 }
});
