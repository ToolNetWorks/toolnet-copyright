import { getAsset } from '@/lib/db';
import { signedDownload } from '@/lib/r2';
import { uuid } from '@/lib/validation';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = uuid.safeParse((await params).id);
  if (!id.success) return Response.json({ error: 'Not found' }, { status: 404 });
  const asset = await getAsset(id.data).catch(() => null);
  if (!asset?.is_public || asset.status !== 'verified') return Response.json({ error: 'Not found' }, { status: 404 });
  const key = asset.preview_key;
  if (!key) return Response.json({ error: 'Preview unavailable' }, { status: 404 });
  return Response.redirect(await signedDownload(key, true, 600), 302);
}
