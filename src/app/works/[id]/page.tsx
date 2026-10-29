import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BadgeCheck, CalendarDays, Fingerprint, ShieldCheck, Video } from 'lucide-react';
import { getAsset } from '@/lib/db';
import { uuid } from '@/lib/validation';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{id: string}> }): Promise<Metadata> {
 const parsed = uuid.safeParse((await params).id);
 if (!parsed.success) return { title: 'Tác phẩm không tồn tại', robots: { index: false } };
 const asset = await getAsset(parsed.data).catch(() => null);
 if (!asset?.is_public) return { title: 'Tác phẩm không tồn tại', robots: { index: false } };
 return { title: asset.title, description: `Hồ sơ công bố tác phẩm: ${asset.title}. Chủ sở hữu khai báo: ${asset.owner_name}.` };
}
export default async function Work({ params }: { params: Promise<{id: string}> }) {
 const parsed = uuid.safeParse((await params).id);
 if (!parsed.success) notFound();
 const asset = await getAsset(parsed.data).catch(() => null);
 if (!asset?.is_public || asset.status !== 'verified') notFound();
 return <main className="light-main"><div className="container work-page"><Link href="/registry" className="back-link"><ArrowLeft size={17}/> Quay lại kho tác phẩm</Link><div className="work-grid"><div className="work-preview">{asset.media_type === 'image' ? <img src={`/api/media/${asset.id}`} alt={asset.title}/> : <video controls preload="metadata" src={`/api/media/${asset.id}`}/>}</div>
   <div className="work-details"><span className="tag"><BadgeCheck size={16}/> INTEGRITY VERIFIED</span><h1>{asset.title}</h1><p>{asset.description || 'Hồ sơ tác phẩm được công bố trên ToolNet Copyright.'}</p><div className="work-data"><div><span><ShieldCheck size={16}/> Chủ sở hữu khai báo</span><strong>{asset.owner_name}</strong></div><div><span><CalendarDays size={16}/> Ngày công bố</span><strong>{new Date(asset.published_at ?? asset.created_at).toLocaleString('vi-VN')}</strong></div><div><span><Fingerprint size={16}/> Mã định danh SHA-256</span><code>{asset.sha256}</code></div><div><span>Loại tác phẩm</span><strong>{asset.media_type === 'image' ? 'Hình ảnh' : 'Video'}</strong></div></div><div className="legal-note"><Video size={17}/> Hồ sơ này xác minh nội dung tệp tại thời điểm kiểm tra kỹ thuật; không tự chứng nhận bản quyền hoặc ngày sáng tạo gốc.</div></div></div></div></main>;
}
