import { randomUUID } from 'node:crypto';
import { deny, isAdmin, requireSameOrigin } from '@/lib/auth';
import { database, audit } from '@/lib/db';
import { signedUpload } from '@/lib/r2';
import { initAssetSchema } from '@/lib/validation';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!(await isAdmin())) return deny();
  if (!(await requireSameOrigin(request))) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const parsed = initAssetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid asset information', details: parsed.error.flatten() }, { status: 400 });
  try {
    const item = parsed.data;
    const id = randomUUID();
    const mediaType = item.mime.startsWith('image/') ? 'image' : 'video';
    const stagingKey = `staging/${id}/${randomUUID()}`;
    const sql = database();
    await sql`INSERT INTO assets (id,title,description,owner_name,owner_basis,original_filename,media_type,mime_type,size_bytes,staging_key)
      VALUES (${id}::uuid,${item.title},${item.description},${item.ownerName},${item.ownerBasis},${item.filename},${mediaType},${item.mime},${item.size},${stagingKey})`;
    await audit(id, 'asset_registered', { title: item.title, owner_basis: item.ownerBasis, size: item.size });
    return Response.json({ id, uploadUrl: await signedUpload(stagingKey, item.mime) });
  } catch (error) {
    console.error('Asset initiate failed:', error);
    return Response.json({ error: 'Unable to initialize upload' }, { status: 503 });
  }
}
