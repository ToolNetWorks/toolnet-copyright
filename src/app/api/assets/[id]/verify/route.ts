import { deny, isAdmin, requireSameOrigin } from '@/lib/auth';
import { audit, database, getAsset } from '@/lib/db';
import { discardStaging, generateImagePreview, headObject, moveToVault, sha256FromR2 } from '@/lib/r2';
import { validateObjectSignature } from '@/lib/file-signatures';
import { uuid } from '@/lib/validation';
export const runtime = 'nodejs';
export const maxDuration = 300;
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return deny();
  if (!(await requireSameOrigin(request))) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) return Response.json({ error: 'Invalid id' }, { status: 400 });
  const asset = await getAsset(parsed.data).catch(() => null);
  if (!asset) return Response.json({ error: 'Not found' }, { status: 404 });
  if (!['pending_verification', 'verification_failed'].includes(asset.status)) return Response.json({ error: 'Asset not ready for verification' }, { status: 409 });
  try {
    const source = await headObject(asset.staging_key);
    if (Number(source.ContentLength) !== Number(asset.size_bytes) || source.ContentType !== asset.mime_type) {
      return Response.json({ error: 'Object size or type changed' }, { status: 422 });
    }
    if (!(await validateObjectSignature(asset.staging_key, asset.mime_type))) return Response.json({ error: 'File signature does not match declared type' }, { status: 422 });
    const firstHash = await sha256FromR2(asset.staging_key);
    const vaultKey = `vault/${asset.id}/${firstHash}`;
    await moveToVault(asset.staging_key, vaultKey);
    const verifiedHash = await sha256FromR2(vaultKey);
    if (firstHash !== verifiedHash) {
      await audit(asset.id, 'verification_mismatch', { source_hash: firstHash, vault_hash: verifiedHash });
      return Response.json({ error: 'Source changed during verification; upload again' }, { status: 409 });
    }
    let previewKey: string | null = null;
    if (asset.media_type === 'image') previewKey = await generateImagePreview(vaultKey, `previews/${asset.id}.webp`);
    const sql = database();
    const updated = await sql`UPDATE assets SET vault_key=${vaultKey}, preview_key=${previewKey},sha256=${verifiedHash}, status='verified',verified_at=now() WHERE id=${asset.id}::uuid AND status IN ('pending_verification','verification_failed') RETURNING id`;
    if (!updated.length) return Response.json({ error: 'Asset status changed' }, { status: 409 });
    await audit(asset.id, 'integrity_verified', { sha256: verifiedHash, size: Number(source.ContentLength) });
    await discardStaging(asset.staging_key).catch(() => console.warn('Staging object cleanup needed:', asset.id));
    return Response.json({ success: true, sha256: verifiedHash });
  } catch (error) {
    console.error('Verification failed:', error);
    return Response.json({ error: 'Verification unavailable; retry later' }, { status: 503 });
  }
}
