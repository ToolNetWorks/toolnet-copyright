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
  const [events, cases] = await Promise.all([
    sql`SELECT id, asset_id, event_type,details,previous_hash,event_hash,occurred_at FROM evidence_events WHERE asset_id=${asset.id}::uuid ORDER BY occurred_at,id`,
    sql`SELECT id, platform,reported_url,status,notes,created_at FROM infringement_cases WHERE asset_id=${asset.id}::uuid ORDER BY created_at`
  ]);
  const manifest = {
    format: 'toolnet-copyright-evidence-v1', exported_at: new Date().toISOString(),
    notice: 'This is a technical evidence record, not a legal certification of copyright or independently trusted timestamp.',
    asset: { id: asset.id, title: asset.title, description: asset.description, owner_name: asset.owner_name,
      owner_basis: asset.owner_basis, original_filename: asset.original_filename, media_type: asset.media_type,
      mime_type: asset.mime_type, size_bytes: asset.size_bytes, sha256: asset.sha256, status: asset.status,
      created_at: asset.created_at, verified_at: asset.verified_at, published_at: asset.published_at,
      public_url: asset.is_public ? `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/works/${asset.id}` : null },
    timeline: events, infringement_cases: cases
  };
  return new Response(JSON.stringify(manifest, null, 2), { headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="evidence-${asset.id}.json"`,
    'Cache-Control': 'no-store'
  }});
}
