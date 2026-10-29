import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BadgeCheck, CalendarDays, Fingerprint, ShieldCheck, Video } from 'lucide-react';
import { database, getAsset } from '@/lib/db';
import { uuid } from '@/lib/validation';
import { formatViDate } from '@/lib/time-claims';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{id: string}> }): Promise<Metadata> {
 const parsed = uuid.safeParse((await params).id);
 if (!parsed.success) return { title: 'Tác phẩm không tồn tại', robots: { index: false } };
 const asset = await getAsset(parsed.data).catch(() => null);
 if (!asset) return { title: 'Tác phẩm không tồn tại', robots: { index: false } };
 if (!asset.is_public || asset.status !== 'verified')
   return { title: 'Hồ sơ đang xử lý | ToolNet Copyright', robots: { index: false, follow: false } };
 return { title: asset.title, description: `Hồ sơ công bố tác phẩm: ${asset.title}. Chủ sở hữu khai báo: ${asset.owner_name}.` };
}
export default async function Work({ params }: { params: Promise<{id: string}> }) {
 const parsed = uuid.safeParse((await params).id);
 if (!parsed.success) notFound();
 const asset = await getAsset(parsed.data).catch(() => null);
 if (!asset) notFound();

 if (!asset.is_public || asset.status !== 'verified') {
   if (asset.media_type !== 'image') notFound();

   const sql = database();
   const rows = await sql`
     SELECT tumblr_url
     FROM tumblr_publications
     WHERE asset_id=${asset.id}::uuid
       AND status='published'
       AND tumblr_url IS NOT NULL
     LIMIT 1
   `;

   const tumblrUrl = rows[0]?.tumblr_url;
   if (typeof tumblrUrl !== 'string') notFound();

   return <main className="light-main">
     <div className="container listing-content">
       <div className="page-intro">
         <span className="kicker">TOOLNET COPYRIGHT</span>
         <h1>{asset.title}</h1>
         <p>
           {asset.status === 'verified'
             ? 'SHA-256 đã xác minh. Hồ sơ đang chờ công bố.'
             : 'Ảnh đã đăng Tumblr. Hồ sơ đang chờ xác minh SHA-256.'}
         </p>
         <p><strong>Chủ sở hữu khai báo:</strong> {asset.owner_name}</p>
         <p><strong>Ngày tạo gốc khai báo:</strong> {formatViDate(asset.original_created_at)}</p>
         <p><strong>Ngày tải lên thực tế:</strong> {formatViDate(asset.created_at)}</p>
         <a className="btn" href={tumblrUrl}
            target="_blank" rel="noopener noreferrer">
           Xem bài viết Tumblr
         </a>
       </div>
     </div>
   </main>;
 }

 return <main className="light-main"><div className="container work-page"><Link href="/registry" className="back-link"><ArrowLeft size={17}/> Quay lại kho tác phẩm</Link><div className="work-grid"><div className="work-preview">{asset.media_type === 'image' ? <img src={`/api/media/${asset.id}`} alt={asset.title}/> : <video controls preload="metadata" src={`/api/media/${asset.id}`}/>}</div>
   <div className="work-details"><span className="tag"><BadgeCheck size={16}/> INTEGRITY VERIFIED</span><h1>{asset.title}</h1><p>{asset.description || 'Hồ sơ tác phẩm được công bố trên ToolNet Copyright.'}</p><div className="work-data"><div><span><ShieldCheck size={16}/> Chủ sở hữu khai báo</span><strong>{asset.owner_name}</strong></div>{asset.original_created_at && <div><span><CalendarDays size={16}/> Ngày sáng tạo gốc (chủ sở hữu khai báo)</span><strong>{formatViDate(asset.original_created_at)}</strong></div>}
   {asset.original_captured_at && <div><span><CalendarDays size={16}/> Ngày chụp/quay (chủ sở hữu khai báo)</span><strong>{formatViDate(asset.original_captured_at)}</strong></div>}
   {asset.original_published_at && <div><span><CalendarDays size={16}/> Ngày công bố đầu tiên (chủ sở hữu khai báo)</span><strong>{formatViDate(asset.original_published_at)}</strong></div>}
   {asset.copyright_effective_at && <div><span><CalendarDays size={16}/> Ngày bắt đầu có quyền (chủ sở hữu khai báo)</span><strong>{formatViDate(asset.copyright_effective_at)}</strong></div>}
   {asset.time_claim_version > 0 && <div><span><CalendarDays size={16}/> Phiên bản khai báo thời gian</span><strong>#{asset.time_claim_version} · cập nhật {formatViDate(asset.time_claim_updated_at)}</strong></div>}
   <div><span><CalendarDays size={16}/> Ngày tải lên ToolNet (hệ thống ghi nhận)</span><strong>{formatViDate(asset.created_at)}</strong></div>
   <div><span><CalendarDays size={16}/> Ngày xác minh file (hệ thống ghi nhận)</span><strong>{formatViDate(asset.verified_at)}</strong></div>
   <div><span><CalendarDays size={16}/> Ngày công bố trên ToolNet (hệ thống ghi nhận)</span><strong>{formatViDate(asset.published_at)}</strong></div><div><span><Fingerprint size={16}/> Mã định danh SHA-256</span><code>{asset.sha256}</code></div><div><span>Loại tác phẩm</span><strong>{asset.media_type === 'image' ? 'Hình ảnh' : 'Video'}</strong></div></div><div className="legal-note"><Video size={17}/> Các ngày sáng tạo, chụp/quay và công bố đầu tiên là thông tin do chủ sở hữu khai báo, có thể được đính chính với lịch sử ghi nhận. Ngày upload và xác minh do hệ thống ghi riêng. SHA-256 xác minh nội dung tệp; không tự chứng nhận quyền tác giả hoặc thời gian sáng tạo.</div></div></div></div></main>;
}
