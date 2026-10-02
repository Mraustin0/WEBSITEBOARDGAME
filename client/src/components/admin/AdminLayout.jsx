import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import './adminLayout.css';

// เมนูแบ่งกลุ่มตามภาพ design
const MENU = [
  {
    group: 'FLOOR & PLAY',
    items: [
      { to: '/admin', icon: '▦', label: 'ภาพรวม (Overview)', end: true },
      { to: '/admin/reservations', icon: '🗓', label: 'ผังโต๊ะ & การจอง' },
      { to: '/admin/inventory', icon: '🎲', label: 'คลังบอร์ดเกม (Inventory)' },
      { to: '/admin/maintenance', icon: '🛠', label: 'ซ่อมบำรุง (Maintenance)' },
    ],
  },
  {
    group: 'MANAGEMENT',
    items: [
      { to: '/admin/users', icon: '👥', label: 'จัดการผู้ใช้ (Users)' },
      { to: '/admin/reports', icon: '📈', label: 'รายงาน (Reports)' },
      { to: '/admin/settings', icon: '⚙', label: 'ตั้งค่า (Settings)' },
    ],
  },
];

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="admin-clock">
      {now.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false })} ICT
    </span>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    user = null;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <strong>Boardgame Everyday</strong>
          <small>GAMING VAULT & CAFE</small>
        </div>
        <nav className="admin-nav">
          {MENU.map((g) => (
            <div key={g.group} className="nav-group">
              <div className="nav-label">{g.group}</div>
              {g.items.map((m) => (
                <NavLink
                  key={m.to}
                  to={m.to}
                  end={m.end}
                  className={({ isActive }) => 'admin-nav-item' + (isActive ? ' active' : '')}
                >
                  <span className="nav-ico" aria-hidden="true">
                    {m.icon}
                  </span>
                  {m.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="session-box">● Session Active</div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <span className="badge-live">● Live Store System</span>
          <Clock />
          <div className="admin-user">
            <div>
              <strong>{user?.username ?? user?.email ?? 'Admin'}</strong>
              <small>{user?.role ?? 'admin'}</small>
            </div>
            <button type="button" className="btn-ghost" onClick={logout}>
              ออกจากระบบ
            </button>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
