import Link from 'next/link';
import { ArrowUpRight, Database, FileImage, FileVideo2, Files, Flag, ShieldCheck, Fingerprint, CalendarClock } from 'lucide-react';
import { database, type Asset } from '@/lib/db';
import StatusActions from '@/components/status-actions';
export const dynamic = 'force-dynamic';
export default async function Dashboard() {
 const sql = database();
 const [assets, counts] = await Promise.all([
   sql`SELECT * FROM assets ORDER BY created_at DESC LIMIT 100`,
   sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE status='verified')::int AS verified, count(*) FILTER (WHERE is_public)::int AS published FROM assets`
 ]);
 const items = assets as Asset[];
 const stats = counts[0] as {total: number;verified: number;published: number};
 return <><div className="dashboard-top"><div><span className="kicker">YOUR COPYRIGHT WORKSPACE</span><h1>Quản lý <i>tác phẩm.</i></h1><p>Tất cả ảnh, video và trạng thái xác minh từ kho dữ liệu riêng của bạn.</p></div><Link href="/dashboard/new" className="btn">+ Đăng ký tác phẩm</Link></div>
   <div className="stat-grid"><div className="stat"><div><span>Tổng tác phẩm</span><Files size={20}/></div><strong>{stats.total}</strong><small>Được lưu trong hệ thống</small></div><div className="stat"><div><span>Đã xác minh</span><ShieldCheck size={20}/></div><strong>{stats.verified}</strong><small>Đã đối chiếu SHA-256</small></div><div className="stat"><div><span>Đang công khai</span><Database size={20}/></div><strong>{stats.published}</strong><small>Có trang tác phẩm</small></div></div>
   <section className="panel"><div className="panel-heading"><div><h2>Thư viện tài sản</h2><p>Nhấn xác minh trước khi công bố tác phẩm</p></div><Link href="/registry" className="minor-link">Kho công khai <ArrowUpRight size={16}/></Link></div>
    {items.length ? <div className="asset-table-wrap"><table className="asset-table"><thead><tr><th>Tác phẩm</th><th>Chủ sở hữu</th><th>Trạng thái</th><th>SHA-256</th><th>Hành động</th></tr></thead><tbody>{items.map(asset => <tr key={asset.id}><td><div className="asset-title"><span className="asset-type">{asset.media_type === 'image' ? <FileImage size={20}/> : <FileVideo2 size={20}/>}</span><div><strong>{asset.title}</strong><small>{new Date(asset.created_at).toLocaleDateString('vi-VN')}</small></div></div></td><td>{asset.owner_name}</td><td><span className={`status-pill status-${asset.status}`}>{asset.is_public ? 'Đã công bố' : asset.status === 'verified' ? 'Đã xác minh' : asset.status === 'pending_verification' ? 'Chờ xác minh' : asset.status === 'upload_pending' ? 'Chờ upload' : 'Lỗi xác minh'}</span></td><td><span className="hash-short"><Fingerprint size={14}/>{asset.sha256?.slice(0,14) ?? '—'}</span></td><td><Link href={`/dashboard/works/${asset.id}/time`} className="btn btn-muted btn-small" style={{ marginBottom: 8 }}><CalendarClock size={14}/> Ngày gốc</Link><StatusActions id={asset.id} status={asset.status} published={asset.is_public} isVideo={asset.media_type === 'video'} hasPreview={!!asset.preview_key}/>{asset.is_public && <Link href={`/works/${asset.id}`} className="minor-link">Trang công khai <ArrowUpRight size={14}/></Link>}</td></tr>)}</tbody></table></div> : <div className="panel-empty"><FileImage size={34}/><h3>Thư viện còn trống</h3><p>Đăng ký tác phẩm đầu tiên để tạo hồ sơ nguồn gốc.</p><Link href="/dashboard/new" className="btn btn-small">Thêm tác phẩm <ArrowUpRight size={15}/></Link></div>}
   </section><div className="info-footer"><Flag size={18}/><span>Cần ghi nhận nội dung bị sao chép?</span><Link href="/dashboard/cases">Tạo hồ sơ vi phạm <ArrowUpRight size={15}/></Link></div></>;
}
