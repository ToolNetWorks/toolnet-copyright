'use client';

import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';

export default function CertificateActions({ url, title }: { url: string; title: string }) {
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [manualCopy, setManualCopy] = useState(false);

  async function copyLink(sharing = false) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setManualCopy(false);
      setMessage(sharing ? 'Đã sao chép liên kết để chia sẻ.' : 'Đã sao chép liên kết hồ sơ.');
    } catch {
      setCopied(false);
      setManualCopy(true);
      setMessage('Chọn và sao chép liên kết bên dưới.');
    }
  }

  async function share() {
    if (!navigator.share) return copyLink(true);
    try { await navigator.share({ title, text: 'Hồ sơ tác phẩm trên ToolNet Copyright', url }); }
    catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) await copyLink(true);
    }
  }

  return <div className="certificate-actions">
    <div className="certificate-action-buttons">
      <button type="button" className="certificate-button" onClick={() => void copyLink()}>
        {copied ? <Check size={16} aria-hidden="true"/> : <Copy size={16} aria-hidden="true"/>} Sao chép liên kết
      </button>
      <button type="button" className="certificate-button certificate-button-secondary" onClick={() => void share()}>
        <Share2 size={16} aria-hidden="true"/> Chia sẻ hồ sơ
      </button>
    </div>
    <p className="certificate-action-message" role="status" aria-live="polite">{message}</p>
    {manualCopy && <input className="certificate-copy-input" aria-label="Liên kết để sao chép thủ công" readOnly
      value={url} onFocus={event => event.currentTarget.select()}/>}
  </div>;
}
