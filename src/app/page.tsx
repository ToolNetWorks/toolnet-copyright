import Link from 'next/link';
import { ArrowUpRight, BadgeCheck, FileLock2, Fingerprint, Image as ImageIcon, MoveUpRight, ShieldCheck, ScanSearch, Video, Network, ArrowRight, Clock3 } from 'lucide-react';
export default function Home() {
 return <main>
   <section className="hero"><div className="hero-noise"/><div className="container hero-grid"><div className="hero-copy">
    <div className="eyebrow"><span className="live-dot"/> DIGITAL RIGHTS INFRASTRUCTURE <span className="eyebrow-line"/></div>
    <h1>Tác phẩm của bạn.<br/><span className="serif">Dấu ấn của bạn.</span><br/><em>Quyền của bạn.</em></h1>
    <p className="hero-lead">Một không gian tin cậy để lưu trữ tác phẩm gốc, xác minh tính toàn vẹn và thiết lập hồ sơ chứng cứ cho hình ảnh, video sáng tạo.</p>
    <div className="hero-buttons"><Link href="/dashboard/new" className="btn btn-white">Đăng ký tác phẩm <ArrowUpRight size={18}/></Link><Link href="/registry" className="btn-outline">Khám phá kho tác phẩm <ArrowRight size={17}/></Link></div>
    <div className="hero-micro"><span><ShieldCheck size={16}/> Lưu bản gốc riêng tư</span><span><Fingerprint size={16}/> SHA-256</span><span><FileLock2 size={16}/> Hồ sơ truy xuất</span></div>
   </div><div className="hero-visual" aria-hidden="true">
     <div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="visual-corner top-left"/><div className="visual-corner bottom-right"/>
     <div className="main-art"><div className="main-art-glow"/><div className="art-grid"/><div className="art-symbol"><Fingerprint strokeWidth={1.05} size={132}/></div><div className="art-label">TNC — AUTHENTIC WORK</div></div>
     <div className="float-card verified"><span><BadgeCheck size={15}/> INTEGRITY VERIFIED</span><strong>SHA-256 <span>✓</span></strong><div className="hash-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div>
     <div className="float-card ownership"><span>PROPERTY RECORD</span><div><div className="mini-glyph"><ShieldCheck size={20}/></div><p><strong>Original asset</strong><small>Protected in private storage</small></p></div></div>
   </div></div></section>
   <section className="trust-strip"><div className="container trust-inner"><span>BUILT FOR DIGITAL CREATORS</span><div><ImageIcon size={17}/> Photography & design</div><div><Video size={17}/> Video & motion</div><div><Network size={17}/> Creative studios</div></div></section>
   <section className="features section-pad"><div className="container"><div className="section-head"><div><div className="kicker">WHAT WE PROTECT</div><h2>Mọi tác phẩm đều<br/>có một <i>nguồn gốc.</i></h2></div><p>Không chỉ đơn thuần lưu trữ. ToolNet Copyright tổ chức dữ liệu quyền sở hữu, lịch sử xuất bản và bằng chứng xác thực trong một hệ thống thống nhất.</p></div>
    <div className="feature-grid"><article className="feature feature-dark"><span className="feature-index">01 / ORIGINALS</span><div className="feature-graphic graphic-image"><ImageIcon size={64} strokeWidth={1.1}/></div><h3>Kho tác phẩm gốc</h3><p>Lưu trữ ảnh và video trên Cloudflare R2. Bản gốc giữ riêng tư, chỉ công khai khi được bạn cho phép.</p><ArrowUpRight size={20}/></article>
    <article className="feature"><span className="feature-index">02 / INTEGRITY</span><div className="feature-graphic graphic-hash"><Fingerprint size={68} strokeWidth={1.1}/></div><h3>Dấu vân tay SHA-256</h3><p>Đối chiếu nội dung file và ghi nhận dấu vết xử lý. Mỗi tác phẩm có mã hồ sơ độc lập.</p><ArrowUpRight size={20}/></article>
    <article className="feature"><span className="feature-index">03 / PROTECTION</span><div className="feature-graphic graphic-shield"><ScanSearch size={68} strokeWidth={1.1}/></div><h3>Hồ sơ vi phạm</h3><p>Liên kết tác phẩm gốc với URL nghi sao chép để quản lý quy trình xử lý bản quyền.</p><ArrowUpRight size={20}/></article></div>
   </div></section>
   <section id="how" className="process section-pad"><div className="container process-inner"><div><div className="kicker">THE PROVENANCE PROCESS</div><h2>Minh bạch từ<br/><i>tệp gốc đầu tiên.</i></h2><p>Thiết kế để các bằng chứng có thể kiểm tra lại, không thay thế giấy chứng nhận quyền tác giả hay xác quyết của cơ quan pháp lý.</p><Link className="text-link" href="/dashboard/new">Bắt đầu lưu hồ sơ <MoveUpRight size={17}/></Link></div><div className="steps"><div><span>01</span><div><h3>Đăng tải tác phẩm</h3><p>Ảnh, video và mô tả về chủ sở hữu hoặc cơ sở quyền.</p></div><CloudGlyph/></div><div><span>02</span><div><h3>Xác minh tính toàn vẹn</h3><p>Đọc file từ R2, kiểm tra hash và lưu lịch sử bất biến ở mức ứng dụng.</p></div><Fingerprint size={21}/></div><div><span>03</span><div><h3>Công bố & quản lý vi phạm</h3><p>Trang tác phẩm công khai, lưu URL bị nghi vi phạm để đối chiếu.</p></div><Clock3 size={21}/></div></div></div></section>
   <section className="cta-section"><div className="container cta-inner"><div><div className="kicker">YOUR WORK. YOUR RECORD.</div><h2>Để tác phẩm được<br/><i>ghi nhận đúng cách.</i></h2></div><Link href="/dashboard/new" className="btn btn-white">Tạo hồ sơ đầu tiên <ArrowUpRight size={18}/></Link></div></section>
  </main>;
}
function CloudGlyph(){return <FileLock2 size={21}/>;}
