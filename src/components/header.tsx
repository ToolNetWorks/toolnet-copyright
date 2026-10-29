import Link from 'next/link';
import { ArrowUpRight, Fingerprint, LockKeyhole } from 'lucide-react';
export default function Header() {
  return <header className="site-header"><div className="container header-inner">
    <Link href="/" className="logo"><span className="logo-mark"><Fingerprint size={22}/></span><span>TOOLNET <strong>COPYRIGHT</strong></span></Link>
    <nav className="nav-links" aria-label="Điều hướng"><Link href="/">Trang chủ</Link><Link href="/registry">Kho tác phẩm</Link><Link href="/#how">Cách hoạt động</Link></nav>
    <Link className="header-action" href="/dashboard"><LockKeyhole size={15}/> Quản trị <ArrowUpRight size={15}/></Link>
  </div></header>;
}
