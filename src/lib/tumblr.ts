import { createHmac, randomBytes } from 'node:crypto';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { bucket, r2 } from '@/lib/r2';
import type { Asset } from '@/lib/db';

// OAuth 1.0a signature for Tumblr; JSON/multipart bodies are not OAuth form parameters.
function encode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

type TumblrCredentials = { consumerKey: string; consumerSecret: string; token: string; tokenSecret: string; blog: string };

export class TumblrApiError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message); this.name = 'TumblrApiError'; }
}

export function tumblrConfiguration(): TumblrCredentials | null {
  const consumerKey = process.env.TUMBLR_OAUTH_CONSUMER_KEY?.trim();
  const consumerSecret = process.env.TUMBLR_SECRET_KEY?.trim();
  const token = process.env.TUMBLR_TOKEN?.trim();
  const tokenSecret = process.env.TUMBLR_TOKEN_SECRET?.trim();
  const blog = process.env.TUMBLR_BLOG?.trim().toLowerCase();
  if (!consumerKey || !consumerSecret || !token || !tokenSecret || !blog) return null;
  // Treat the blog as an identifier, never an arbitrary host/url.
  if (!/^[a-z0-9-]+\.tumblr\.com$/.test(blog)) return null;
  return { consumerKey, consumerSecret, token, tokenSecret, blog };
}

export function tumblrOAuthHeader(method: 'GET' | 'POST', url: string, credentials: TumblrCredentials,
  nonce = randomBytes(18).toString('hex'), timestamp = String(Math.floor(Date.now() / 1000))): string {
  const params: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_token: credentials.token,
    oauth_nonce: nonce,
    oauth_timestamp: timestamp,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_version: '1.0',
  };
  const parsed = new URL(url);
  const query = Array.from(parsed.searchParams.entries());
  const entries = [...Object.entries(params), ...query]
    .map(([key, value]) => [encode(key), encode(value)])
    .sort(([aKey, aValue], [bKey, bValue]) => (aKey < bKey ? -1 : aKey > bKey ? 1 : aValue < bValue ? -1 : aValue > bValue ? 1 : 0));
  const normalized = entries.map(([key, value]) => `${key}=${value}`).join('&');
  const baseUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  const base = [method, encode(baseUrl), encode(normalized)].join('&');
  const secret = `${encode(credentials.consumerSecret)}&${encode(credentials.tokenSecret)}`;
  const signature = createHmac('sha1', secret).update(base).digest('base64');
  return 'OAuth ' + Object.entries({ ...params, oauth_signature: signature })
    .map(([key, value]) => `${encode(key)}="${encode(value)}"`).join(', ');
}

type TumblrResponse = { meta?: { status?: number; msg?: string }; response?: { id?: string; user?: { blogs?: { name?: string; url?: string }[] } } };

async function tumblrRequest(method: 'GET' | 'POST', endpoint: string, config: TumblrCredentials, body?: FormData | string): Promise<TumblrResponse> {
  const response = await fetch(endpoint, {
    method, headers: {
      Authorization: tumblrOAuthHeader(method, endpoint, config),
      ...(typeof body === 'string' ? { 'Content-Type': 'application/json' } : {}),
    },
    body, cache: 'no-store', signal: AbortSignal.timeout(45000),
  });
  const result = await response.json().catch(() => ({})) as TumblrResponse;
  if (!response.ok || (result.meta?.status && result.meta.status >= 400)) {
    // 4xx is a confirmed rejection; 5xx may be ambiguous after submission.
    const status = result.meta?.status ?? response.status;
    throw new TumblrApiError(`Tumblr API từ chối yêu cầu (HTTP ${status}). Kiểm tra OAuth/quyền blog và giới hạn đăng.`, status >= 500);
  }
  return result;
}

export async function checkTumblrAccount() {
  const config = tumblrConfiguration();
  if (!config) return { configured: false, authorized: false, blog: process.env.TUMBLR_BLOG ?? null };
  const result = await tumblrRequest('GET', 'https://api.tumblr.com/v2/user/info', config);
  const blogs = result.response?.user?.blogs ?? [];
  const authorized = blogs.some(item => item.name?.toLowerCase() === config.blog.replace(/\.tumblr\.com$/, '') ||
    item.url?.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '') === config.blog);
  return { configured: true, authorized, blog: config.blog };
}

