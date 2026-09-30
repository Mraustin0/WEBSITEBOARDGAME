import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const MENU = [
  { to: '/admin', label: 'ภาพรวม (Overview)', end: true },
  { to: '/admin/reservations', label: 'รายการจอง (Reservations)' },
  { to: '/admin/inventory', label: 'คลังบอร์ดเกม (Inventory)' },
  { to: '/admin/users', label: 'จัดการผู้ใช้ (Users)' },
  { to: '/admin/reports', label: 'รายงาน (Reports)' },
  { to: '/admin/settings', label: 'ตั้งค่า (Settings)' },
];

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="admin-clock">
      {now.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false })}
    </span>
  );
}

export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <strong>Boardgame Everyday</strong>
          <small>GAMING VAULT & CAFE</small>
        </div>
        <nav className="admin-nav">
          {MENU.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.end}
              className={({ isActive }) => 'admin-nav-item' + (isActive ? ' active' : '')}
            >
              {m.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <span className="badge-live">● Live Store System</span>
          <Clock />
          <div className="admin-user">Admin</div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
