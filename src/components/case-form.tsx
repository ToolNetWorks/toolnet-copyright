'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Asset } from '@/lib/db';
export default function CaseForm({ assets }: { assets: Asset[] }) {
  const router = useRouter();
  const [assetId, setAssetId] = useState(assets[0]?.id ?? ''); const [platform, setPlatform] = useState('facebook');
  const [url, setUrl] = useState(''); const [notes, setNotes] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { const response = await fetch('/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId, platform, url, notes }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Không lưu được');
      router.refresh(); setUrl(''); setNotes('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Lỗi không xác định'); }
    finally { setBusy(false); }
  }
  return <form className="case-form" onSubmit={save}>
    <label>Tác phẩm cần bảo vệ<select required value={assetId} onChange={e => setAssetId(e.target.value)}>{assets.length === 0 && <option value="">Chưa có tác phẩm đã xác minh</option>}{assets.map(asset => <option key={asset.id} value={asset.id}>{asset.title}</option>)}</select></label>
    <div className="form-grid"><label>Nền tảng<select value={platform} onChange={e => setPlatform(e.target.value)}>{['facebook','instagram','youtube','tiktok','website','other'].map(value => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}</select></label>
    <label>Link nội dung nghi vi phạm<input type="url" required value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" /></label></div>
    <label>Ghi chú<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={2000} placeholder="Thời gian phát hiện, phần nội dung bị sử dụng…"/></label>
    {error && <div className="error-banner" role="alert">{error}</div>}
    <button disabled={busy || !assets.length} className="btn">{busy ? 'Đang lưu…' : 'Tạo hồ sơ vi phạm'}</button>
  </form>;
}
