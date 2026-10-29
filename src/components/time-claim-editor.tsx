'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, CheckCircle2, ClipboardList, Loader2, ShieldAlert } from 'lucide-react';
import { SOURCE_LABELS, TIME_CLAIM_SOURCES, formatViDate, type TimeClaimVersion } from '@/lib/time-claims';

export type EditableTimeClaim = {
  id: string;
  title: string;
  created_at: string;
  verified_at: string | null;
  published_at: string | null;
  original_created_at: string | null;
  original_captured_at: string | null;
  original_published_at: string | null;
  copyright_effective_at: string | null;
  time_claim_source: string | null;
  time_claim_reference: string | null;
  time_claim_version: number;
  time_claim_updated_at: string | null;
};

type ClaimField = 'originalCreatedAt' | 'originalCapturedAt' | 'originalPublishedAt' | 'copyrightEffectiveAt';

const DATE_FIELDS: { key: ClaimField; label: string; hint: string }[] = [
  { key: 'originalCreatedAt', label: 'Ngày sáng tạo gốc (khai báo)', hint: 'Ngày tác phẩm được sáng tạo theo chứng cứ của bạn' },
  { key: 'originalCapturedAt', label: 'Ngày chụp / quay gốc (khai báo)', hint: 'Để trống nếu tác phẩm không có mốc này' },
  { key: 'originalPublishedAt', label: 'Ngày công bố lần đầu (khai báo)', hint: 'Ngày công bố trên nền tảng hoặc website khác, nếu có' },
  { key: 'copyrightEffectiveAt', label: 'Ngày bắt đầu có quyền (khai báo)', hint: 'Căn cứ hợp đồng hoặc quá trình sáng tạo, nếu áp dụng' },
];

// Input uses Vietnam civil time (UTC+07:00). UTC is retained in PostgreSQL.
function toVietnamLocal(value: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Date(parsed.getTime() + 7 * 3600_000).toISOString().slice(0, 16);
}

function fromVietnamLocal(value: string): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Sai định dạng ngày giờ');
  const parsed = new Date(`${value}:00+07:00`);
  if (Number.isNaN(parsed.getTime()) || toVietnamLocal(parsed.toISOString()) !== value) {
    throw new Error('Ngày giờ không hợp lệ');
  }
  return parsed.toISOString();
}

