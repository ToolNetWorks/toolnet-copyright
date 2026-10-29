import { isConfigured } from '@/lib/config';
export const dynamic = 'force-dynamic';
export async function GET() { return Response.json({ service: 'toolnet-copyright', status: isConfigured() ? 'configured' : 'setup_required', timestamp: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } }); }
