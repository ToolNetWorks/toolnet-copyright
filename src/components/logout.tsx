'use client';
import { LogOut } from 'lucide-react';
export default function Logout() { return <button className="simple-button" onClick={async () => {
  const response = await fetch('/api/auth/logout', { method: 'POST' });
  if (response.ok) window.location.replace('/login');
}}><LogOut size={17}/> Đăng xuất</button>; }
