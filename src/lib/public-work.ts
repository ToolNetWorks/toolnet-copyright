import { cache } from 'react';
import { database, getAsset, type Asset } from '@/lib/db';
import { uuid } from '@/lib/validation';

export type PublicTumblrPost = { tumblr_post_id: string; tumblr_url: string; published_at: string | null };

export function safeTumblrUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && /^[a-z0-9-]+\.tumblr\.com$/.test(url.hostname)
      && !url.username && !url.password && !url.port && /^\/post\/[1-9]\d*(?:\/|$)/.test(url.pathname)
      ? url.href : null;
  } catch { return null; }
}

export function hasVerifiedIntegrity(asset: Asset): boolean {
  return asset.status === 'verified' && /^[a-f0-9]{64}$/i.test(asset.sha256 ?? '')
    && Number.isFinite(Date.parse(asset.verified_at ?? ''));
}

// Only derived previews can be served. A mistaken key must never expose a source file.
export function publicPreviewKey(asset: Asset): string | null {
  const key = asset.preview_key;
  if (!key || key === asset.staging_key || key === asset.vault_key) return null;
  if (asset.media_type === 'image') return key === `previews/${asset.id}.webp` ? key : null;
  return new RegExp(`^video-previews/${asset.id}/[a-f0-9]{64}\\.(mp4|webm)$`).test(key) ? key : null;
}

export function permanentWorkUrl(id: string): string {
  const parsed = uuid.parse(id);
  const site = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://toolnet-copyright-eta.vercel.app');
  if (!['https:', 'http:'].includes(site.protocol)) throw new Error('Invalid public site URL');
  return new URL(`/works/${parsed}`, site.origin).href;
}

// Page and preview route share the same public visibility rules, independent of admin sessions.
export const getPublicWork = cache(async (id: string) => {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return null;
  const asset = await getAsset(parsed.data).catch(() => null);
  if (!asset) return null;
  const integrityVerified = hasVerifiedIntegrity(asset);
  const published = asset.is_public && integrityVerified;
  if (!published && (asset.media_type !== 'image' || !['pending_verification', 'verified'].includes(asset.status))) return null;

  const sql = database();
  const rows = await sql`
    SELECT tumblr_post_id, tumblr_url, published_at FROM tumblr_publications
    WHERE asset_id=${asset.id}::uuid AND status='published'
      AND tumblr_post_id IS NOT NULL AND tumblr_url IS NOT NULL LIMIT 1
  `.catch(() => []);
  const row = rows[0];
  const tumblrUrl = safeTumblrUrl(row?.tumblr_url);
  const tumblr: PublicTumblrPost | null = row && tumblrUrl && /^[1-9]\d*$/.test(String(row.tumblr_post_id))
    ? { tumblr_post_id: String(row.tumblr_post_id), tumblr_url: tumblrUrl, published_at: row.published_at as string | null }
    : null;
  if (!published && !tumblr) return null;
  return { asset, tumblr, integrityVerified, published, previewKey: publicPreviewKey(asset) };
});
