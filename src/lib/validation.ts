import { z } from 'zod';
export const uuid = z.uuid();
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"] as const;
export const initAssetSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).default(''),
  ownerName: z.string().trim().min(2).max(200),
  ownerBasis: z.enum(['original_creator', 'rights_transfer', 'exclusive_license']),
  filename: z.string().min(1).max(250),
  size: z.number().int().positive().max(250 * 1024 * 1024),
  mime: z.enum(ALLOWED_MIME),
  confirmedRights: z.literal(true)
});
export const createCaseSchema = z.object({
  assetId: uuid,
  platform: z.enum(['facebook','instagram','youtube','tiktok','website','other']),
  url: z.url().refine(x => /^https?:\/\//.test(x), 'Must be HTTP(S)').max(2048),
  notes: z.string().max(2000).default('')
});
