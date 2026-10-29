import { deny, isAdmin } from '@/lib/auth';
import { checkTumblrAccount } from '@/lib/tumblr';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (!(await isAdmin())) return deny();
  try {
    const status = await checkTumblrAccount();
    return Response.json(status, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Tumblr credential check failed:', error instanceof Error ? error.name : 'unknown');
    return Response.json({ configured: true, authorized: false,
      error: 'Không thể xác minh OAuth với Tumblr. Kiểm tra khóa, token, blog và quyền tài khoản.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
