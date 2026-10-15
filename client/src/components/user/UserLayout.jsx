// โครงหน้าฝั่งสมาชิก: แถบเมนู (หน้าแรก / คลังเกม / จองโต๊ะ / การจองของฉัน) + กระดิ่ง + บัญชี + footer
// แต่ละหน้ามี URL ของตัวเอง (/catalog, /booking, /reservations) → รีเฟรช/กดย้อนกลับได้
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { fetchMyReservations, fetchRules } from '../../services/api.js';
import { isStaff, useSession } from '../../lib/session.js';
import { BoardBorder, Logo } from '../brand/Brand.jsx';
import { openingHoursText } from '../brand/hours.js';

const STATUS_META = {
  booked: { icon: 'fa-calendar-check', color: 'text-teal', label: 'จองแล้ว' },
  playing: { icon: 'fa-dice', color: 'text-forest', label: 'กำลังเล่น' },
  completed: { icon: 'fa-circle-check', color: 'text-slate-400', label: 'เล่นจบแล้ว' },
  cancelled: { icon: 'fa-xmark-circle', color: 'text-brick', label: 'ยกเลิกแล้ว' },
  no_show: { icon: 'fa-triangle-exclamation', color: 'text-mustard-dark', label: 'ไม่มาตามนัด' },
};

const NAV = [
  { to: '/', icon: 'fa-house', label: 'หน้าแรก', end: true },
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
    <div className="w-full min-h-screen bg-cream-light flex flex-col relative text-ink antialiased font-sans">
      {/* header สูงรวม 64px (58 + แถบลาย 6) — บางหน้าใช้ sticky top-16 อ้างอิงความสูงนี้ */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 shadow-sm">
        <div className="max-w-7xl mx-auto h-[58px] px-4 sm:px-6 flex items-center justify-between gap-3">
          <Link
            to="/"
            aria-label="Boardgame Everyday หน้าแรก"
            className="shrink-0 rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-forest-200"
          >
            <span className="sm:hidden">
              <Logo size="sm" />
            </span>
            <span className="hidden sm:inline">
              <Logo size="md" />
            </span>
          </Link>

          {/* เมนูหลัก (จอใหญ่) */}
          <nav aria-label="เมนูหลัก" className="hidden lg:block">
            <NavPills />
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {user ? (
              <>
                {isStaff(user) && (
                  <Link
                    to="/admin"
                    className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-forest text-xs font-bold text-forest hover:bg-forest hover:text-cream transition"
                  >
                    <i className="fa-solid fa-store" aria-hidden="true"></i>
                    ระบบหลังร้าน
                  </Link>
                )}
                <div className="relative" ref={notifRef}>
                  <button
                    type="button"
                    onClick={toggleNotif}
                    aria-label={`การจองที่กำลังจะถึง ${badge} รายการ`}
                    aria-expanded={notifOpen}
                    className="relative w-10 h-10 rounded-full bg-cream border-2 border-cream-dark hover:border-forest text-forest flex items-center justify-center text-sm transition focus:outline-none focus-visible:ring-4 focus-visible:ring-forest-200"
                  >
                    <i className="fa-solid fa-bell"></i>
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-brick text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
                        {badge}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-xl border-2 border-ink z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-200 bg-cream-light flex items-center justify-between">
                        <span className="font-heading text-base text-forest">
                          การจองที่กำลังจะถึง
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            navigate('/reservations');
                          }}
                          className="text-xs text-teal font-semibold hover:underline"
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
                                  className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-cream-light transition"
                                  onClick={() => {
                                    setNotifOpen(false);
                                    navigate('/reservations');
                                  }}
                                >
                                  <div
                                    className={`w-8 h-8 rounded-xl bg-cream flex items-center justify-center shrink-0 ${meta.color}`}
                                  >
                                    <i className={`fa-solid ${meta.icon} text-sm`}></i>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-ink truncate">
                                      {r.game?.name ?? 'ยังไม่เลือกเกม'}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      โต๊ะ {r.table?.code ?? '-'} ·{' '}
                                      {r.startAt ? fmt(r.startAt) : ''}
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
                <div className="h-6 w-px bg-slate-200 mx-0.5 hidden sm:block"></div>
                <Link
                  to="/profile"
                  className="flex items-center gap-2.5 rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-forest-200"
                  title="ตั้งค่าบัญชี"
                >
                  <div className="w-10 h-10 rounded-full bg-forest text-cream font-bold text-xs flex items-center justify-center ring-2 ring-mustard shrink-0">
                    {(user.username || user.email || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-bold text-ink hidden xl:inline-block max-w-[140px] truncate">
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
                className="px-4 sm:px-5 py-2 rounded-full bg-forest text-cream text-sm font-bold shadow-sm hover:bg-forest-800 transition whitespace-nowrap focus:outline-none focus-visible:ring-4 focus-visible:ring-forest-200"
              >
                เข้าสู่ระบบ
              </button>
            )}
          </div>
        </div>

        <BoardBorder className="h-1.5" />
      </header>

      {/* เมนูหลัก (มือถือ/แท็บเล็ต) — แถวที่สองใต้ header (ไม่ sticky เพื่อให้ header สูง 64px เท่าเดิม) */}
      <nav
        aria-label="เมนูหลัก (มือถือ)"
        className="lg:hidden bg-white border-b border-slate-200 px-4 sm:px-6 py-2 overflow-x-auto"
      >
        <NavPills />
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      <SiteFooter user={user} />
    </div>
  );
}

