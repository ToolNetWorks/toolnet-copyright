'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CloudUpload, FileVideo2, Image as ImageIcon, CheckCircle2, Loader2, CalendarClock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SOURCE_LABELS, TIME_CLAIM_SOURCES } from '@/lib/time-claims';

const MAX_SIZE = 250 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
type ClaimedDate = 'originalCreatedAt' | 'originalCapturedAt' | 'originalPublishedAt' | 'copyrightEffectiveAt';
const CLAIM_FIELDS: { key: ClaimedDate; label: string; hint: string }[] = [
  { key: 'originalCreatedAt', label: 'Ngày sáng tạo gốc', hint: 'Ngày thực tế bạn tạo tác phẩm' },
  { key: 'originalCapturedAt', label: 'Ngày chụp / quay', hint: 'Nếu biết ngày chụp hoặc quay từ file gốc' },
  { key: 'originalPublishedAt', label: 'Ngày công bố lần đầu', hint: 'Nếu đã đăng trên nền tảng khác' },
  { key: 'copyrightEffectiveAt', label: 'Ngày bắt đầu có quyền', hint: 'Theo quá trình sáng tạo hoặc hợp đồng, nếu có' },
];

// Native datetime-local carries no time zone. Treat the value as VN local civil time.
function asVietnamIso(value: string): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Ngày giờ phải đúng định dạng.');
  const date = new Date(`${value}:00+07:00`);
  if (Number.isNaN(date.getTime()) || new Date(date.getTime() + 7 * 3600_000).toISOString().slice(0, 16) !== value) {
    throw new Error('Ngày giờ khai báo không hợp lệ.');
  }
  return date.toISOString();
}

