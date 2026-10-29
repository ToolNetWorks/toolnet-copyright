import type { MetadataRoute } from 'next';
import { isConfigured } from '@/lib/config';
import { publicAssets } from '@/lib/db';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const entries: MetadataRoute.Sitemap = [{url: base, changeFrequency: 'weekly', priority: 1}, {url: `${base}/registry`, changeFrequency: 'daily', priority: .9}];
  if (!isConfigured()) return entries;
  try { const works = await publicAssets(60); return [...entries, ...works.map(item => ({ url: `${base}/works/${item.id}`, lastModified: item.published_at ?? item.verified_at ?? item.created_at, changeFrequency: 'monthly' as const, priority: .7 }))]; }
  catch { return entries; }
}
