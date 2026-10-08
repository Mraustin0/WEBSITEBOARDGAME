import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Widget2,
  Calendar,
  Chair,
  Gamepad,
  Tuning,
  Users,
  User,
  ShieldCheck,
  GraphUp,
  ClipboardList,
  Settings,
  Logout2,
} from 'reicon-react';
// นำเข้า Notification component ตามที่คุณระบุไว้
import NotificationPanel, { NotificationBell } from './NotificationPanel.jsx';
import { api } from '../../lib/api.js';
import './adminLayout.css';

// เมนูแบ่งกลุ่มตามภาพ design — ไอคอน Reicon SVG
const MENU = [
  {
    group: 'FLOOR & PLAY',
    items: [
      { to: '/admin', Icon: Widget2, label: 'ภาพรวม (Overview)', end: true },
      { to: '/admin/reservations', Icon: Calendar, label: 'ผังโต๊ะ & การจอง' },
      { to: '/admin/tables', Icon: Chair, label: 'จัดการโต๊ะ (Tables)' },
      { to: '/admin/inventory', Icon: Gamepad, label: 'คลังบอร์ดเกม (Inventory)' },
      { to: '/admin/maintenance', Icon: Tuning, label: 'ซ่อมบำรุง (Maintenance)' },
    ],
  },
  {
    group: 'MANAGEMENT',
    items: [
      { to: '/admin/users', Icon: Users, label: 'จัดการผู้ใช้ (Users)' },
      { to: '/admin/roles', Icon: ShieldCheck, label: 'สิทธิ์การเข้าถึง (Roles)' },
      { to: '/admin/reports', Icon: GraphUp, label: 'รายงาน (Reports)' },
      { to: '/admin/audit', Icon: ClipboardList, label: 'บันทึกกิจกรรม (Audit)' },
      { to: '/admin/settings', Icon: Settings, label: 'ตั้งค่า (Settings)' },
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

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // ปิดเมนูเมื่อคลิกข้างนอก หรือกด Esc
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const name = user?.username ?? user?.email ?? 'Admin';

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="user-avatar" aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="user-info">
          <strong>{name}</strong>
          <small>{user?.role ?? 'admin'}</small>
        </span>
        <span className={'user-caret' + (open ? ' open' : '')} aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="user-dropdown" role="menu">
          <Link
            to="/admin/profile"
            role="menuitem"
            className="user-dropdown-item"
            onClick={() => setOpen(false)}
          >
            <User size={16} /> โปรไฟล์ของฉัน
          </Link>
          <button
            type="button"
            role="menuitem"
            className="user-dropdown-item danger"
            onClick={onLogout}
          >
            <Logout2 size={16} /> ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();

  // 1. เพิ่ม state สำหรับเปิด/ปิด NotificationPanel ไว้ต้น Component
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // ตัวเลขบนกระดิ่ง: ถาม /notifications/unread-count ทุก 30 วินาที
  const refreshUnread = useCallback(async () => {
    try {
      const r = await api('/notifications/unread-count');
      setUnread(r.unread ?? 0);
    } catch {
      /* เงียบไว้ ไม่ให้ topbar พังเพราะแจ้งเตือน */
    }
  }, []);
  useEffect(() => {
    refreshUnread();
    const id = setInterval(refreshUnread, 30000);
    return () => clearInterval(id);
  }, [refreshUnread]);

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
                    <m.Icon size={20} />
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

          <div className="admin-topbar-right">
            <NotificationBell count={unread} onClick={() => setNotifOpen(true)} />
            <UserMenu user={user} onLogout={logout} />
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>

        {/* 3. ใส่ NotificationPanel ไว้หลัง main (อยู่ระดับเดียวกับ main) */}
        <NotificationPanel
          open={notifOpen}
          onClose={() => setNotifOpen(false)}
          onCountChange={setUnread}
        />
      </div>
    </div>
  );
}
