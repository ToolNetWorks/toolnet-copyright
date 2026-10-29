import { deny, isAdmin, requireSameOrigin } from '@/lib/auth';
import { database, audit, getAsset } from '@/lib/db';
import { publishAssetToTumblr, tumblrConfiguration, TumblrApiError } from '@/lib/tumblr';
import { uuid } from '@/lib/validation';
export const runtime = 'nodejs';
export const maxDuration = 120;

type TumblrRow = { status: string; tumblr_url: string | null; blog: string };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return deny();
  if (!(await requireSameOrigin(request))) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const parsed = uuid.safeParse((await params).id);
  if (!parsed.success) return Response.json({ error: 'Invalid asset ID' }, { status: 400 });
  const config = tumblrConfiguration();
  if (!config) return Response.json({ error: 'Chưa cấu hình Tumblr trên Vercel Production.' }, { status: 503 });
  const asset = await getAsset(parsed.data).catch(() => null);
  if (!asset) return Response.json({ error: 'Tác phẩm không tồn tại.' }, { status: 404 });
  if (!asset.is_public || asset.status !== 'verified' || !asset.preview_key) {
    return Response.json({ error: 'Chỉ được đăng Tumblr sau khi SHA-256 đã xác minh và tác phẩm đã công khai.' }, { status: 409 });
  }
  const sql = database();
  let locked: Record<string, unknown>[];
  try {
    // An in-flight request cannot be double posted. A definite rejected attempt can be retried.
    locked = await sql`INSERT INTO tumblr_publications(asset_id,blog,status)
      VALUES(${asset.id}::uuid,${config.blog},'publishing')
      ON CONFLICT (asset_id) DO UPDATE SET status='publishing',blog=${config.blog},
        requested_at=now(),updated_at=now(),last_error=NULL
      WHERE tumblr_publications.status='failed'
      RETURNING asset_id`;
  } catch (error) {
    console.error('Tumblr reservation error:', error instanceof Error ? error.message : 'unknown');
    return Response.json({ error: 'Chưa thể mở phiên đăng Tumblr. Kiểm tra migration.' }, { status: 503 });
  }
  if (!locked.length) {
    const rows = await sql`SELECT status,tumblr_url,blog FROM tumblr_publications WHERE asset_id=${asset.id}::uuid`;
    const previous = rows[0] as TumblrRow | undefined;
    if (previous?.status === 'published') return Response.json({ success: true, alreadyPublished: true, url: previous.tumblr_url });
    return Response.json({ error: 'Bài Tumblr đang xử lý hoặc cần đối chiếu thủ công để tránh đăng trùng.' }, { status: 409 });
  }
  try {
    const result = await publishAssetToTumblr(asset);
    await sql`UPDATE tumblr_publications SET status='published',tumblr_post_id=${result.id},tumblr_url=${result.url},
      published_at=now(),updated_at=now(),last_error=NULL WHERE asset_id=${asset.id}::uuid`;
    await audit(asset.id, 'tumblr_published', { blog: result.blog, tumblr_id: result.id, tumblr_url: result.url })
      .catch(() => console.warn('Tumblr post stored but evidence event needs reconciliation:', asset.id));
    return Response.json({ success: true, url: result.url });
  } catch (error) {
    const certainRejection = error instanceof TumblrApiError && !error.retryable;
    // Ambiguous network/timeout/5xx: do not silently retry and create duplicate posts.
    await sql`UPDATE tumblr_publications SET status=${certainRejection ? 'failed' : 'uncertain'},updated_at=now(),
      last_error=${error instanceof TumblrApiError ? error.message.slice(0,300) : 'Tumblr publishing outcome uncertain'}
      WHERE asset_id=${asset.id}::uuid AND status='publishing'`.catch(() => {});
    const message = error instanceof TumblrApiError ? error.message : 'Không chắc Tumblr đã đăng hay chưa. Kiểm tra blog trước khi thử lại.';
    return Response.json({ error: message }, { status: 502 });
  }
}
