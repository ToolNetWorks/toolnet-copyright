import type { Metadata } from 'next';
import { FileWarning, Link2 } from 'lucide-react';
import { database, type Asset, type CopyrightCase } from '@/lib/db';
import CaseForm from '@/components/case-form';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Hồ sơ vi phạm', robots: { index: false } };
export default async function Cases() {
 const sql = database();
 const [assets, cases] = await Promise.all([
  sql`SELECT * FROM assets WHERE status='verified' ORDER BY created_at DESC`,
  sql`SELECT c.*, a.title AS asset_title FROM infringement_cases c INNER JOIN assets a ON a.id=c.asset_id ORDER BY c.created_at DESC LIMIT 100`
 ]);
 const records = cases as CopyrightCase[];
 return <><div className="dashboard-top"><div><span className="kicker">INFRINGEMENT TRACKING</span><h1>Hồ sơ <i>vi phạm.</i></h1><p>Ghi nhận đường dẫn nghi vi phạm. Mọi nhận định vi phạm đều cần được kiểm chứng.</p></div></div><section className="panel padded-panel"><h2>Tạo hồ sơ mới</h2><p className="form-description">Dữ liệu được lưu riêng tư, không tự động gửi yêu cầu gỡ nội dung tới nền tảng.</p><CaseForm assets={assets as Asset[]}/></section><section className="panel cases-list"><div className="panel-heading"><div><h2>Các vụ việc đã ghi nhận</h2><p>{records.length} hồ sơ</p></div></div>{records.length ? records.map(item => <div className="case-row" key={item.id}><span className="case-icon"><FileWarning size={20}/></span><div><strong>{item.asset_title}</strong><p>{item.platform.toUpperCase()} · {new Date(item.created_at).toLocaleDateString('vi-VN')}</p><a href={item.reported_url} target="_blank" rel="noreferrer"><Link2 size={14}/> {item.reported_url}</a></div><span className="status-pill">Đang đánh giá</span></div>) : <div className="panel-empty"><FileWarning size={32}/><h3>Chưa có hồ sơ nào</h3><p>Hãy tạo hồ sơ khi phát hiện nội dung cần đối chiếu.</p></div>}</section></>;
}
