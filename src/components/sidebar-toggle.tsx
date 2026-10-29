'use client';

import { useEffect, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const STORAGE_KEY = 'toolnet-copyright-sidebar-collapsed';

export default function SidebarToggle() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
      } catch {
        // Sidebar remains expanded when storage is unavailable.
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      // Toggle remains usable without persistent storage.
    }
  }

  return (
    <button
      type="button"
      className="sidebar-collapse-btn"
      onClick={toggle}
      aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
      aria-expanded={!collapsed}
      title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
    >
      {collapsed
        ? <PanelLeftOpen size={18} />
        : <PanelLeftClose size={18} />}
    </button>
  );
}
