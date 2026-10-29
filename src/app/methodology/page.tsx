import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Database, FileCheck2, Fingerprint, Scale, ShieldAlert } from 'lucide-react';
export const metadata: Metadata = { title: 'Phương pháp xác minh & giới hạn chứng cứ' };
export default function Methodology() {
  return <main className="light-main"><div className="container listing-content"><div className="page-intro"><span className="kicker">HOW PROVENANCE WORKS</span><h1>Minh bạch về <i>chứng cứ.</i></h1><p>ToolNet Copyright là hệ thống lưu trữ hồ sơ và xác minh kỹ thuật do người dùng cung cấp. Chúng tôi không phải cơ quan đăng ký quyền tác giả, không thay thế kết luận về quyền sở hữu của cơ quan có thẩm quyền.</p></div>
   <div className="feature-grid"><article className="feature"><span className="feature-index">STEP / 01</span><div className="feature-graphic"><FileCheck2 size={60}/></div><h3>Khai báo quyền sở hữu</h3><p>Chủ tài khoản cung cấp tên chủ sở hữu và cơ sở quyền đối với tác phẩm. Khai báo không tự xác minh tính hợp pháp của quyền.</p></article>
   <article className="feature"><span className="feature-index">STEP / 02</span><div className="feature-graphic"><Fingerprint size={60}/></div><h3>Đối chiếu file gốc</h3><p>File được đọc trực tiếp từ R2, tính SHA-256 và kiểm tra sau khi sao chép vào kho riêng. Dấu băm chứng minh tính trùng khớp bit, không chứng minh tác giả.</p></article>
   <article className="feature"><span className="feature-index">STEP / 03</span><div className="feature-graphic"><Database size={60}/></div><h3>Lịch sử kỹ thuật</h3><p>Sự kiện được ghi vào Neon bằng chuỗi hash và trigger hạn chế cập nhật/xóa thông thường. Quản trị hạ tầng có quyền cao vẫn có thể ảnh hưởng tới dữ liệu.</p></article></div>
   <div className="registry-notice"><ShieldAlert size={22}/><p><strong>Giới hạn:</strong> Ngày giờ ứng dụng và database chưa phải dấu thời gian được xác thực độc lập. Việc công bố trên website không bảo đảm yêu cầu bản quyền được Facebook, YouTube, TikTok hoặc một bên tranh chấp chấp nhận. Bạn nên lưu thêm RAW/project files, hợp đồng chuyển giao và bằng chứng từ bên thứ ba.</p></div>
   <div className="method-bottom"><Scale size={25}/><p>Để được hỗ trợ pháp lý, hãy tham khảo tư vấn chuyên môn phù hợp tại địa phương.</p><Link className="minor-link" href="/registry">Kho tác phẩm <ArrowUpRight size={15}/></Link></div>
  </div></main>;
}
