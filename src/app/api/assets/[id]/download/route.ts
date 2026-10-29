import { deny, isAdmin } from '@/lib/auth';
import { getAsset } from '@/lib/db';
import { signedDownload } from '@/lib/r2';
import { uuid } from '@/lib/validation';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return deny();
  const id = uuid.safeParse((await params).id);
  if (!id.success) return Response.json({ error: 'Invalid id' }, { status: 400 });
  const asset = await getAsset(id.data).catch(() => null);
  if (!asset?.vault_key) return Response.json({ error: 'Verified original unavailable' }, { status: 404 });
  return Response.redirect(await signedDownload(asset.vault_key), 302);
}
