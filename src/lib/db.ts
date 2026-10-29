import { neon } from '@neondatabase/serverless';
import { requireEnv } from './config';

export function database() {
  return neon(requireEnv('DATABASE_URL'));
}

export type Asset = {
  id: string; title: string; description: string; owner_name: string; owner_basis: string;
  media_type: 'image' | 'video'; original_filename: string; mime_type: string;
  size_bytes: number; staging_key: string; vault_key: string | null; preview_key: string | null; preview_sha256: string | null;
  sha256: string | null; status: 'upload_pending' | 'pending_verification' | 'verified' | 'verification_failed';
  is_public: boolean; published_at: string | null; created_at: string; verified_at: string | null;
  original_created_at: string | null;
  original_captured_at: string | null;
  original_published_at: string | null;
  copyright_effective_at: string | null;
  time_claim_source: string | null;
  time_claim_reference: string | null;
  time_claim_version: number;
  time_claim_updated_at: string | null;
};

export type CopyrightCase = {
  id: string; asset_id: string; asset_title: string; platform: string; reported_url: string;
  status: string; notes: string; created_at: string;
};

export async function getAsset(id: string): Promise<Asset | null> {
  const sql = database();
  const records = await sql`SELECT * FROM assets WHERE id = ${id}::uuid`;
  return (records[0] as Asset | undefined) ?? null;
}

export async function audit(assetId: string, action: string, details: Record<string, unknown> = {}) {
  const sql = database();
  await sql`SELECT append_evidence_event(${assetId}::uuid, ${action}, ${JSON.stringify(details)}::jsonb)`;
}

export async function publicAssets(limit = 60): Promise<Asset[]> {
  const sql = database();
  return (await sql`SELECT * FROM assets WHERE is_public = true AND status='verified' ORDER BY published_at DESC LIMIT ${limit}`) as Asset[];
}
