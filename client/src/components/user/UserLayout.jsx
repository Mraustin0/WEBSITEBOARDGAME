// โครงหน้าฝั่งสมาชิก: แถบเมนู (คลังเกม / จองโต๊ะ / การจองของฉัน) + กระดิ่ง + บัญชี
// แต่ละหน้ามี URL ของตัวเอง (/catalog, /booking, /reservations) → รีเฟรช/กดย้อนกลับได้
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { fetchMyReservations } from '../../services/api.js';
import { isStaff, useSession } from '../../lib/session.js';

const STATUS_META = {
  booked: { icon: 'fa-calendar-check', color: 'text-blue-500', label: 'รอเริ่มเล่น' },
  playing: { icon: 'fa-dice', color: 'text-emerald-500', label: 'กำลังเล่นอยู่' },
  completed: { icon: 'fa-circle-check', color: 'text-slate-400', label: 'เล่นเสร็จแล้ว' },
  cancelled: { icon: 'fa-xmark-circle', color: 'text-red-400', label: 'ยกเลิกแล้ว' },
  no_show: { icon: 'fa-triangle-exclamation', color: 'text-amber-500', label: 'ไม่มาตามนัด' },
};

const NAV = [
  { to: '/catalog', icon: 'fa-chess-knight', label: 'คลังเกม' },
  { to: '/booking', icon: 'fa-layer-group', label: 'จองโต๊ะ' },
  { to: '/reservations', icon: 'fa-bookmark', label: 'การจองของฉัน' },
];

const fmt = (iso) =>
  new Date(iso).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function UserLayout() {
  const user = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  // กระดิ่ง = การจองที่ยังไม่จบ (กำลังเล่น + ล่วงหน้า)
  const [counts, setCounts] = useState({ active: 0, upcoming: 0 });
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef(null);
  const userId = user?.id;

  const loadCounts = useCallback(() => {
    if (!userId) return;
    fetchMyReservations({ scope: 'upcoming', limit: 1 })
      .then((d) => setCounts(d?.counts ?? { active: 0, upcoming: 0 }))
      .catch(() => {});
  }, [userId]);

  // โหลดใหม่ทุกครั้งที่เปลี่ยนหน้า (เช่น เพิ่งจอง/ยกเลิก) — ไม่ใช่ทุก render
  useEffect(loadCounts, [loadCounts, location.pathname]);

  useEffect(() => {
    if (!notifOpen) return undefined;
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  async function toggleNotif() {
    if (notifOpen) return setNotifOpen(false);
    setNotifOpen(true);
    setNotifLoading(true);
    try {
      const [active, upcoming] = await Promise.all([
        fetchMyReservations({ scope: 'active', limit: 5 }),
        fetchMyReservations({ scope: 'upcoming', limit: 5 }),
      ]);
      setNotifs([...(active?.items ?? []), ...(upcoming?.items ?? [])]);
      setCounts(upcoming?.counts ?? counts);
    } catch {
      setNotifs([]);
    } finally {
      setNotifLoading(false);
    }
  }

  const badge = (counts.active ?? 0) + (counts.upcoming ?? 0);

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col relative text-slate-800 antialiased font-sans">
      <header className="h-16 bg-white border-b border-slate-200 shadow-sm px-4 sm:px-6 flex items-center justify-between shrink-0 z-50 sticky top-0 gap-3">
        <Link to="/catalog" className="flex items-center gap-3.5 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-[#064e3b] text-white flex items-center justify-center text-lg shadow-sm shrink-0">
            <i className="fa-solid fa-dice-d20"></i>
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900 hidden lg:block">
            BoardGame SomeDay
          </span>
        </Link>

        <nav
          aria-label="เมนูหลัก"
          className="flex bg-slate-100 rounded-full px-1 py-1 items-center gap-1 text-sm font-sans border border-slate-200 overflow-x-auto"
        >
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `px-3 sm:px-4 py-1.5 rounded-full font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#064e3b] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`
              }
            >
              <i className={`fa-solid ${n.icon} text-sm`}></i>
              <span className="hidden sm:inline">{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {user ? (
            <>
              {isStaff(user) && (
                <Link
                  to="/admin"
                  className="hidden md:inline-flex px-3 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  ระบบหลังร้าน
                </Link>
              )}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={toggleNotif}
                  aria-label={`การจองที่ยังไม่จบ ${badge} รายการ`}
                  aria-expanded={notifOpen}
                  className="relative w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 hover:bg-white text-slate-600 flex items-center justify-center text-sm shadow-sm transition"
                >
                  <i className="fa-solid fa-bell"></i>
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
                      {badge}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-800">การจองที่กำลังจะถึง</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNotifOpen(false);
                          navigate('/reservations');
                        }}
                        className="text-xs text-emerald-700 font-semibold hover:underline"
                      >
                        ดูทั้งหมด
                      </button>
                    </div>
                    {notifLoading ? (
                      <div className="flex items-center justify-center py-10 text-slate-400">
                        <i className="fa-solid fa-spinner fa-spin mr-2"></i> กำลังโหลด...
                      </div>
                    ) : notifs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                        <i className="fa-regular fa-bell-slash text-2xl"></i>
                        <span className="text-sm">ไม่มีการจองที่กำลังจะถึง</span>
                      </div>
                    ) : (
                      <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {notifs.map((r) => {
                          const meta = STATUS_META[r.status] ?? STATUS_META.booked;
                          return (
                            <li key={r._id}>
                              <button
                                type="button"
                                className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition"
                                onClick={() => {
                                  setNotifOpen(false);
                                  navigate('/reservations');
                                }}
                              >
                                <div
                                  className={`w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 ${meta.color}`}
                                >
                                  <i className={`fa-solid ${meta.icon} text-sm`}></i>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">
                                    {r.game?.name ?? 'ยังไม่เลือกเกม'}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    โต๊ะ {r.table?.code ?? '-'} · {r.startAt ? fmt(r.startAt) : ''}
                                  </p>
                                  <span className={`text-[11px] font-semibold ${meta.color}`}>
                                    {meta.label}
                                  </span>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
              <Link to="/profile" className="flex items-center gap-2.5" title="ตั้งค่าบัญชี">
                <div className="w-9 h-9 rounded-full bg-[#064e3b] text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0">
                  {(user.username || user.email || '?').slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-bold text-slate-700 hidden sm:inline-block">
                  {user.displayName || user.username || user.email}
                </span>
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={() =>
                navigate('/signin', { state: { from: location.pathname + location.search } })
              }
              className="px-4 py-2 rounded-full bg-[#064e3b] text-white text-sm font-bold shadow-sm hover:bg-emerald-800 transition whitespace-nowrap"
            >
              เข้าสู่ระบบ
            </button>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
