import { cookies } from 'next/headers';
import { isAdmin, requireSameOrigin, SESSION_COOKIE } from '@/lib/auth';
export async function POST(request: Request) {
  if (!(await requireSameOrigin(request))) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  if (!(await isAdmin())) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ success: true });
}
