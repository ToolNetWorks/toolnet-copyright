import { z } from 'zod';
import { deny, isAdmin, requireSameOrigin } from '@/lib/auth';
import { database, getAsset, audit } from '@/lib/db';
import { headObject, generateImagePreview } from '@/lib/r2';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!(await isAdmin())) return deny();
  if (!(await requireSameOrigin(request))) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const parsed = z.object({ id: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid asset id' }, { status: 400 });
  const asset = await getAsset(parsed.data.id).catch(() => null);
  if (!asset) return Response.json({ error: 'Asset not found' }, { status: 404 });
  if (asset.status !== 'upload_pending') return Response.json({ error: 'Upload already finalized' }, { status: 409 });
  try {
    const head = await headObject(asset.staging_key);
    if (Number(head.ContentLength) !== Number(asset.size_bytes) || head.ContentType !== asset.mime_type) {
      return Response.json({ error: 'Uploaded object does not match declared type or size' }, { status: 422 });
    }
    // Preview is derived from staging for optional Tumblr publication BEFORE user SHA verification.
    // It is not publicly accessible until a post is explicitly sent to Tumblr.
    const previewKey = asset.media_type === 'image'
      ? await generateImagePreview(asset.staging_key, `previews/${asset.id}.webp`)
      : null;
    const sql = database();
    await sql`UPDATE assets SET status='pending_verification', preview_key=${previewKey}
      WHERE id=${asset.id}::uuid AND status='upload_pending'`;
    await audit(asset.id, 'upload_received', {
      size: Number(head.ContentLength), type: head.ContentType,
      staged_preview: Boolean(previewKey), verified: false,
    });
    return Response.json({ success: true, status: 'pending_verification', tumblrPreviewReady: Boolean(previewKey) });
  } catch (error) {
    console.error('Upload complete failed:', error);
    return Response.json({ error: 'Could not verify uploaded object' }, { status: 503 });
  }
}
