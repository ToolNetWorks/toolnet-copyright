import { deny, isAdmin, requireSameOrigin } from '@/lib/auth';
import { audit, database, getAsset } from '@/lib/db';
import { createCaseSchema } from '@/lib/validation';
export async function POST(request: Request) {
  if (!(await isAdmin())) return deny();
  if (!(await requireSameOrigin(request))) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const parsed = createCaseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid case information', details: parsed.error.flatten() }, { status: 400 });
  const asset = await getAsset(parsed.data.assetId).catch(() => null);
  if (!asset || asset.status !== 'verified') return Response.json({ error: 'Choose a verified asset' }, { status: 409 });
  const sql = database();
  const [result] = await sql`INSERT INTO infringement_cases(asset_id,platform,reported_url,notes)
    VALUES(${asset.id}::uuid,${parsed.data.platform},${parsed.data.url},${parsed.data.notes}) RETURNING id`;
  await audit(asset.id, 'infringement_case_opened', { case_id: result.id, platform: parsed.data.platform, reported_url: parsed.data.url });
  return Response.json({ id: result.id }, { status: 201 });
}
