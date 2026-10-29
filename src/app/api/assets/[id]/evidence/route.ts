import { deny, isAdmin } from '@/lib/auth';
import { database, getAsset } from '@/lib/db';
import { uuid } from '@/lib/validation';
export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return deny();
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) return Response.json({ error: 'Invalid id' }, { status: 400 });
  const asset = await getAsset(parsed.data).catch(() => null);
  if (!asset) return Response.json({ error: 'Not found' }, { status: 404 });
  const sql = database();
  const [events, cases, claimRevisions, tumblrPublications] = await Promise.all([
    sql`SELECT id, asset_id, event_type,details,previous_hash,event_hash,occurred_at FROM evidence_events WHERE asset_id=${asset.id}::uuid ORDER BY occurred_at,id`,
    sql`SELECT id, platform,reported_url,status,notes,created_at FROM infringement_cases WHERE asset_id=${asset.id}::uuid ORDER BY created_at`,
    sql`SELECT * FROM asset_time_claim_versions WHERE asset_id=${asset.id}::uuid ORDER BY version`,
    sql`SELECT blog,status,tumblr_post_id,tumblr_url,requested_at,published_at,
      displayed_at_requested,displayed_at_confirmed FROM tumblr_publications WHERE asset_id=${asset.id}::uuid`
  ]);
  const manifest = {
    format: 'toolnet-copyright-evidence-v3', exported_at: new Date().toISOString(),
    notice: 'Owner-declared dates and Tumblr backdated display dates are NOT independent evidence of historical creation or publication. Tumblr requested_at and published_at are the actual ToolNet operation times. File SHA-256 certifies file integrity only, not copyright ownership.',
    asset: { id: asset.id, title: asset.title, description: asset.description, owner_name: asset.owner_name,
      owner_basis: asset.owner_basis, original_filename: asset.original_filename, media_type: asset.media_type,
      mime_type: asset.mime_type, size_bytes: asset.size_bytes, sha256: asset.sha256, status: asset.status,
      created_at: asset.created_at, verified_at: asset.verified_at, published_at: asset.published_at,
      original_created_at_claimed: asset.original_created_at,
      original_captured_at_claimed: asset.original_captured_at,
      original_published_at_claimed: asset.original_published_at,
      copyright_effective_at_claimed: asset.copyright_effective_at,
      time_claim_source: asset.time_claim_source, time_claim_reference: asset.time_claim_reference,
      time_claim_version: asset.time_claim_version, time_claim_updated_at: asset.time_claim_updated_at,
      public_url: asset.is_public ? `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/works/${asset.id}` : null },
    timeline: events, time_claim_revisions: claimRevisions, tumblr_publications: tumblrPublications, infringement_cases: cases
  };
  return new Response(JSON.stringify(manifest, null, 2), { headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="evidence-${asset.id}.json"`,
    'Cache-Control': 'no-store'
  }});
}
