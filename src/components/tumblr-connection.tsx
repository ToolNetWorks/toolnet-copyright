'use client';
import { useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
type Status = { configured?: boolean; authorized?: boolean; blog?: string | null; error?: string };
export default function TumblrConnection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  async function check() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch('/api/tumblr/status', { cache: 'no-store' });
      const result = await response.json() as Status;
      setStatus(result);
    } catch { setStatus({ error: 'Không truy cập được API Tumblr.' }); }
    finally { setBusy(false); }
  }
  return <section className="tumblr-panel" aria-label="Kết nối Tumblr">
    <div><strong>Xuất bản qua Tumblr</strong><p>Kiểm tra OAuth rồi đăng từng tác phẩm đã công bố. Ngày Tumblr đăng thực tế không bị ghi lùi.</p></div>
    <button type="button" className="btn btn-muted btn-small" disabled={busy} onClick={check}>
      {busy ? <Loader2 size={14} className="spin"/> : <ExternalLink size={14}/>} Kiểm tra kết nối Tumblr
    </button>
    {status && <p className={status.authorized ? 'tumblr-status-ok' : 'danger-text'} role="status">
      {status.authorized ? `Đã kết nối blog ${status.blog}.` : status.configured === false ? 'Chưa đồng bộ đủ biến TUMBLR_* lên Vercel Production.' : status.error || 'OAuth hoặc quyền quản trị blog chưa được xác minh.'}
    </p>}
  </section>;
}