function NavPills() {
  return (
    <ul className="flex w-max items-center gap-1 p-1 rounded-full bg-cream border-2 border-cream-dark text-sm">
      {NAV.map((n) => (
        <li key={n.to}>
          <NavLink
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `px-3 sm:px-4 py-1.5 rounded-full font-bold flex items-center gap-2 whitespace-nowrap transition focus:outline-none focus-visible:ring-2 focus-visible:ring-forest ${
                isActive
                  ? 'bg-forest text-cream shadow-sm'
                  : 'text-slate-600 hover:bg-white hover:text-forest'
              }`
            }
          >
            <i className={`fa-solid ${n.icon} text-xs`} aria-hidden="true"></i>
            {n.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function SiteFooter({ user }) {
  const [hours, setHours] = useState(null);
  useEffect(() => {
    let alive = true;
    fetchRules()
      .then((r) => alive && setHours(openingHoursText(r?.OPERATING)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const year = new Date().getFullYear();
  const links = [
    ...NAV,
    user
      ? { to: '/profile', label: 'บัญชีของฉัน' }
      : { to: '/signin', label: 'เข้าสู่ระบบ / สมัครสมาชิก' },
  ];

  return (
    <footer className="bg-forest text-cream mt-auto">
      <BoardBorder className="h-3" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link to="/" aria-label="Boardgame Everyday หน้าแรก" className="inline-block">
            <Logo variant="light" size="md" showTagline />
          </Link>
          <p className="mt-4 text-sm text-cream/75 leading-relaxed max-w-xs">
            คาเฟ่บอร์ดเกมสำหรับทุกคน — มือใหม่ก็สนุก สายโปรก็จุใจ ชวนเพื่อนและครอบครัวมาเล่นด้วยกัน
          </p>
        </div>

        <div>
          <h2 className="font-heading text-lg text-mustard">เมนู</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {links.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="text-cream/85 hover:text-white hover:underline underline-offset-4"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-heading text-lg text-mustard">เวลาเปิดร้าน</h2>
          <p className="mt-3 text-sm text-cream/85 flex items-start gap-2">
            <i className="fa-regular fa-clock mt-1 text-mustard" aria-hidden="true"></i>
            <span>{hours ?? 'เปิดทุกวัน'}</span>
          </p>
          <p className="mt-2 text-sm text-cream/70 flex items-start gap-2">
            <i className="fa-solid fa-chair mt-1 text-mustard" aria-hidden="true"></i>
            <span>จองโต๊ะออนไลน์ล่วงหน้า หรือแวะมาที่ร้านได้เลย</span>
          </p>
          {isStaff(user) && (
            <Link
              to="/admin"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-cream/85 hover:text-white"
            >
              <i className="fa-solid fa-store" aria-hidden="true"></i> ระบบหลังร้าน
            </Link>
          )}
        </div>

        <div>
          <h2 className="font-heading text-lg text-mustard">ข้อมูลเกม</h2>
          <p className="mt-3 text-sm text-cream/75">คะแนนและข้อมูลเกมจาก BoardGameGeek</p>
          <a
            href="https://boardgamegeek.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block bg-cream rounded-lg px-3 py-2 hover:bg-white transition"
          >
            <img src="/powered-by-bgg.png" alt="Powered by BoardGameGeek" className="h-7 w-auto" />
          </a>
        </div>
      </div>
      <div className="border-t border-cream/15">
        <p className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-xs text-cream/60">
          © {year} Boardgame Everyday · คาเฟ่บอร์ดเกม เล่นด้วยกันทุกวัน
        </p>
      </div>
    </footer>
  );
}
