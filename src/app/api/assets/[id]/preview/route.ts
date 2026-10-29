import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { isAdmin, requireSameOrigin } from '@/lib/auth';
import { database, getAsset, audit } from '@/lib/db';
import { signedUpload, headObject, moveToVault, sha256FromR2, discardStaging } from '@/lib/r2';
import { validateObjectSignature } from '@/lib/file-signatures';
import { uuid } from '@/lib/validation';
export const runtime = 'nodejs';
export const maxDuration = 300;
const schema = z.object({ mime: z.enum(['video/mp4','video/webm']), size: z.number().int().positive().max(50 * 1024 * 1024) });
async function eligible(request: Request, id: string) {
  if (!(await isAdmin())) return 'Unauthorized';
  if (!(await requireSameOrigin(request))) return 'Invalid origin';
  if (!uuid.safeParse(id).success) return 'Invalid id';
  return null;
}
export async function POST(request: Request, {params}: {params: Promise<{id:string}>}) {
  const id = (await params).id;
  const denied = await eligible(request, id);
  if (denied) return Response.json({error:denied},{status:403});
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({error:'Invalid preview details'},{status:400});
  const asset = await getAsset(id).catch(() => null);
  if (!asset || asset.media_type !== 'video' || asset.status !== 'verified' || asset.is_public) return Response.json({error:'Video not eligible'},{status:409});
  const key = `preview-staging/${id}/${randomUUID()}`;
  return Response.json({key,uploadUrl:await signedUpload(key,parsed.data.mime)});
}
export async function PUT(request: Request, {params}: {params: Promise<{id:string}>}) {
  const id = (await params).id;
  const denied = await eligible(request, id);
  if (denied) return Response.json({error:denied},{status:403});
  const parsed = z.object({key:z.string().regex(new RegExp(`^preview-staging/${id}/[0-9a-f-]{36}$`))}).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({error:'Invalid preview upload key'},{status:400});
  const asset = await getAsset(id).catch(() => null);
  if (!asset || asset.media_type !== 'video' || asset.status !== 'verified' || asset.is_public) return Response.json({error:'Video not eligible'},{status:409});
  try {
    const head = await headObject(parsed.data.key);
    const type = head.ContentType ?? '';
    const size = Number(head.ContentLength);
    if (!['video/mp4','video/webm'].includes(type) || !Number.isFinite(size) || size <= 0 || size > 50*1024*1024) return Response.json({error:'Preview type or size invalid'},{status:422});
    if (!(await validateObjectSignature(parsed.data.key,type))) return Response.json({error:'Preview signature invalid'},{status:422});
    const sha256 = await sha256FromR2(parsed.data.key);
    if (sha256 === asset.sha256) return Response.json({error:'Public preview must differ from the private original'},{status:422});
    const vaultKey = `video-previews/${id}/${sha256}.${type === 'video/mp4' ? 'mp4' : 'webm'}`;
    await moveToVault(parsed.data.key, vaultKey);
    const doubleChecked = await sha256FromR2(vaultKey);
    if (sha256 !== doubleChecked) return Response.json({error:'Preview verification mismatch'},{status:409});
    const sql = database();
    await sql`UPDATE assets SET preview_key=${vaultKey},preview_sha256=${sha256} WHERE id=${id}::uuid AND status='verified' AND is_public=false`;
    await audit(id,'public_video_preview_registered',{sha256,mime:type,size});
    await discardStaging(parsed.data.key).catch(() => console.warn('Preview staging cleanup needed:',id));
    return Response.json({success:true,sha256});
  } catch (error) {
    console.error('Video preview failed:',error);
    return Response.json({error:'Unable to verify video preview'},{status:503});
  }
}
