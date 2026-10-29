import { createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { requireEnv } from './config';

export const SESSION_COOKIE = 'toolnet_copyright_session';
const encoder = new TextEncoder();

function sessionKey() {
  const secret = requireEnv('AUTH_SECRET');
  if (secret.length < 32) throw new Error('AUTH_SECRET must be 32+ characters');
  return encoder.encode(secret);
}
export function validPassword(password: string): boolean {
  const [algorithm, salt, expected] = requireEnv('ADMIN_PASSWORD_HASH').split(':');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(expected ?? '')) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
export async function signedSession(): Promise<string> {
  return new SignJWT({ role: 'admin' }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('12h').sign(sessionKey());
}
export async function isAdmin(): Promise<boolean> {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return false;
  try {
    const { payload } = await jwtVerify(cookie, sessionKey(), { algorithms: ['HS256'] });
    return payload.role === 'admin';
  } catch { return false; }
}
export function deny() {
  return Response.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
}
export async function requireSameOrigin(request: Request): Promise<boolean> {
  const origin = request.headers.get('origin');
  const host = (await headers()).get('host');
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}
export function clientIpHash(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const salt = requireEnv('AUTH_SECRET');
  return createHash('sha256').update(`${salt}:${forwarded}`).digest('hex');
}
