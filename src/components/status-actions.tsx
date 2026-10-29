'use client';
import { useState } from 'react';
import { CheckCircle2, ShieldCheck, Loader2, ExternalLink } from 'lucide-react';
export default function StatusActions({ id, status, published, isVideo, hasPreview, tumblrStatus, tumblrUrl, tumblrRequestedDate, tumblrConfirmedDate }: { id: string; status: string; published: boolean; isVideo: boolean; hasPreview: boolean; tumblrStatus?: string | null; tumblrUrl?: string | null; tumblrRequestedDate?: string | null; tumblrConfirmedDate?: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function send(action: string) {
    if (busy) return;
    if (action === 'tumblr' && !window.confirm('Xác nhận bạn được quyền ký tên copyright-toolnet và các tuyên bố tác giả gốc, chủ sở hữu độc quyền, nơi tạo ảnh là Japan đều chính xác? Ngày tuyên bố ghi theo ngày đăng thực tế.')) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/assets/${id}/${action}`, { method: 'POST',
        ...(action === 'tumblr' ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ declarationConfirmed: true }) } : {}),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Lỗi xử lý');
      window.location.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  }
  async function addPreview(file: File | undefined) {
    if (busy || !file) return;
    if (!['video/mp4','video/webm'].includes(file.type) || file.size > 50 * 1024 * 1024) { setError('Chọn video preview MP4/WEBM dưới 50 MB'); return; }
    setBusy(true); setError('');
    try {
      const init = await fetch(`/api/assets/${id}/preview`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({mime:file.type,size:file.size}) });
      const data = await init.json();
      if (!init.ok) throw new Error(data.error ?? 'Không tạo được preview');
      const put = await fetch(data.uploadUrl, {method:'PUT',headers:{'Content-Type':file.type},body:file});
      if (!put.ok) throw new Error('Không thể tải video preview lên R2');
      const completed = await fetch(`/api/assets/${id}/preview`, {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:data.key})});
      if (!completed.ok) { const result = await completed.json(); throw new Error(result.error ?? 'Không thể xác thực preview'); }
      window.location.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Có lỗi tải preview'); }
    finally { setBusy(false); }
  }
  return <div className="action-inline">
    {status === 'pending_verification' && <button disabled={busy} className="btn btn-small" onClick={() => send('verify')}>{busy ? <Loader2 size={14} className="spin"/> : <ShieldCheck size={14}/>} Kiểm tra SHA-256</button>}
    {!isVideo && status === 'verified' && !hasPreview && <span className="danger-text">Thiếu bản xem trước, không thể công bố</span>}
    {isVideo && status === 'verified' && !hasPreview && <label className="btn btn-muted btn-small">Thêm preview video<input type="file" accept="video/mp4,video/webm" style={{display:'none'}} onChange={e => {void addPreview(e.target.files?.[0]);}}/></label>}
    {status === 'verified' && hasPreview && !published && <button disabled={busy} className="btn btn-small" onClick={() => send('publish')}>{busy ? <Loader2 size={14} className="spin"/> : <CheckCircle2 size={14}/>} Công bố</button>}
    {(published || (status === 'pending_verification' && !isVideo)) && !tumblrStatus && <button disabled={busy} className="btn btn-muted btn-small" onClick={() => send('tumblr')}>{busy ? <Loader2 size={14} className="spin"/> : <ExternalLink size={14}/>} Đăng lên Tumblr</button>}
    {(published || (status === 'pending_verification' && !isVideo)) && tumblrStatus === 'failed' && <button disabled={busy} className="btn btn-muted btn-small" onClick={() => send('tumblr')}>Thử đăng lại Tumblr</button>}
    {tumblrStatus === 'published' && tumblrRequestedDate && !tumblrConfirmedDate && <span className="status-pill">Tumblr: chưa đọc lại được ngày hiển thị</span>}
    {tumblrStatus === 'published' && tumblrRequestedDate && tumblrConfirmedDate &&
      Math.abs(new Date(tumblrRequestedDate).getTime() - new Date(tumblrConfirmedDate).getTime()) > 61_000 &&
      <span className="status-pill">Tumblr: ngày hiển thị khác yêu cầu</span>}
    {tumblrStatus === 'published' && tumblrUrl && <a className="btn btn-muted btn-small" href={tumblrUrl} target="_blank" rel="noopener noreferrer">Xem bài Tumblr <ExternalLink size={14}/></a>}
    {(tumblrStatus === 'publishing' || tumblrStatus === 'uncertain') && <span className="status-pill">Tumblr: cần kiểm tra, tránh đăng trùng</span>}
    {status === 'verified' && <a className="btn btn-muted btn-small" href={`/api/assets/${id}/download`}>Tải bản gốc</a>}
    <a className="btn btn-muted btn-small" href={`/api/assets/${id}/evidence`}>Chứng cứ JSON</a>
    {error && <span className="danger-text" role="alert">{error}</span>}
  </div>;
}
