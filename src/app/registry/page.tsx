import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Image as ImageIcon, Video, Layers } from 'lucide-react';
import { isConfigured } from '@/lib/config';
import { publicAssets, type Asset } from '@/lib/db';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Kho tác phẩm' };
export default async function Registry() {
 let items: Asset[] = [];
 let unavailable = false;
 if (isConfigured()) try { items = await publicAssets(); } catch { unavailable = true; }
 return <main className="light-main"><div className="container listing-content"><div className="page-intro"><div className="kicker">PUBLIC WORKS REGISTRY</div><h1>Kho tác phẩm <i>đã công bố.</i></h1><p>Tra cứu những tác phẩm được công bố cùng thông tin chủ sở hữu khai báo và dấu vân tay nội dung. Đây không phải cơ sở dữ liệu chứng nhận bản quyền của nhà nước.</p></div>
  {items.length ? <div className="registry-grid">{items.map(asset => <Link href={`/works/${asset.id}`} className="registry-card" key={asset.id}><div className="registry-thumbnail">{asset.media_type === 'image' && asset.preview_key ? <img src={`/api/media/${asset.id}`} alt={asset.title}/> : <Video size={45}/>}</div><div className="registry-info"><span className="meta">{asset.media_type.toUpperCase()} · {new Date(asset.published_at ?? asset.created_at).toLocaleDateString('vi-VN')}</span><h3>{asset.title}</h3><div><span>{asset.owner_name}</span><ArrowUpRight size={19}/></div></div></Link>)}</div> : <div className="empty-registry"><div className="empty-icon"><Layers size={39}/></div><h2>{unavailable ? 'Chưa thể tải kho tác phẩm' : 'Chưa có tác phẩm công khai'}</h2><p>{unavailable ? 'Dịch vụ dữ liệu hiện không khả dụng.' : 'Khi một tác phẩm được xác minh và công bố, hồ sơ sẽ xuất hiện tại đây.'}</p><Link href="/dashboard/new" className="btn">Đăng ký tác phẩm <ArrowUpRight size={16}/></Link></div>}
  <div className="registry-notice"><ImageIcon size={20}/><p><strong>Lưu ý về xác thực:</strong> Trang tác phẩm chỉ ghi nhận thông tin do người nộp cung cấp và kết quả kiểm tra kỹ thuật. Chúng tôi không xác nhận quyền sở hữu pháp lý thay cho cơ quan có thẩm quyền.</p></div>
 </div></main>;
}