export default function TimeClaimEditor({ asset, history }: { asset: EditableTimeClaim; history: TimeClaimVersion[] }) {
  const router = useRouter();
  const [dates, setDates] = useState<Record<ClaimField, string>>({
    originalCreatedAt: toVietnamLocal(asset.original_created_at),
    originalCapturedAt: toVietnamLocal(asset.original_captured_at),
    originalPublishedAt: toVietnamLocal(asset.original_published_at),
    copyrightEffectiveAt: toVietnamLocal(asset.copyright_effective_at),
  });
  const [source, setSource] = useState(asset.time_claim_source || 'owner_declaration');
  const [reference, setReference] = useState(asset.time_claim_reference ?? '');
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!acknowledged || reason.trim().length < 10) {
      setError('Bạn cần xác nhận tính trung thực và nêu lý do (tối thiểu 10 ký tự).');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        expectedVersion: asset.time_claim_version,
        originalCreatedAt: fromVietnamLocal(dates.originalCreatedAt),
        originalCapturedAt: fromVietnamLocal(dates.originalCapturedAt),
        originalPublishedAt: fromVietnamLocal(dates.originalPublishedAt),
        copyrightEffectiveAt: fromVietnamLocal(dates.copyrightEffectiveAt),
        timeClaimSource: source,
        timeClaimReference: reference.trim(),
        correctionReason: reason.trim(),
        acknowledged,
      };
      const response = await fetch(`/api/assets/${asset.id}/time-claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Không thể cập nhật thông tin ngày giờ.');
      setNotice(`Đã lưu phiên bản ${result.version}. SHA-256 file và mốc thời gian xác minh không thay đổi.`);
      setReason('');
      setAcknowledged(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu thay đổi');
    } finally {
      setBusy(false);
    }
  }

  return <div className="time-claims-stack">
    <section className="panel padded-panel">
      <h2><CalendarClock size={20}/> Thời gian gốc do chủ sở hữu khai báo</h2>
      <p className="form-description">Bạn có thể đính chính các mốc khai báo. Thời gian dưới đây được nhập theo giờ Việt Nam (UTC+07:00); thời gian thực của hệ thống được lưu riêng và không thể thay đổi ở form này.</p>
      <form className="time-claim-form" onSubmit={save}>
        <div className="form-grid">
          {DATE_FIELDS.map(field => <label key={field.key}>
            {field.label}
            <input type="datetime-local" value={dates[field.key]}
              onChange={event => setDates(previous => ({ ...previous, [field.key]: event.target.value }))}/>
            <small>{field.hint}</small>
          </label>)}
        </div>
        <div className="form-grid">
          <label>Nguồn xác định ngày (do bạn khai báo)
            <select value={source} onChange={event => setSource(event.target.value)} required>
              {TIME_CLAIM_SOURCES.map(value => <option value={value} key={value}>{SOURCE_LABELS[value]}</option>)}
            </select>
          </label>
          <label>Liên kết / mã tài liệu chứng cứ (tùy chọn)
            <input value={reference} onChange={event => setReference(event.target.value)} maxLength={2048}
              placeholder="URL công bố cũ hoặc mã hồ sơ gốc"/>
          </label>
        </div>
        <label>Lý do thêm hoặc đính chính thời gian
          <textarea required rows={3} minLength={10} maxLength={1000} value={reason}
            onChange={event => setReason(event.target.value)}
            placeholder="Ví dụ: Đối chiếu ngày chụp với file RAW / lịch sử sáng tạo..."/>
        </label>
        <label className="checkbox-line">
          <input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)}/>
          <span>Tôi xác nhận đây là những mốc thời gian được khai báo trung thực, không phải dấu thời gian đã được bên thứ ba chứng thực. Mọi điều chỉnh sẽ lưu vĩnh viễn vào nhật ký.</span>
        </label>
        {error && <div className="error-banner" role="alert">{error}</div>}
        {notice && <div className="claim-success" role="status"><CheckCircle2 size={16}/>{notice}</div>}
        <button className="btn" type="submit" disabled={busy || !acknowledged || reason.trim().length < 10}>
          {busy ? <><Loader2 className="spin" size={17}/> Đang lưu…</> : <><CheckCircle2 size={17}/> Lưu phiên bản thời gian mới</>}
        </button>
      </form>
    </section>

    <section className="panel padded-panel">
      <h2><ShieldAlert size={20}/> Thời gian hệ thống — không chỉnh sửa</h2>
      <div className="claim-locked-grid">
        <div><span>Ngày tải tác phẩm lên ToolNet</span><strong>{formatViDate(asset.created_at)}</strong></div>
        <div><span>Ngày xác minh SHA-256</span><strong>{formatViDate(asset.verified_at)}</strong></div>
        <div><span>Ngày công bố trên ToolNet</span><strong>{formatViDate(asset.published_at)}</strong></div>
        <div><span>Lần cập nhật ngày khai báo gần nhất</span><strong>{formatViDate(asset.time_claim_updated_at)}</strong></div>
      </div>
    </section>

    <section className="panel padded-panel">
      <h2><ClipboardList size={20}/> Lịch sử khai báo và đính chính</h2>
      <p className="form-description">Phiên bản được lưu vào Neon dưới dạng chỉ thêm. Snapshot hash mô tả bản khai báo tại thời điểm ghi nhận, không xác nhận ngày đó là ngày tạo thật.</p>
      {history.length === 0 ? <p className="claim-empty">Chưa có phiên bản thời gian được khai báo.</p> :
        <div className="claim-history-list">{history.map(item => <article key={item.version} className="claim-history-item">
          <div className="claim-history-head"><strong>Phiên bản #{item.version}</strong><span>Ghi nhận: {formatViDate(item.recorded_at)}</span></div>
          <p><b>Ngày tạo gốc khai báo:</b> {formatViDate(item.original_created_at)}</p>
          <p><b>Ngày chụp/quay khai báo:</b> {formatViDate(item.original_captured_at)}</p>
          <p><b>Ngày công bố đầu tiên khai báo:</b> {formatViDate(item.original_published_at)}</p>
          <p><b>Ngày bắt đầu có quyền khai báo:</b> {formatViDate(item.copyright_effective_at)}</p>
          <p><b>Lý do:</b> {item.correction_reason}</p>
          <p><b>Nguồn:</b> {SOURCE_LABELS[item.claim_source]}</p>
          {item.claim_reference && <p className="claim-break"><b>Tài liệu:</b> {item.claim_reference}</p>}
          <div className="claim-sha"><span>SHA-256 của bản khai báo</span><code>{item.snapshot_sha256}</code></div>
        </article>)}</div>}
    </section>
  </div>;
}
