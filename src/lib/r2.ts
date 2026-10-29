import { createHash } from 'node:crypto';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'node:stream';
import { requireEnv } from './config';

export function r2() {
  return new S3Client({
    region: 'auto', endpoint: `https://${requireEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: requireEnv('R2_ACCESS_KEY_ID'), secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY') }
  });
}
export function bucket() { return requireEnv('R2_BUCKET'); }

export async function signedUpload(key: string, contentType: string) {
  return getSignedUrl(r2(), new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }), { expiresIn: 300 });
}
export async function signedDownload(key: string, inline = false, ttlSeconds = 60) {
  return getSignedUrl(r2(), new GetObjectCommand({ Bucket: bucket(), Key: key, ResponseContentDisposition: inline ? 'inline' : 'attachment' }), { expiresIn: ttlSeconds });
}
export async function headObject(key: string) {
  return r2().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
}
export async function sha256FromR2(key: string): Promise<string> {
  const response = await r2().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!response.Body) throw new Error('Object response had no body');
  const hash = createHash('sha256');
  const stream = response.Body as Readable | AsyncIterable<Uint8Array>;
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest('hex');
}
export async function moveToVault(stagingKey: string, vaultKey: string) {
  await r2().send(new CopyObjectCommand({ Bucket: bucket(), Key: vaultKey, CopySource: `${bucket()}/${stagingKey.split('/').map(encodeURIComponent).join('/')}` }));
}
export async function discardStaging(stagingKey: string) {
  await r2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: stagingKey }));
}
export async function generateImagePreview(originalKey: string, destination: string) {
  const response = await r2().send(new GetObjectCommand({ Bucket: bucket(), Key: originalKey }));
  if (!response.Body) throw new Error('Image object missing');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    size += chunk.byteLength;
    if (size > 25 * 1024 * 1024) return null;
    chunks.push(Buffer.from(chunk));
  }
  const sharp = (await import('sharp')).default;
  const preview = await sharp(Buffer.concat(chunks), { limitInputPixels: 40_000_000 })
    .rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 }).toBuffer();
  await r2().send(new PutObjectCommand({ Bucket: bucket(), Key: destination, Body: preview, ContentType: 'image/webp', CacheControl: 'public, max-age=600' }));
  return destination;
}