export default function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerBasis, setOwnerBasis] = useState('original_creator');
  const [confirmedRights, setConfirmedRights] = useState(false);
  const [confirmedDeclaration, setConfirmedDeclaration] = useState(false);
  const [dates, setDates] = useState<Record<ClaimedDate, string>>({
    originalCreatedAt: '', originalCapturedAt: '', originalPublishedAt: '', copyrightEffectiveAt: '',
  });
  const [claimSource, setClaimSource] = useState<(typeof TIME_CLAIM_SOURCES)[number]>('owner_declaration');
  const [claimReference, setClaimReference] = useState('');
  const [confirmedDates, setConfirmedDates] = useState(false);
  const [showMoreDates, setShowMoreDates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadedAssetId, setUploadedAssetId] = useState<string | null>(null);
  const [claimSaved, setClaimSaved] = useState(false);
  const [tumblrUrl, setTumblrUrl] = useState<string | null>(null);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!uploadedAssetId && (!file || !ALLOWED.includes(file.type) || file.size > MAX_SIZE)) {
      setError('File không hợp lệ hoặc vượt quá 250 MB.'); return;
    }
    if (!confirmedRights) { setError('Bạn cần xác nhận quyền sở hữu hợp pháp.'); return; }
    if (file?.type.startsWith('image/') && (!confirmedDeclaration || ownerBasis !== 'original_creator')) {
      setError('Mẫu Tumblr tuyên bố tác giả gốc, sở hữu độc quyền và ảnh tạo tại Nhật Bản. Chỉ tiếp tục nếu bạn xác nhận chính xác các nội dung này.'); return;
    }
    const isPhoto = file?.type.startsWith('image/') ?? false;
    const hasDates = Object.values(dates).some(Boolean);
    if (isPhoto && !dates.originalCreatedAt) { setError('Vui lòng chọn ngày sáng tạo gốc để đăng Tumblr.'); return; }
    if (hasDates && !confirmedDates) { setError('Vui lòng xác nhận các ngày khai báo là trung thực.'); return; }

    setBusy(true); setError('');
    try {
      const claimedDates = {
        originalCreatedAt: asVietnamIso(dates.originalCreatedAt),
        originalCapturedAt: asVietnamIso(dates.originalCapturedAt),
        originalPublishedAt: asVietnamIso(dates.originalPublishedAt),
        copyrightEffectiveAt: asVietnamIso(dates.copyrightEffectiveAt),
      };
      if (claimedDates.originalCreatedAt && claimedDates.originalPublishedAt &&
          Date.parse(claimedDates.originalPublishedAt) < Date.parse(claimedDates.originalCreatedAt)) {
        throw new Error('Ngày công bố đầu tiên không thể sớm hơn ngày sáng tạo gốc.');
      }
      for (const value of [claimedDates.originalCreatedAt, claimedDates.originalCapturedAt, claimedDates.originalPublishedAt]) {
        if (value && Date.parse(value) > Date.now()) throw new Error('Không được khai báo sự kiện đã xảy ra trong tương lai.');
      }

      let id = uploadedAssetId;
      if (!id) {
        setStage('Đang tạo hồ sơ tác phẩm…');
        const response = await fetch('/api/assets/initiate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, ownerName, ownerBasis, filename: file!.name,
            size: file!.size, mime: file!.type, confirmedRights }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Không thể tạo hồ sơ.');
        setStage('Đang tải bản gốc riêng tư lên Cloudflare R2…');
        const upload = await fetch(data.uploadUrl, {
          method: 'PUT', headers: { 'Content-Type': file!.type }, body: file!,
        });
        if (!upload.ok) throw new Error(`Tải lên R2 thất bại (${upload.status}). Kiểm tra CORS bucket.`);
        setStage('Đang kiểm tra loại và kích thước file…');
        const finished = await fetch('/api/assets/complete', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: data.id }),
        });
        const result = await finished.json();
        if (!finished.ok) throw new Error(result.error ?? 'Không thể hoàn tất tải lên.');
        id = data.id;
        setUploadedAssetId(id); // On time-claim failure, retry without uploading again.
      }

      if (hasDates && !claimSaved) {
        setStage('Đang lưu ngày gốc do bạn khai báo vào Neon…');
        const response = await fetch(`/api/assets/${id}/time-claims`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expectedVersion: 0, ...claimedDates, timeClaimSource: claimSource,
            timeClaimReference: claimReference.trim(),
            correctionReason: 'Khai báo thời gian gốc khi đăng ký tác phẩm.', acknowledged: true,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Không thể lưu thông tin ngày gốc.');
        setClaimSaved(true);
      }
      if (isPhoto && !tumblrUrl) {
        setStage('Đang đăng ảnh lên Tumblr với ngày hiển thị đã chọn…');
        const tumblrResponse = await fetch(`/api/assets/${id}/tumblr`, { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ declarationConfirmed: true }) });
        const tumblr = await tumblrResponse.json();
        if (!tumblrResponse.ok) throw new Error(tumblr.error ?? 'Không thể đăng lên Tumblr.');
        if (!tumblr.url) throw new Error('Tumblr không trả về URL bài viết.');
        setTumblrUrl(tumblr.url);
      }
      router.push('/dashboard?uploaded=1');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Có lỗi xảy ra.');
    } finally { setBusy(false); setStage(''); }
  }

  const dateInput = (field: typeof CLAIM_FIELDS[number]) => (
    <label key={field.key} className="upload-date-field">
      <span>{field.label} <small>{field.key === 'originalCreatedAt' ? '(bắt buộc cho Tumblr)' : '(tùy chọn)'}</small></span>
      <input type="datetime-local" disabled={claimSaved} value={dates[field.key]}
        onChange={event => setDates(previous => ({ ...previous, [field.key]: event.target.value }))}/>
      <small>{field.hint} · giờ Việt Nam UTC+7</small>
    </label>
  );

  return <form className="upload-form" onSubmit={submit}>
    <div className="upload-step-heading"><span>01</span><div><strong>Chọn file và điền thông tin</strong><small>Ảnh hoặc video gốc được lưu riêng tư.</small></div></div>
    <label className="drop-zone"><input disabled={!!uploadedAssetId} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={e => {
      const selected = e.target.files?.[0] ?? null; setFile(selected);
      if (selected && !title) setTitle(selected.name.replace(/\.[^.]+$/, ''));
    }}/>
      <span className="drop-icon">{file?.type.startsWith('video/') ? <FileVideo2 size={24}/> : file ? <ImageIcon size={24}/> : <CloudUpload size={26}/>}</span>
      <strong>{file ? file.name : 'Chọn ảnh hoặc video gốc'}</strong>
      <small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'JPG, PNG, WEBP, MP4, WEBM, MOV · tối đa 250 MB'}</small>
    </label>
    <div className="form-grid">
      <label>Tiêu đề tác phẩm<input required minLength={2} maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="Tên tác phẩm" /></label>
      <label>Chủ sở hữu quyền<input required minLength={2} maxLength={200} value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Tên cá nhân hoặc pháp nhân" /></label>
    </div>
    <label>Cơ sở quyền sở hữu<select value={ownerBasis} onChange={e => setOwnerBasis(e.target.value)}><option value="original_creator">Tác giả / chủ sở hữu gốc</option><option value="rights_transfer">Có hợp đồng chuyển giao quyền</option><option value="exclusive_license">Có giấy phép độc quyền phù hợp</option></select></label>
    <label>Mô tả / nguồn gốc (tùy chọn)<textarea maxLength={2000} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Quá trình sáng tạo hoặc nguồn gốc tác phẩm…" /></label>

    <section className="upload-time-section" aria-label="Thời gian gốc tác phẩm">
      <div className="upload-step-heading"><span>02</span><div><strong><CalendarClock size={18}/> Ngày tạo gốc — chỉnh trước SHA-256</strong><small>Nhập ngày thực tế; không bắt buộc điền đủ các mốc.</small></div></div>
      <p className="upload-time-note">Ngày này sẽ được gửi tới Tumblr làm <b>ngày hiển thị</b> của bài viết, nếu nền tảng chấp nhận. Đây là ngày do bạn khai báo, không phải chứng cứ bài Tumblr đã tồn tại từ thời điểm đó. Ngày upload và ngày xác minh thực tế được lưu riêng.</p>
      <div className="upload-time-fields">{dateInput(CLAIM_FIELDS[0])}</div>
      <button className="upload-more-dates" type="button" aria-expanded={showMoreDates} onClick={() => setShowMoreDates(previous => !previous)}>
        {showMoreDates ? '− Ẩn các mốc khác' : '+ Thêm ngày chụp/quay, ngày công bố và ngày bắt đầu có quyền'}
      </button>
      {showMoreDates && <div className="upload-time-fields">{CLAIM_FIELDS.slice(1).map(dateInput)}</div>}
      <div className="form-grid">
        <label>Nguồn xác định ngày
          <select value={claimSource} onChange={event => setClaimSource(event.target.value as typeof claimSource)}>
            {TIME_CLAIM_SOURCES.map(value => <option key={value} value={value}>{SOURCE_LABELS[value]}</option>)}
          </select>
        </label>
        <label>Liên kết hoặc mã chứng cứ (tùy chọn)
          <input maxLength={2048} value={claimReference} onChange={event => setClaimReference(event.target.value)} placeholder="URL bài đăng cũ hoặc mã hồ sơ"/>
        </label>
      </div>
      <label className="checkbox-line"><input type="checkbox" checked={confirmedDates} onChange={e => setConfirmedDates(e.target.checked)}/><span>Tôi xác nhận ngày đã nhập là thông tin khai báo trung thực; không phải mốc xác minh độc lập.</span></label>
    </section>

    <div className="upload-step-heading"><span>03</span><div><strong>Tự động đăng Tumblr rồi xác minh SHA-256</strong><small>Ảnh: đăng preview lên Tumblr, lưu URL, rồi xác minh SHA-256. Video: xác minh trước, đăng liên kết sau công bố.</small></div></div>
    <label className="checkbox-line"><input type="checkbox" checked={confirmedRights} onChange={e => setConfirmedRights(e.target.checked)}/><span>Tôi xác nhận có đủ quyền hợp pháp để lưu trữ và công bố tác phẩm này.</span></label>
    {file?.type.startsWith('image/') && <label className="checkbox-line"><input type="checkbox" checked={confirmedDeclaration} onChange={e => setConfirmedDeclaration(e.target.checked)}/><span>Tôi xác nhận có thẩm quyền ký tuyên bố dưới tên copyright-toolnet; tác phẩm do tôi tạo, thuộc sở hữu độc quyền, được tạo tại Nhật Bản và các nội dung tuyên bố dưới lời cam đoan là trung thực. Ngày ký tuyên bố sẽ là ngày gửi bài thực tế.</span></label>}
    {error && <div className="error-banner" role="alert">{error}{uploadedAssetId && <p>File đã upload. Nếu Tumblr từ chối ngày cũ, kiểm tra Dashboard và blog trước khi thử lại để tránh đăng trùng.</p>}</div>}
    {tumblrUrl && <p className="helper">Bài Tumblr: <a href={tumblrUrl} target="_blank" rel="noopener noreferrer">{tumblrUrl}</a></p>}
    {stage && busy && <p className="muted"><Loader2 size={15} className="spin inline-icon"/> {stage}</p>}
    <button disabled={busy} className="btn" type="submit">{busy ? <Loader2 size={17} className="spin"/> : <><CheckCircle2 size={17}/>{uploadedAssetId ? 'Tiếp tục quy trình đăng ký' : file?.type.startsWith('video/') ? 'Upload video → chờ SHA-256' : 'Upload ảnh → đăng Tumblr → chờ SHA-256'}</>}</button>
    <p className="helper">Ngày quá khứ trên Tumblr là ngày hiển thị do bạn chọn, không chứng minh bài đăng tồn tại từ thời điểm đó. Ngày gửi bài thực tế vẫn được lưu trong Neon. Sau khi đăng, <Link href="/dashboard">vào Dashboard</Link> để nhấn SHA-256.</p>
  </form>;
}
