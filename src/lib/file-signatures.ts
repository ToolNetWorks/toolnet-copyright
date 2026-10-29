import { GetObjectCommand } from '@aws-sdk/client-s3';
import { bucket, r2 } from './r2';

export function signatureMatches(bytes: Uint8Array, mime: string): boolean {
  if (bytes.length < 16) return false;
  const text = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length));
  const matches = (prefix: number[]) => prefix.every((value, index) => bytes[index] === value);
  if (mime === 'image/jpeg') return matches([0xff, 0xd8, 0xff]);
  if (mime === 'image/png') return matches([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mime === 'image/webp') return text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP';
  if (mime === 'video/webm') return matches([0x1a, 0x45, 0xdf, 0xa3]);
  if (mime === 'video/mp4') return text(4, 4) === 'ftyp';
  if (mime === 'video/quicktime') return ['ftyp','moov','mdat','wide','free'].includes(text(4, 4));
  return false;
}
export async function validateObjectSignature(key: string, mime: string): Promise<boolean> {
  const response = await r2().send(new GetObjectCommand({Bucket:bucket(),Key:key,Range:'bytes=0-63'}));
  if (!response.Body) return false;
  const bytes = await response.Body.transformToByteArray();
  return signatureMatches(bytes, mime);
}
