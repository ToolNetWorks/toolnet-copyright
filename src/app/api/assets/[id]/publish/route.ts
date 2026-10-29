import { deny, isAdmin, requireSameOrigin } from '@/lib/auth';
import { audit, database, getAsset } from '@/lib/db';
import { uuid } from '@/lib/validation';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return deny();
  if (!(await requireSameOrigin(request))) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) return Response.json({ error: 'Invalid id' }, { status: 400 });
  const asset = await getAsset(parsed.data).catch(() => null);
  if (!asset) return Response.json({ error: 'Asset not found' }, { status: 404 });
  if (asset.status !== 'verified' || !asset.vault_key || !asset.preview_key) return Response.json({ error: 'Verify integrity and provide a separate public preview before publication' }, { status: 409 });
  const sql = database();
  await sql`UPDATE assets SET is_public=true,published_at=coalesce(published_at,now()) WHERE id=${asset.id}::uuid`;
  await audit(asset.id, 'publicly_published', { title: asset.title });
  return Response.json({ success: true });
}
