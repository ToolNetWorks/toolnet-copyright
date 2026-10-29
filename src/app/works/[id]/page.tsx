import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Clock3, ImageIcon, ShieldCheck } from 'lucide-react';
import { notFound } from 'next/navigation';
import CertificateActions from '@/components/certificate-actions';
import { getPublicWork, permanentWorkUrl } from '@/lib/public-work';
import { formatViDate } from '@/lib/time-claims';
import './certificate.css';

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

function RecordRow({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <tr className={className}><th scope="row">{label}</th><td>{children}</td></tr>;
}

export default async function Work({ params }: Context) {
  const work = await getPublicWork((await params).id);
  if (!work) notFound();
  const { asset, tumblr, integrityVerified, published, previewKey } = work;
  const permanentUrl = permanentWorkUrl(asset.id);
  const microtext = Buffer.from(permanentUrl, 'utf8').toString('base64');
  const qr = await QRCode.toDataURL(permanentUrl, {
    errorCorrectionLevel: 'M', margin: 4, width: 240, color: { dark: '#171717', light: '#ffffffff' },
  });
  const ownership = asset.owner_basis === 'original_creator' ? 'Tác giả / chủ sở hữu gốc'
    : asset.owner_basis === 'rights_transfer' ? 'Chuyển giao quyền' : 'Quyền sử dụng độc quyền';
  const status = integrityVerified ? 'Đã xác minh SHA-256' : 'Chờ xác minh SHA-256';

  return <main className="certificate-page">
    <header className="certificate-site-header">
      <div className="certificate-site-header-inner">
        <Link href="/" className="certificate-brand">TOOLNET COPYRIGHT <span>Digital Ownership Registry</span></Link>
        <nav aria-label="Điều hướng hồ sơ"><Link href="/">Trang chủ</Link><Link href="/dashboard">Tài khoản</Link><Link href="/methodology">Phương pháp</Link></nav>
      </div>
    </header>
    <div className="certificate-shell">
      <article className="certificate" aria-labelledby="certificate-title">
        <header className="certificate-header">
          <div className="certificate-status" data-integrity={integrityVerified ? 'verified' : 'pending'}>
            <span className="certificate-status-icon">{integrityVerified ? <ShieldCheck size={19} aria-hidden="true"/> : <Clock3 size={19} aria-hidden="true"/>}</span>
            <div><span className="certificate-badge-brand">TOOLNET COPYRIGHT</span><strong>{status}</strong></div>
          </div>
          <div className="certificate-record"><span>Hồ sơ số {asset.id.slice(0, 8).toUpperCase()}</span><span>Document ID: {asset.id}</span></div>
        </header>

        <section aria-labelledby="work-info-heading">
          <h2 id="work-info-heading" className="certificate-section-heading">Work Information</h2>
          <table className="certificate-table" aria-labelledby="work-info-heading"><tbody>
            <RecordRow label="Work Title"><h1 id="certificate-title">{asset.title}</h1></RecordRow>
            <RecordRow label="Publication Status">{published ? 'Đã công bố trên ToolNet' : 'Đã đăng Tumblr · Chưa công bố trên ToolNet'}</RecordRow>
            <RecordRow label="Owner" className="certificate-owner">{asset.owner_name}</RecordRow>
            <RecordRow label="Ownership Basis">{ownership}</RecordRow>
            <RecordRow label="Original Creation Date"><span>{formatViDate(asset.original_created_at)}</span><small className="certificate-field-note">Ngày sáng tạo gốc (chủ sở hữu khai báo)</small></RecordRow>
            <RecordRow label="Ngày tải lên ToolNet (hệ thống ghi nhận)">{formatViDate(asset.created_at)}</RecordRow>
            <RecordRow label="Work Type">{asset.media_type === 'image' ? 'Hình ảnh (Photograph)' : 'Video'}</RecordRow>
            <RecordRow label="Permanent URL"><a className="certificate-url" href={permanentUrl}>{permanentUrl}</a></RecordRow>
            {tumblr && <RecordRow label="External Publication"><a href={tumblr.tumblr_url} target="_blank" rel="noopener noreferrer">Bài đăng Tumblr ↗</a></RecordRow>}
            <RecordRow label="Preview">
              <figure className="certificate-preview" aria-label="Bản xem trước tác phẩm">
                {previewKey ? asset.media_type === 'image'
                  ? <Image src={`/api/works/${asset.id}/preview`} alt={`Bản xem trước: ${asset.title}`} width={1200} height={900} unoptimized className="certificate-preview-image"/>
                  : <video controls preload="metadata" src={`/api/works/${asset.id}/preview`} aria-label={`Bản xem trước video: ${asset.title}`}/>
                  : <div className="certificate-no-preview"><ImageIcon size={24} aria-hidden="true"/><span>Chưa có bản xem trước.</span></div>}
              </figure>
              <small className="certificate-field-note">Bản xem trước · Bản gốc được lưu riêng tư</small>
            </RecordRow>
          </tbody></table>
        </section>

        <section className="certificate-evidence" aria-labelledby="integrity-heading">
          <h2 id="integrity-heading" className="certificate-section-heading">File Integrity &amp; Technical Evidence</h2>
          <table className="certificate-table" aria-labelledby="integrity-heading"><tbody>
            <RecordRow label="SHA-256">{integrityVerified ? <code className="certificate-hash">{asset.sha256}</code> : <span className="certificate-muted">Chưa có kết quả đối chiếu tệp.</span>}</RecordRow>
            {integrityVerified && <RecordRow label="Ngày xác minh file (hệ thống ghi nhận)">{formatViDate(asset.verified_at)}</RecordRow>}
            {published && asset.published_at && <RecordRow label="Ngày công bố trên ToolNet (hệ thống ghi nhận)">{formatViDate(asset.published_at)}</RecordRow>}
            {tumblr && <RecordRow label="Tumblr Post ID"><code>{tumblr.tumblr_post_id}</code></RecordRow>}
          </tbody></table>
        </section>

        <section className="certificate-declaration" aria-labelledby="ownership-heading">
          <h2 id="ownership-heading">Copyright Ownership Declaration</h2>
          <p>Chủ sở hữu khai báo quyền đối với tác phẩm theo cơ sở: <strong>{ownership.toLowerCase()}</strong>.</p>
          {published && asset.description && <p className="certificate-description">{asset.description}</p>}
        </section>

        <section className="certificate-permalink" aria-labelledby="permalink-heading">
          <a className="certificate-qr" href={permanentUrl} aria-label="Mở Permanent URL của tác phẩm"><Image src={qr} width={110} height={110} alt="QR code mở hồ sơ tác phẩm" unoptimized/></a>
          <div className="certificate-permalink-content"><h2 id="permalink-heading">Permanent Link &amp; Record</h2><a className="certificate-link-display" href={permanentUrl}>{permanentUrl}</a><p>Quét QR để mở bản ghi này trên ToolNet Copyright.</p><CertificateActions url={permanentUrl} title={asset.title}/></div>
        </section>

        <footer className="certificate-footer">
          <p>© {new Date().getFullYear()} ToolNet Copyright — Digital Ownership Registry.</p>
          <p className="certificate-notice">Ngày sáng tạo là khai báo của chủ sở hữu. SHA-256 chỉ đối chiếu tính toàn vẹn tệp. Bản ghi này không thay thế đăng ký quyền tác giả tại cơ quan nhà nước và không phải chứng nhận pháp lý của DMCA.</p>
          <div className="certificate-microtext" aria-label="Mã định danh URL"><code data-permanent-url-base64={microtext}>{microtext}</code><span>Base64 của Permanent URL, không phải chữ ký số hoặc bằng chứng xác thực độc lập.</span></div>
        </footer>
      </article>
    </div>
  </main>;
}
