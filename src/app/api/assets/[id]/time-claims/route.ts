import { deny, isAdmin, requireSameOrigin } from '@/lib/auth';
import { database, getAsset } from '@/lib/db';
import { timeClaimUpdateSchema } from '@/lib/time-claims';
import { uuid } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  if (!(await isAdmin())) return deny();
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) return Response.json({ error: 'Invalid asset id' }, { status: 400 });

  try {
    const asset = await getAsset(parsed.data);
    if (!asset) return Response.json({ error: 'Asset not found' }, { status: 404 });
    const sql = database();
    const revisions = await sql`
      SELECT * FROM asset_time_claim_versions
      WHERE asset_id = ${asset.id}::uuid ORDER BY version DESC LIMIT 100
    `;
    return Response.json({ asset, revisions }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Time claim history unavailable:', error instanceof Error ? error.message : 'unknown');
    return Response.json({ error: 'Unable to load time claim history' }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: Context) {
  if (!(await isAdmin())) return deny();
  if (!(await requireSameOrigin(request))) {
    return Response.json({ error: 'Invalid origin' }, { status: 403 });
  }

  const id = uuid.safeParse((await params).id);
  if (!id.success) return Response.json({ error: 'Invalid asset id' }, { status: 400 });
  const body = timeClaimUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: 'Dữ liệu thời gian không hợp lệ', details: body.error.flatten() }, { status: 400 });
  }

  const claim = body.data;
  const requested = {
    original_created_at: claim.originalCreatedAt,
    original_captured_at: claim.originalCapturedAt,
    original_published_at: claim.originalPublishedAt,
    copyright_effective_at: claim.copyrightEffectiveAt,
    time_claim_source: claim.timeClaimSource,
    time_claim_reference: claim.timeClaimReference,
  };

  try {
    const sql = database();
    const result = await sql`
      SELECT update_asset_time_claim(
        ${id.data}::uuid,
        ${JSON.stringify(requested)}::jsonb,
        ${claim.expectedVersion},
        ${claim.correctionReason}
      ) AS result
    `;
    return Response.json({ success: true, ...(result[0]?.result as Record<string, unknown>) }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    const message = error instanceof Error ? error.message : 'unknown';
    if (code === '40001' || message.includes('VERSION_CONFLICT')) {
      return Response.json({ error: 'Hồ sơ đã được chỉnh sửa ở nơi khác. Tải lại trang trước khi lưu.' }, { status: 409 });
    }
    if (code === 'P0002' || message.includes('ASSET_NOT_FOUND')) {
      return Response.json({ error: 'Không tìm thấy tác phẩm' }, { status: 404 });
    }
    if (code === '22023' || /CLAIM_DATE|INVALID_CLAIM|PUBLICATION_BEFORE_CREATION/.test(message)) {
      return Response.json({ error: 'Ngày hoặc nguồn chứng cứ khai báo không hợp lệ.' }, { status: 400 });
    }
    console.error('Time claim update failed:', message);
    return Response.json({ error: 'Chưa thể cập nhật ngày tạo gốc. Kiểm tra migration Neon.' }, { status: 503 });
  }
}
