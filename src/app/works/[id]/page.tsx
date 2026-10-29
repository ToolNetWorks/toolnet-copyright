import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import QRCode from 'qrcode';
import { ArrowLeft, ArrowUpRight, Check, CircleCheck, Clock3, ExternalLink, FileCheck2, Fingerprint, ImageIcon, Link2, LockKeyhole, Shield, ShieldCheck } from 'lucide-react';
import { notFound } from 'next/navigation';
import CertificateActions from '@/components/certificate-actions';
import { getPublicWork, permanentWorkUrl } from '@/lib/public-work';
import { formatViDate } from '@/lib/time-claims';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Context): Promise<Metadata> {
  const work = await getPublicWork((await params).id);
  if (!work) return { title: 'Tác phẩm không tồn tại', robots: { index: false, follow: false } };
  return {
    title: `${work.asset.title} | Hồ sơ tác phẩm`,
    description: `Hồ sơ khai báo tác phẩm của ${work.asset.owner_name} trên ToolNet Copyright.`,
    alternates: { canonical: permanentWorkUrl(work.asset.id) },
    robots: { index: work.published, follow: work.published },
  };
}

export default async function Work({ params }: Context) {
  const work = await getPublicWork((await params).id);
  if (!work) notFound();
  const { asset, tumblr, integrityVerified, published, previewKey } = work;
  const permanentUrl = permanentWorkUrl(asset.id);
  const microtext = Buffer.from(permanentUrl, 'utf8').toString('base64');
  const qr = await QRCode.toDataURL(permanentUrl, {
    errorCorrectionLevel: 'M', margin: 4, width: 240, color: { dark: '#111111', light: '#ffffffff' },
  });
  const status = published ? 'Đã xác minh & công bố' : integrityVerified ? 'Đã xác minh · Chờ công bố' : 'Đã đăng Tumblr · Chờ xác minh';
  const ownership = asset.owner_basis === 'original_creator' ? 'Tác giả / chủ sở hữu gốc'
    : asset.owner_basis === 'rights_transfer' ? 'Chuyển giao quyền' : 'Quyền sử dụng độc quyền';

  return <main className="certificate-page">
    <div className="certificate-shell">
      <nav className="certificate-breadcrumb" aria-label="Đường dẫn">
        <Link href="/registry"><ArrowLeft size={14} aria-hidden="true"/> Kho tác phẩm</Link>
        <span>Hồ sơ tác phẩm</span>
      </nav>
      <article className={`certificate ${integrityVerified ? 'certificate-verified' : 'certificate-pending'}`} aria-labelledby="certificate-title">
        <div className="certificate-paper">
          <header className="certificate-masthead">
            <Link href="/" className="certificate-brand" aria-label="ToolNet Copyright — Trang chủ">
              <span className="certificate-brand-icon"><Fingerprint size={30} strokeWidth={1.4} aria-hidden="true"/></span>
              <span>TOOLNET<strong>COPYRIGHT</strong></span>
            </Link>
            <div className="certificate-heading"><span>TOOLNET COPYRIGHT REGISTRY</span><p>Hồ sơ bảo vệ bản quyền</p></div>
            <div className="certificate-edition"><span>RECORD NO.</span><strong>{asset.id.slice(0, 8).toUpperCase()}</strong><span>TOOLNET REGISTRY</span></div>
          </header>
          <div className="certificate-grid">
            <aside className="certificate-protection" aria-label="Trạng thái hồ sơ">
              <div className="certificate-seal">
                <span className="certificate-seal-top">TOOLNET COPYRIGHT</span>
                {integrityVerified ? <ShieldCheck size={54} strokeWidth={1.15} aria-hidden="true"/> : <Shield size={54} strokeWidth={1.15} aria-hidden="true"/>}
                <strong>{integrityVerified ? 'SHA-256' : 'PENDING'}</strong>
                <span className="certificate-seal-bottom">{integrityVerified ? 'INTEGRITY VERIFIED' : 'INTEGRITY CHECK'}</span>
              </div>
              <span className="certificate-overline">TRẠNG THÁI HỒ SƠ</span>
              <h2>{integrityVerified ? 'Toàn vẹn tệp đã xác minh' : 'Đang chờ xác minh tệp'}</h2>
              <p className="certificate-protection-note">{integrityVerified
                ? 'SHA-256 của tệp nguồn đã được đối chiếu với bản lưu trữ.'
                : 'Ảnh đã được đăng Tumblr. SHA-256 của tệp nguồn chưa được kiểm tra.'}</p>
              <div className="certificate-protection-list">
                <div><CircleCheck size={17} aria-hidden="true"/><span><strong>Đăng ký tác phẩm</strong>Hồ sơ đã ghi nhận</span></div>
                <div><LockKeyhole size={17} aria-hidden="true"/><span><strong>Lưu trữ tệp nguồn</strong>Bản gốc lưu riêng tư</span></div>
                <div>{integrityVerified ? <CircleCheck size={17} aria-hidden="true"/> : <Clock3 size={17} aria-hidden="true"/>}<span><strong>Xác minh toàn vẹn</strong>{integrityVerified ? 'Đã kiểm tra SHA-256' : 'Chờ kiểm tra SHA-256'}</span></div>
              </div>
              <p className="certificate-seal-disclaimer">Bản ghi kỹ thuật của ToolNet.<br/>Không phải xác thực pháp lý của DMCA.</p>
            </aside>
            <section className="certificate-work" aria-label="Tác phẩm">
              <div className="certificate-work-heading"><span className="certificate-overline">TÁC PHẨM ĐĂNG KÝ</span><span className="certificate-media-type">{asset.media_type === 'image' ? 'HÌNH ẢNH' : 'VIDEO'}</span></div>
              <h1 id="certificate-title">{asset.title}</h1>
              <p className="certificate-byline">Khai báo bởi <strong>{asset.owner_name}</strong></p>
              <figure className="certificate-preview">
                <div className="certificate-preview-frame">
                  {previewKey ? asset.media_type === 'image'
                    ? <Image src={`/api/works/${asset.id}/preview`} alt={`Bản xem trước: ${asset.title}`} width={1200} height={900} unoptimized className="certificate-preview-image"/>
                    : <video controls preload="metadata" src={`/api/works/${asset.id}/preview`} aria-label={`Bản xem trước video: ${asset.title}`}/>
                    : <div className="certificate-preview-placeholder"><ImageIcon size={38} strokeWidth={1} aria-hidden="true"/><span>Chưa có bản xem trước để hiển thị</span></div>}
                  <span className="certificate-preview-label"><LockKeyhole size={13} aria-hidden="true"/> BẢN XEM TRƯỚC</span>
                </div>
                <figcaption>Chỉ hiển thị bản xem trước. Tệp nguồn được lưu trong kho riêng tư.</figcaption>
              </figure>
              <div className="certificate-state"><span aria-hidden="true"/>{status}</div>
              <p className="certificate-record-note">Trạng thái được cập nhật theo kết quả kiểm tra thực tế.</p>
            </section>
            <aside className="certificate-metadata" aria-label="Thông tin và liên kết cố định">
              <div className="certificate-permalink">
                <h2><Link2 size={14} aria-hidden="true"/> PERMANENT URL</h2>
                <a className="certificate-url" href={permanentUrl}>{permanentUrl}</a>
                <a className="certificate-qr" href={permanentUrl} aria-label="Mở Permanent URL của tác phẩm">
                  <Image src={qr} width={144} height={144} alt="QR code mở liên kết cố định của tác phẩm" unoptimized/>
                </a>
                <p>Quét mã để mở hồ sơ này</p>
              </div>
              <dl className="certificate-facts">
                <div><dt>Chủ sở hữu khai báo</dt><dd>{asset.owner_name}</dd></div>
                <div><dt>Ngày sáng tạo gốc (chủ sở hữu khai báo)</dt><dd>{formatViDate(asset.original_created_at)}</dd><small>Thông tin khai báo · Giờ Việt Nam</small></div>
                <div><dt>Cơ sở quyền khai báo</dt><dd>{ownership}</dd></div>
                <div><dt>Loại tác phẩm</dt><dd>{asset.media_type === 'image' ? 'Hình ảnh' : 'Video'}</dd></div>
                <div><dt>Mã định danh tác phẩm</dt><dd className="certificate-uuid">{asset.id}</dd></div>
                <div className="certificate-owner-materials"><dt>Logo và chữ ký chủ sở hữu</dt><dd>Chưa được cung cấp trong hồ sơ.</dd></div>
              </dl>
            </aside>
          </div>
          <div className="certificate-declaration-grid">
          <section className="certificate-declaration" aria-labelledby="ownership-heading">
            <div className="certificate-section-heading"><FileCheck2 size={20} strokeWidth={1.5} aria-hidden="true"/><div><span className="certificate-overline">OWNER-DECLARED INFORMATION</span><h2 id="ownership-heading">Copyright Ownership Declaration</h2></div></div>
            <p>Chủ sở hữu được khai báo là <strong>{asset.owner_name}</strong>, với cơ sở quyền <strong>{ownership.toLowerCase()}</strong> đối với tác phẩm <strong>“{asset.title}”</strong>. Ngày sáng tạo gốc được chủ sở hữu khai báo: <strong>{formatViDate(asset.original_created_at)}</strong>.</p>
            {published && asset.description && <p className="certificate-description">{asset.description}</p>}
            <p className="certificate-declaration-note">Nội dung trên được trích từ hồ sơ do chủ sở hữu cung cấp. Bản ghi này không tự xác nhận quyền tác giả, không phải chứng nhận pháp lý và không được DMCA xác thực.</p>
          </section>
          <section className="certificate-license" aria-labelledby="license-heading">
            <div className="certificate-section-heading"><FileCheck2 size={20} strokeWidth={1.5} aria-hidden="true"/><div><span className="certificate-overline">THÔNG TIN GIẤY PHÉP</span><h2 id="license-heading">License information</h2></div></div>
            <dl><div><dt>Cơ sở quyền được khai báo</dt><dd>{ownership}</dd></div><div><dt>Điều khoản cấp phép sử dụng</dt><dd>Chưa được cung cấp trong hồ sơ.</dd></div></dl>
            <p>Việc hiển thị tác phẩm trên trang này không tự cấp quyền sao chép, phân phối hoặc sử dụng tác phẩm.</p>
          </section>
          </div>
          <div className="certificate-evidence-grid">
            <section className="certificate-integrity" aria-labelledby="integrity-heading">
              <div className="certificate-section-heading"><Fingerprint size={21} strokeWidth={1.5} aria-hidden="true"/><div><span className="certificate-overline">FILE INTEGRITY</span><h2 id="integrity-heading">{integrityVerified ? 'SHA-256 đã xác minh' : 'Chờ xác minh SHA-256'}</h2></div></div>
              {integrityVerified ? <><code className="certificate-hash">{asset.sha256}</code><p>Giá trị băm xác minh tính toàn vẹn tệp, không tự chứng minh quyền sở hữu hay thời điểm sáng tạo.</p></>
                : <p>Chưa có kết quả đối chiếu tệp nguồn. Hồ sơ sẽ cập nhật sau khi quản trị viên thực hiện xác minh SHA-256.</p>}
            </section>
            <section className="certificate-publication" aria-labelledby="publication-heading">
              <div className="certificate-section-heading"><ExternalLink size={19} strokeWidth={1.5} aria-hidden="true"/><div><span className="certificate-overline">EXTERNAL PUBLICATION</span><h2 id="publication-heading">Bài đăng Tumblr</h2></div></div>
              {tumblr ? <><a href={tumblr.tumblr_url} target="_blank" rel="noopener noreferrer">Xem bài viết Tumblr <ArrowUpRight size={15} aria-hidden="true"/></a><span className="certificate-external-url">{tumblr.tumblr_url}</span></>
                : <p>Chưa có liên kết Tumblr được ghi nhận cho tác phẩm này.</p>}
              <p>Ngày hiển thị trên Tumblr có thể là ngày do chủ sở hữu chọn; không phải chứng cứ bài đăng đã tồn tại từ thời điểm đó.</p>
            </section>
          </div>
          <details className="certificate-timeline">
            <summary><Clock3 size={15} aria-hidden="true"/> Dấu thời gian hệ thống <span>Thời gian thao tác thực tế</span></summary>
            <dl>
              <div><dt>Ngày tải lên ToolNet (hệ thống ghi nhận)</dt><dd>{formatViDate(asset.created_at)}</dd></div>
              <div><dt>Ngày xác minh file (hệ thống ghi nhận)</dt><dd>{integrityVerified ? formatViDate(asset.verified_at) : 'Chưa xác minh'}</dd></div>
              <div><dt>Ngày công bố trên ToolNet (hệ thống ghi nhận)</dt><dd>{published ? formatViDate(asset.published_at) : 'Chưa công bố'}</dd></div>
            </dl>
          </details>
          <footer className="certificate-bottom">
            <div className="certificate-bottom-brand"><Shield size={20} aria-hidden="true"/><span>TOOLNET COPYRIGHT<small>Hồ sơ công khai theo UUID</small></span></div>
            <CertificateActions url={permanentUrl} title={asset.title}/>
          </footer>
        </div>
        <div className="certificate-microtext" aria-label="Mã định danh hiển thị Base64 của Permanent URL">
          <div className="certificate-microtext-line" data-permanent-url-base64={microtext}><span>TOOLNET · URL RECORD · </span><code>{microtext}</code></div>
          <p>Base64 của Permanent URL · Mã định danh hiển thị, không phải chữ ký số hoặc bằng chứng xác thực độc lập.</p>
        </div>
      </article>
      <div className="certificate-outside-note"><Check size={13} aria-hidden="true"/><span>Hồ sơ có thể cập nhật trạng thái. Permanent URL luôn sử dụng UUID của tác phẩm.</span></div>
    </div>
  </main>;
}
