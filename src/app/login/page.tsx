import type { Metadata } from 'next';
import { Fingerprint, LockKeyhole } from 'lucide-react';
import LoginForm from '@/components/login-form';
export const metadata: Metadata = { title: 'Đăng nhập', robots: { index: false, follow: false } };
export default function Login() { return <main className="auth-page"><div className="auth-card"><span className="auth-icon"><Fingerprint size={30}/></span><p className="kicker">SECURE WORKSPACE</p><h1>Chào mừng trở lại.</h1><p className="muted">Đăng nhập để quản lý tác phẩm, bản gốc và các hồ sơ vi phạm.</p><LoginForm/><p className="auth-note"><LockKeyhole size={14}/> Kết nối bảo mật · Truy cập quản trị giới hạn</p></div></main>; }
