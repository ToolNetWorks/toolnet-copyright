import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/header';
import Link from 'next/link';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'ToolNet Copyright | Bảo vệ tài sản sáng tạo', template: '%s | ToolNet Copyright' },
  description: 'Đăng ký lưu trữ nguồn gốc ảnh và video, xác minh SHA-256, quản lý hồ sơ vi phạm và công bố tác phẩm.',
  robots: { index: true, follow: true }
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><Header/>{children}<footer className="site-footer"><div className="container footer-inner"><span className="logo footer-logo">TOOLNET <strong>COPYRIGHT</strong></span><nav className="footer-links"><Link href="/methodology">Phương pháp</Link><Link href="/privacy">Quyền riêng tư</Link></nav><span>© {new Date().getFullYear()} ToolNet</span></div></footer></body></html>;
}
