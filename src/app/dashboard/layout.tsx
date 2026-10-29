import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LayoutDashboard, FilePlus2, Flag, ShieldCheck } from 'lucide-react';
import { isAdmin } from '@/lib/auth';
import Logout from '@/components/logout';
import SidebarToggle from '@/components/sidebar-toggle';
export const dynamic = 'force-dynamic';
export default async function DashboardLayout({ children }: {children: React.ReactNode}) {
 if (!(await isAdmin())) redirect('/login');
 return <main className="dashboard"><aside className="sidebar"><div><div className="sidebar-toggle-heading"><span className="sidebar-caption">WORKSPACE</span><SidebarToggle/></div><div className="sidebar-menu"><Link href="/dashboard"><LayoutDashboard size={18}/> Tổng quan</Link><Link href="/dashboard/new"><FilePlus2 size={18}/> Đăng ký tác phẩm</Link><Link href="/dashboard/cases"><Flag size={18}/> Hồ sơ vi phạm</Link></div></div><div className="sidebar-end"><div className="sidebar-security"><ShieldCheck size={18}/><div><strong>Private vault</strong><span>File gốc lưu tại R2</span></div></div><Logout/></div></aside><div className="dashboard-body">{children}</div></main>;
}
