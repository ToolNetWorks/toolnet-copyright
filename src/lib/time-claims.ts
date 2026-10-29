import { z } from 'zod';

// Claimed dates are owner statements. They never replace server event timestamps.
export const TIME_CLAIM_SOURCES = [
  'owner_declaration',
  'exif',
  'raw_file',
  'project_file',
  'contract',
  'publication_url',
  'other',
] as const;

export const SOURCE_LABELS: Record<(typeof TIME_CLAIM_SOURCES)[number], string> = {
  owner_declaration: 'Chủ sở hữu tự khai báo',
  exif: 'Thông tin EXIF (chưa xác thực độc lập)',
  raw_file: 'File ảnh / video gốc',
  project_file: 'File dự án / lịch sử chỉnh sửa',
  contract: 'Hợp đồng / giấy tờ quyền',
  publication_url: 'Liên kết công bố trước đây',
  other: 'Nguồn khác',
};

export const claimedDateSchema = z.iso.datetime({ offset: true }).nullable();

export const timeClaimUpdateSchema = z.strictObject({
  expectedVersion: z.number().int().nonnegative(),
  originalCreatedAt: claimedDateSchema,
  originalCapturedAt: claimedDateSchema,
  originalPublishedAt: claimedDateSchema,
  copyrightEffectiveAt: claimedDateSchema,
  timeClaimSource: z.enum(TIME_CLAIM_SOURCES),
  timeClaimReference: z.string().trim().max(2048),
  correctionReason: z.string().trim().min(10).max(1000),
  acknowledged: z.literal(true),
}).superRefine((claim, ctx) => {
  const original = claim.originalCreatedAt ? Date.parse(claim.originalCreatedAt) : null;
  const published = claim.originalPublishedAt ? Date.parse(claim.originalPublishedAt) : null;
  const now = Date.now();

  if (original !== null && published !== null && published < original) {
    ctx.addIssue({ code: 'custom', path: ['originalPublishedAt'], message: 'Ngày công bố trước ngày sáng tạo' });
  }

  for (const key of ['originalCreatedAt','originalCapturedAt','originalPublishedAt'] as const) {
    const value = claim[key];
    if (value && Date.parse(value) > now) {
      ctx.addIssue({ code: 'custom', path: [key], message: 'Không được khai báo sự kiện đã diễn ra trong tương lai' });
    }
  }
});

export type TimeClaimVersion = {
  asset_id: string;
  version: number;
  original_created_at: string | null;
  original_captured_at: string | null;
  original_published_at: string | null;
  copyright_effective_at: string | null;
  claim_source: (typeof TIME_CLAIM_SOURCES)[number];
  claim_reference: string;
  correction_reason: string;
  recorded_at: string;
  snapshot_sha256: string;
};

export function formatViDate(value: string | null | undefined): string {
  if (!value) return 'Chưa khai báo';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Ngày không hợp lệ';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(parsed);
}
