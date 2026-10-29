'use client';
import { useState, type FormEvent } from 'react';
import { CloudUpload, FileVideo2, Image as ImageIcon, CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
const MAX_SIZE = 250 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
export default function UploadForm() {
  const router = useRouter(); const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(''); const [ownerName, setOwnerName] = useState('');
  const [description, setDescription] = useState(''); const [ownerBasis, setOwnerBasis] = useState('original_creator');
  const [confirmedRights, setConfirmedRights] = useState(false); const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(''); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    if (!file || !ALLOWED.includes(file.type) || file.size > MAX_SIZE) { setError('File không hợp lệ hoặc vượt quá 250 MB'); return; }
    if (!confirmedRights) { setError('Bạn cần xác nhận quyền sở hữu hoặc quyền độc quyền hợp lệ'); return; }
    setBusy(true); setError('');
    try {
      setStage('Tạo hồ sơ tác phẩm…');
      const response = await fetch('/api/assets/initiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, ownerName, ownerBasis, filename: file.name, size: file.size, mime: file.type, confirmedRights }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Không thể tạo hồ sơ');
      setStage('Đang tải bản gốc riêng tư lên Cloudflare R2…');
      const upload = await fetch(data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!upload.ok) throw new Error(`Tải lên R2 thất bại (${upload.status}). Kiểm tra CORS bucket.`);
      setStage('Kiểm tra kích thước và loại file…');
      const finished = await fetch('/api/assets/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: data.id }) });
      const result = await finished.json();
      if (!finished.ok) throw new Error(result.error ?? 'Không thể hoàn tất tải lên');
      router.push('/dashboard?uploaded=1'); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  }
  return <form className="upload-form" onSubmit={submit}>
    <label className="drop-zone"><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={e => { const selected = e.target.files?.[0] ?? null; setFile(selected); if (selected && !title) setTitle(selected.name.replace(/\.[^.]+$/, '')); }}/>
      <span className="drop-icon">{file?.type.startsWith('video/') ? <FileVideo2 size={24}/> : file ? <ImageIcon size={24}/> : <CloudUpload size={26}/>}</span>
      <strong>{file ? file.name : 'Chọn ảnh hoặc video gốc'}</strong><small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'JPG, PNG, WEBP, MP4, WEBM, MOV · tối đa 250 MB'}</small>
    </label>
    <div className="form-grid"><label>Tiêu đề tác phẩm<input required minLength={2} maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="Tên tác phẩm" /></label>
    <label>Chủ sở hữu quyền<input required minLength={2} maxLength={200} value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Tên cá nhân hoặc pháp nhân" /></label></div>
    <label>Cơ sở quyền sở hữu<select value={ownerBasis} onChange={e => setOwnerBasis(e.target.value)}><option value="original_creator">Tác giả / chủ sở hữu gốc</option><option value="rights_transfer">Có hợp đồng chuyển giao quyền</option><option value="exclusive_license">Có giấy phép độc quyền phù hợp</option></select></label>
    <label>Mô tả / nguồn gốc (tùy chọn)<textarea maxLength={2000} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Thông tin quá trình sáng tạo hoặc tác phẩm…" /></label>
    <label className="checkbox-line"><input type="checkbox" checked={confirmedRights} onChange={e => setConfirmedRights(e.target.checked)}/><span>Tôi xác nhận có đủ quyền hợp pháp để lưu trữ và công bố tác phẩm này. Thông tin cung cấp là trung thực.</span></label>
    {error && <div className="error-banner" role="alert">{error}</div>}
    {stage && busy && <p className="muted"><Loader2 size={15} className="spin inline-icon"/> {stage}</p>}
    <button disabled={busy} className="btn" type="submit">{busy ? <Loader2 size={17} className="spin"/> : <><CheckCircle2 size={17}/> Đăng ký tác phẩm</>}</button>
    <p className="helper">File gốc được giữ riêng tư. Tác phẩm chỉ hiển thị công khai sau khi kiểm tra SHA-256 và bạn chủ động bấm Công bố.</p>
  </form>;
}
