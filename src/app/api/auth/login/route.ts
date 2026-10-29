import { cookies } from 'next/headers';
import { z } from 'zod';
import { database } from '@/lib/db';
import { clientIpHash, requireSameOrigin, SESSION_COOKIE, signedSession, validPassword } from '@/lib/auth';
import { requireEnv } from '@/lib/config';

export const runtime = 'nodejs';
const loginSchema = z.object({ email: z.email().max(200), password: z.string().min(1).max(256) });
export async function POST(request: Request) {
  if (!(await requireSameOrigin(request))) return Response.json({ error: 'Invalid request origin' }, { status: 403 });
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid credentials' }, { status: 400 });
  try {
    const sql = database();
    const ip = clientIpHash(request);
    const existing = await sql`SELECT attempt_count FROM admin_login_attempts WHERE ip_hash=${ip} AND last_attempt > now()-interval '15 minutes'`;
    if (Number(existing[0]?.attempt_count ?? 0) >= 8) return Response.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    const correctEmail = parsed.data.email.toLowerCase() === requireEnv('ADMIN_EMAIL').toLowerCase();
    const correctPassword = validPassword(parsed.data.password);
    if (!correctEmail || !correctPassword) {
      await sql`INSERT INTO admin_login_attempts(ip_hash,attempt_count,last_attempt) VALUES(${ip},1,now())
        ON CONFLICT(ip_hash) DO UPDATE SET attempt_count=CASE WHEN admin_login_attempts.last_attempt < now()-interval '15 minutes' THEN 1 ELSE admin_login_attempts.attempt_count+1 END,last_attempt=now()`;
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    await sql`DELETE FROM admin_login_attempts WHERE ip_hash=${ip}`;
    (await cookies()).set(SESSION_COOKIE, await signedSession(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 12 * 3600 });
    return Response.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Login unavailable:', error instanceof Error ? error.message : 'unknown');
    return Response.json({ error: 'Service not configured or unavailable' }, { status: 503 });
  }
}
