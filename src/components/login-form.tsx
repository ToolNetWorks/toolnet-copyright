'use client';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
export default function LoginForm() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Đăng nhập thất bại');
      window.location.replace('/dashboard');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Có lỗi xảy ra'); }
    finally { setBusy(false); }
  }
  return <form className="auth-form" onSubmit={submit}>
    <label>Email quản trị<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" /></label>
    <label>Mật khẩu<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" /></label>
    {error && <p className="danger-text" role="alert">{error}</p>}
    <button className="btn" disabled={busy}>{busy ? <Loader2 size={17} className="spin"/> : <>Đăng nhập <ArrowRight size={17}/></>}</button>
  </form>;
}
