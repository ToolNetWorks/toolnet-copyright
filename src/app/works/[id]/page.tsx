import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import QRCode from 'qrcode';
import { ArrowLeft, Clock3, ExternalLink, Fingerprint, ImageIcon, LockKeyhole, ShieldCheck } from 'lucide-react';
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
  const status = published ? 'Đã xác minh & công bố'
    : integrityVerified ? 'Đã xác minh SHA-256' : 'Chờ xác minh SHA-256';

  return <main className="certificate-page">
    <div className="certificate-shell">
      <Link href="/registry" className="certificate-back"><ArrowLeft size={14} aria-hidden="true"/> Kho tác phẩm</Link>
      <article className="certificate" aria-labelledby="certificate-title">
        <div className="certificate-inner">
          <header className="certificate-header">
            <Link href="/" className="certificate-brand" aria-label="ToolNet Copyright — Trang chủ">
              <Fingerprint size={29} strokeWidth={1.6} aria-hidden="true"/>
              <span>TOOLNET<strong>COPYRIGHT</strong></span>
            </Link>
            <div className="certificate-record"><span>Mã hồ sơ</span><strong>{asset.id.slice(0, 8).toUpperCase()}</strong></div>
          </header>

          <div className="certificate-layout">
            <section className="certificate-title-block">
              <span className="certificate-label">Tác phẩm</span>
              <h1 id="certificate-title">{asset.title}</h1>
            </section>

            <aside className="certificate-protection" aria-label="Trạng thái hồ sơ">
              <div className="certificate-status" data-integrity={integrityVerified ? 'verified' : 'pending'}>
                {integrityVerified ? <ShieldCheck size={39} strokeWidth={1.5} aria-hidden="true"/> : <Clock3 size={39} strokeWidth={1.5} aria-hidden="true"/>}
                <span className="certificate-badge-brand">TOOLNET COPYRIGHT</span>
                <strong>{status}</strong>
              </div>
              <dl className="certificate-protection-info">
                <div><dt>Hồ sơ</dt><dd>{published ? 'Đã công bố trên ToolNet' : 'Đã đăng Tumblr'}</dd></div>
                <div><dt>Lưu trữ</dt><dd><LockKeyhole size={13} aria-hidden="true"/> Bản gốc riêng tư</dd></div>
              </dl>
            </aside>

            <figure className="certificate-preview" aria-label="Bản xem trước tác phẩm">
              {previewKey ? asset.media_type === 'image'
                ? <Image src={`/api/works/${asset.id}/preview`} alt={`Bản xem trước: ${asset.title}`} width={1200} height={900} unoptimized className="certificate-preview-image"/>
                : <video controls preload="metadata" src={`/api/works/${asset.id}/preview`} aria-label={`Bản xem trước video: ${asset.title}`}/>
                : <div className="certificate-no-preview"><ImageIcon size={28} strokeWidth={1.5} aria-hidden="true"/><span>Chưa có bản xem trước.</span></div>}
            </figure>

            <section className="certificate-owner" aria-label="Chủ sở hữu và ngày sáng tạo">
              <dl>
                <div><dt>Chủ sở hữu khai báo</dt><dd>{asset.owner_name}</dd></div>
                <div><dt>Ngày sáng tạo gốc (chủ sở hữu khai báo)</dt><dd>{formatViDate(asset.original_created_at)}</dd></div>
              </dl>
            </section>

            <aside className="certificate-permalink" aria-label="Liên kết và định danh">
              <div className="certificate-link-block">
                <div><h2>Permanent URL</h2><a className="certificate-url" href={permanentUrl}>{permanentUrl}</a></div>
                <a className="certificate-qr" href={permanentUrl} aria-label="Mở Permanent URL của tác phẩm">
                  <Image src={qr} width={136} height={136} alt="QR code mở hồ sơ tác phẩm" unoptimized/>
                </a>
              </div>
              <dl className="certificate-identity"><div><dt>UUID</dt><dd>{asset.id}</dd></div><div><dt>Loại tác phẩm</dt><dd>{asset.media_type === 'image' ? 'Hình ảnh' : 'Video'}</dd></div></dl>
            </aside>
          </div>

          <section className="certificate-declaration" aria-labelledby="ownership-heading">
            <h2 id="ownership-heading">Ownership Declaration</h2>
            <p>Chủ sở hữu khai báo quyền đối với tác phẩm theo cơ sở: <strong>{ownership.toLowerCase()}</strong>.</p>
            {published && asset.description && <p className="certificate-description">{asset.description}</p>}
          </section>

          <div className="certificate-evidence">
            <section className="certificate-integrity" aria-labelledby="integrity-heading">
              <h2 id="integrity-heading">SHA-256</h2>
              {integrityVerified ? <code className="certificate-hash">{asset.sha256}</code> : <p className="certificate-muted">Chưa có kết quả đối chiếu tệp.</p>}
            </section>
            {tumblr && <section className="certificate-publication" aria-labelledby="publication-heading">
              <h2 id="publication-heading">Chứng cứ Tumblr <ExternalLink size={13} aria-hidden="true"/></h2>
              <a className="certificate-tumblr-url" href={tumblr.tumblr_url} target="_blank" rel="noopener noreferrer">{tumblr.tumblr_url}</a>
              <p className="certificate-post-id">Post ID: <span>{tumblr.tumblr_post_id}</span></p>
            </section>}
          </div>

          <details className="certificate-timeline">
            <summary>Thời gian thao tác thực tế</summary>
            <dl>
              <div><dt>Ngày tải lên ToolNet (hệ thống ghi nhận)</dt><dd>{formatViDate(asset.created_at)}</dd></div>
              <div><dt>Ngày xác minh file (hệ thống ghi nhận)</dt><dd>{integrityVerified ? formatViDate(asset.verified_at) : 'Chưa ghi nhận'}</dd></div>
              <div><dt>Ngày công bố trên ToolNet (hệ thống ghi nhận)</dt><dd>{published ? formatViDate(asset.published_at) : 'Chưa ghi nhận'}</dd></div>
            </dl>
          </details>

          <footer className="certificate-footer">
            <p className="certificate-notice">Ngày sáng tạo là khai báo của chủ sở hữu; SHA-256 chỉ đối chiếu tính toàn vẹn tệp. Đây không phải chứng nhận pháp lý của DMCA.</p>
            <CertificateActions url={permanentUrl} title={asset.title}/>
          </footer>
          <div className="certificate-microtext" aria-label="Mã định danh URL">
            <code data-permanent-url-base64={microtext}>{microtext}</code>
            <span>Base64 của Permanent URL, không phải chữ ký số hoặc bằng chứng xác thực độc lập.</span>
          </div>
        </div>
      </article>
    </div>
  </main>;
}
