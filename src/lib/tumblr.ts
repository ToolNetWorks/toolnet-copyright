import { createHmac, randomBytes } from 'node:crypto';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { bucket, r2 } from '@/lib/r2';
import type { Asset } from '@/lib/db';
import { buildTumblrDeclaration } from '@/lib/tumblr-declaration';

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

type TumblrPost = { id?: string | number; id_string?: string; date?: string };
type TumblrResponse = {
  meta?: { status?: number; msg?: string };
  errors?: unknown;
  response?: TumblrPost & {
    error?: unknown;
    errors?: unknown;
    posts?: TumblrPost[];
    user?: { blogs?: { name?: string; url?: string }[] };
  };
};

function tumblrErrorDetails(value: unknown, depth = 0): string[] {
  if (depth > 3) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(item => tumblrErrorDetails(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) =>
      key === 'code' && (typeof item === 'number' || typeof item === 'string')
        ? [`code ${item}`] : tumblrErrorDetails(item, depth + 1));
  }
  return [];
}

function tumblrPostId(post: TumblrPost | undefined): string | null {
  const value = post?.id_string ?? post?.id;
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value);
  return null;
}

async function tumblrRequest(method: 'GET' | 'POST', endpoint: string, config: TumblrCredentials, body?: FormData | string): Promise<TumblrResponse> {
  const response = await fetch(endpoint, {
    method, headers: {
      Authorization: tumblrOAuthHeader(method, endpoint, config),
      ...(typeof body === 'string' ? { 'Content-Type': 'application/json' } : {}),
    },
    body, cache: 'no-store', signal: AbortSignal.timeout(45000),
  });
  const parsed: unknown = await response.json().catch(() => null);
  const result: TumblrResponse = parsed && typeof parsed === 'object' ? parsed as TumblrResponse : {};
  if (!response.ok || (result.meta?.status && result.meta.status >= 400)) {
    const status = result.meta?.status ?? response.status;
    const details = [...new Set([
      ...tumblrErrorDetails(result.meta?.msg),
      ...tumblrErrorDetails(result.errors),
      ...tumblrErrorDetails(result.response?.errors),
      ...tumblrErrorDetails(result.response?.error),
    ])].join('; ');
    // Tumblr messages can echo request values. Never return OAuth secrets to the client.
    let safeDetails = details;
    for (const secret of [config.consumerKey, config.consumerSecret, config.token, config.tokenSecret]) {
      safeDetails = safeDetails.replaceAll(secret, '[redacted]').replaceAll(encode(secret), '[redacted]');
    }
    safeDetails = safeDetails.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 1000);
    const meta = status !== response.status ? `, meta.status ${status}` : '';
    // A response containing an ID, or any 5xx, cannot safely trigger another POST.
    const uncertain = response.status >= 500 || status >= 500 || Boolean(result.response?.id || result.response?.id_string);
    throw new TumblrApiError(`Tumblr API từ chối yêu cầu (HTTP ${response.status}${meta}).${safeDetails ? ` ${safeDetails}` : ' Kiểm tra OAuth/quyền blog và giới hạn đăng.'}`, uncertain);
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

export async function publishAssetToTumblr(asset: Asset): Promise<{ id: string; url: string; blog: string; requestedDisplayDate: string | null; confirmedDisplayDate: string | null }> {
  const config = tumblrConfiguration();
  if (!config) throw new TumblrApiError('Chưa cấu hình đủ 5 biến TUMBLR_* trên Vercel Production.', false);
  if (asset.media_type === 'image' && (!asset.original_created_at || asset.owner_basis !== 'original_creator')) {
    throw new TumblrApiError('Mẫu tuyên bố này yêu cầu ngày tạo gốc và quyền tác giả gốc. Hãy kiểm tra khai báo trước khi đăng.', false);
  }
  const imageBeforeVerify = asset.media_type === 'image' &&
    asset.status === 'pending_verification' && !asset.is_public && Boolean(asset.original_created_at);
  const alreadyPublic = asset.is_public && asset.status === 'verified';
  if ((!imageBeforeVerify && !alreadyPublic) || !asset.preview_key) {
    throw new TumblrApiError('Ảnh cần upload thành công và khai báo ngày gốc trước khi đăng Tumblr.', false);
  }
  // Tumblr's date option changes the post's display date, not its actual submission time.
  const requestedDisplayDate = asset.original_created_at || null;
  if (requestedDisplayDate && (!Number.isFinite(Date.parse(requestedDisplayDate)) || Date.parse(requestedDisplayDate) >= Date.now())) {
    throw new TumblrApiError('Ngày hiển thị Tumblr phải nằm trong quá khứ.', false);
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site || !site.startsWith('https://')) throw new Error('NEXT_PUBLIC_SITE_URL chưa được cấu hình HTTPS.');
  const workUrl = new URL(`/works/${asset.id}`, site).href;
  const actualSubmissionTime = new Date().toISOString();
  const format = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
  const content: Record<string, unknown>[] = [
    { type: 'text', text: asset.title, subtype: 'heading1' },
    { type: 'text', text: `Chủ sở hữu khai báo: ${asset.owner_name}` },
  ];
  if (asset.media_type === 'image') {
    const preview = await safePreviewJpeg(asset.preview_key);
    // Post the complete user-provided declaration, not a shortened caption.
    // DATE OF CREATION = owner's claim; DATE OF DECLARATION = actual statement date.
    const declaration = buildTumblrDeclaration(asset.original_created_at!, actualSubmissionTime);
    const caption = [asset.title, `Chủ sở hữu khai báo: ${asset.owner_name}`, declaration,
      `Ngày gửi bài Tumblr thực tế: ${actualSubmissionTime}. Ngày hiển thị quá khứ chỉ là ngày do chủ sở hữu khai báo, không chứng minh bài đã tồn tại từ ngày đó.`,
      asset.sha256 ? `SHA-256 đã xác minh: ${asset.sha256}` : 'Đang chờ ToolNet Copyright xác minh SHA-256 và công bố hồ sơ chứng cứ.',
      `Hồ sơ ToolNet Copyright (công khai sau khi xác minh): ${workUrl}`,
    ].map(text => `<p>${text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;').replaceAll('\n', '<br>')}</p>`).join('\n');
    const form = new FormData();
    form.append('type', 'photo');
    form.append('state', 'published');
    form.append('date', new Date(requestedDisplayDate!).toISOString().slice(0, 19).replace('T', ' ') + ' GMT');
    form.append('tags', 'copyright,toolnet copyright,original work');
    form.append('format', 'html');
    form.append('caption', caption);
    form.append('link', workUrl);
    form.append('data', new Blob([new Uint8Array(preview.bytes)], { type: 'image/jpeg' }), 'preview.jpg');
    const endpoint = `https://api.tumblr.com/v2/blog/${config.blog}/post`;
    const result = await tumblrRequest('POST', endpoint, config, form);
    const id = tumblrPostId(result.response);
    if (!id) throw new TumblrApiError('Tumblr không trả về post ID chính xác. Cần kiểm tra blog trước khi đăng lại.', true);
    // If the date is unavailable or Tumblr ignores it, report that accurately; never invent verification.
    let confirmedDisplayDate: string | null = null;
    try {
      const fetched = await tumblrRequest('GET', `https://api.tumblr.com/v2/blog/${config.blog}/posts?id=${id}`, config);
      const post = fetched.response?.posts?.find(item => tumblrPostId(item) === id);
      confirmedDisplayDate = post?.date && Number.isFinite(Date.parse(post.date)) ? post.date : null;
    } catch { /* The post ID exists; do not create a duplicate because the read-back failed. */ }
    return { id, blog: config.blog, url: `https://${config.blog}/post/${id}`,
      requestedDisplayDate, confirmedDisplayDate };
  }
  // Video: publish a link to the verified preview; do not expose the private original or download a large video into serverless memory.
  if (asset.original_created_at) content.push({ type: 'text', text: `Ngày sáng tạo gốc (chủ sở hữu khai báo): ${format(asset.original_created_at)}` });
  content.push({ type: 'text', text: `Video được lưu trong kho riêng tư. SHA-256: ${asset.sha256}` });
  content.push({ type: 'link', url: workUrl, title: `Xem video và hồ sơ chứng cứ: ${asset.title}` });
  const endpoint = `https://api.tumblr.com/v2/blog/${config.blog}/posts`;
  const result = await tumblrRequest('POST', endpoint, config, JSON.stringify({ state: 'published', content, source_url: workUrl, tags: 'copyright,toolnet copyright,video' }));
  const id = tumblrPostId(result.response);
  if (!id) throw new TumblrApiError('Tumblr không trả về post ID chính xác. Cần kiểm tra blog trước khi đăng lại.', true);
  return { id, blog: config.blog,
    url: `https://${config.blog}/post/${id}`,
    requestedDisplayDate: null, confirmedDisplayDate: null };
}