async function safePreviewJpeg(key: string): Promise<{ bytes: Buffer; width: number; height: number }> {
  const object = await r2().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!object.Body) throw new Error('Không thể đọc bản xem trước từ R2.');
  let size = 0;
  const parts: Buffer[] = [];
  for await (const chunk of object.Body as AsyncIterable<Uint8Array>) {
    size += chunk.byteLength;
    if (size > 15 * 1024 * 1024) throw new Error('Bản xem trước vượt kích thước cho phép.');
    parts.push(Buffer.from(chunk));
  }
  const bytes = await sharp(Buffer.concat(parts), { limitInputPixels: 40_000_000 })
    .rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 }).toBuffer();
  if (bytes.byteLength > 10 * 1024 * 1024) throw new Error('Ảnh xem trước vượt giới hạn Tumblr.');
  const metadata = await sharp(bytes).metadata();
  if (!metadata.width || !metadata.height) throw new Error('Không đọc được kích thước ảnh.');
  return { bytes, width: metadata.width, height: metadata.height };
}

export async function publishAssetToTumblr(asset: Asset): Promise<{ id: string; url: string; blog: string }> {
  const config = tumblrConfiguration();
  if (!config) throw new TumblrApiError('Chưa cấu hình đủ 5 biến TUMBLR_* trên Vercel Production.', false);
  if (!asset.is_public || asset.status !== 'verified' || !asset.preview_key || !asset.sha256) {
    throw new TumblrApiError('Chỉ đăng được tác phẩm đã xác minh SHA-256 và công khai.', false);
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site || !site.startsWith('https://')) throw new Error('NEXT_PUBLIC_SITE_URL chưa được cấu hình HTTPS.');
  const workUrl = new URL(`/works/${asset.id}`, site).href;
  const format = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
  const content: Record<string, unknown>[] = [
    { type: 'text', text: asset.title, subtype: 'heading1' },
    { type: 'text', text: `Chủ sở hữu khai báo: ${asset.owner_name}` },
  ];
  if (asset.media_type === 'image') {
    const preview = await safePreviewJpeg(asset.preview_key);
    content.push({ type: 'image', media: [{ type: 'image/jpeg', identifier: 'original-work-preview', width: preview.width, height: preview.height }],
      alt_text: `Bản xem trước tác phẩm: ${asset.title}` });
    // The image is attached below as multipart, no R2 private URLs are shared with Tumblr.
    const description = asset.description ? asset.description.slice(0, 800) : 'Hồ sơ tác phẩm trên ToolNet Copyright.';
    content.push({ type: 'text', text: description });
    if (asset.original_created_at) content.push({ type: 'text', text: `Ngày sáng tạo gốc (chủ sở hữu khai báo): ${format(asset.original_created_at)}` });
    content.push({ type: 'text', text: `Ngày tải lên và xác minh được ghi riêng trong hồ sơ. SHA-256: ${asset.sha256}` });
    content.push({ type: 'link', url: workUrl, title: 'Hồ sơ công khai và chứng cứ ToolNet Copyright' });
    const payload = { state: 'published', content, tags: 'copyright,toolnet copyright,original work', source_url: workUrl };
    const form = new FormData();
    form.append('json', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    form.append('original-work-preview', new Blob([new Uint8Array(preview.bytes)], { type: 'image/jpeg' }), 'preview.jpg');
    const endpoint = `https://api.tumblr.com/v2/blog/${config.blog}/posts`;
    const result = await tumblrRequest('POST', endpoint, config, form);
    if (!result.response?.id) throw new TumblrApiError('Tumblr không trả về post ID. Cần kiểm tra blog trước khi đăng lại.', true);
    return { id: String(result.response.id), blog: config.blog, url: `https://${config.blog}/post/${result.response.id}` };
  }
  // Video: publish a link to the verified preview; do not expose the private original or download a large video into serverless memory.
  if (asset.original_created_at) content.push({ type: 'text', text: `Ngày sáng tạo gốc (chủ sở hữu khai báo): ${format(asset.original_created_at)}` });
  content.push({ type: 'text', text: `Video được lưu trong kho riêng tư. SHA-256: ${asset.sha256}` });
  content.push({ type: 'link', url: workUrl, title: `Xem video và hồ sơ chứng cứ: ${asset.title}` });
  const endpoint = `https://api.tumblr.com/v2/blog/${config.blog}/posts`;
  const result = await tumblrRequest('POST', endpoint, config, JSON.stringify({ state: 'published', content, source_url: workUrl, tags: 'copyright,toolnet copyright,video' }));
  if (!result.response?.id) throw new TumblrApiError('Tumblr không trả về post ID. Cần kiểm tra blog trước khi đăng lại.', true);
  return { id: String(result.response.id), blog: config.blog, url: `https://${config.blog}/post/${result.response.id}` };
}
