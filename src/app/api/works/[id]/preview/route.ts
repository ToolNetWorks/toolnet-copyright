import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getPublicWork } from '@/lib/public-work';
import { bucket, r2 } from '@/lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const work = await getPublicWork((await params).id);
  if (!work?.previewKey) return Response.json({ error: 'Preview unavailable' }, { status: 404 });
  const range = request.headers.get('range');
  if (range && !/^bytes=\d*-\d*$/.test(range)) return new Response(null, { status: 416 });
  try {
    const object = await r2().send(new GetObjectCommand({
      Bucket: bucket(), Key: work.previewKey, ...(range ? { Range: range } : {}),
    }), { abortSignal: request.signal });
    if (!object.Body) return Response.json({ error: 'Preview unavailable' }, { status: 404 });
    const contentType = work.asset.media_type === 'image' ? 'image/webp'
      : work.previewKey.endsWith('.mp4') ? 'video/mp4' : 'video/webm';
    const headers = new Headers({
      'Content-Type': contentType, 'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes',
    });
    if (object.ContentLength !== undefined) headers.set('Content-Length', String(object.ContentLength));
    if (object.ContentRange) headers.set('Content-Range', object.ContentRange);
    return new Response(object.Body.transformToWebStream(), { status: object.ContentRange ? 206 : 200, headers });
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    return Response.json({ error: 'Preview unavailable' }, { status: status === 416 ? 416 : 404 });
  }
}
