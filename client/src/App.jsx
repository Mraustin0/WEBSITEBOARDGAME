import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { api } from './lib/api.js';
import GameCatalog from './pages/GameCatalog.jsx';
import FloorPlan from './pages/FloorPlan.jsx';
import MyReservations from './pages/MyReservations.jsx';

import AdminLayout from './components/admin/AdminLayout.jsx';
import Login from './pages/Login.jsx';
import UserAuth from './pages/UserAuth.jsx';
import UserProfile from './pages/UserProfile.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Reservations from './pages/admin/Reservations.jsx';
import Settings from './pages/admin/Settings.jsx';
import Maintenance from './pages/admin/Maintenance.jsx';
import Reports from './pages/admin/Reports.jsx';
import Inventory from './pages/admin/Inventory.jsx';
import GameDetail from './pages/admin/GameDetail.jsx';
import Users from './pages/admin/Users.jsx';
import MemberDetail from './pages/admin/MemberDetail.jsx';
import Profile from './pages/admin/Profile.jsx';
import Audit from './pages/admin/Audit.jsx';
import Roles from './pages/admin/Roles.jsx';

function RequireAuth({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />;
}

function useCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

function ComingSoon() {
  return (
    <div className="panel">
      <h2>หน้านี้ยังไม่พร้อมใช้งาน</h2>
      <p className="muted">กำลังพัฒนา</p>
    </div>
  );
}

const STATUS_META = {
  booked: { icon: 'fa-calendar-check', color: 'text-blue-500', label: 'รอเริ่มเล่น' },
  playing: { icon: 'fa-dice', color: 'text-emerald-500', label: 'กำลังเล่นอยู่' },
  completed: { icon: 'fa-circle-check', color: 'text-slate-400', label: 'เล่นเสร็จแล้ว' },
  cancelled: { icon: 'fa-xmark-circle', color: 'text-red-400', label: 'ยกเลิกแล้ว' },
  no_show: { icon: 'fa-triangle-exclamation', color: 'text-amber-500', label: 'ไม่มาตามนัด' },
};

function UserApp() {
  const [currentPage, setCurrentPage] = useState('floorplan');
  const [selectedGame, setSelectedGame] = useState(null);
  const user = useCurrentUser();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef(null);

  // badge count — active reservations
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    api('/reservations', { query: { limit: 5, status: 'booked,playing' } })
      .then((d) => {
        const items = Array.isArray(d) ? d : (d?.items ?? []);
        setActiveCount(items.length);
      })
      .catch(() => {});
  }, [user]);

  // ปิด dropdown เมื่อคลิกนอก
  useEffect(() => {
    if (!notifOpen) return;
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  async function toggleNotif() {
    if (notifOpen) {
      setNotifOpen(false);
      return;
    }
    setNotifOpen(true);
    setNotifLoading(true);
    try {
      const d = await api('/reservations', { query: { limit: 8 } });
      setNotifs(Array.isArray(d) ? d : (d?.items ?? []));
    } catch {
      setNotifs([]);
    } finally {
      setNotifLoading(false);
    }
  }

  function goProfile() {
    navigate('/profile');
  }

  function goReservations() {
    if (user) setCurrentPage('reservations');
    else navigate('/signin', { state: { from: '/reservations' } });
  }

  const handleSelectGameAndGoToFloorPlan = (game) => {
    if (game) {
      setSelectedGame(game);
    }
    setCurrentPage('floorplan');
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col relative text-slate-800 antialiased font-sans">
      {/* Header Navbar */}
      <header className="h-16 bg-white border-b border-slate-200 shadow-sm px-6 flex items-center justify-between shrink-0 z-50 sticky top-0">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#064e3b] text-white flex items-center justify-center text-lg shadow-sm shrink-0">
            <i className="fa-solid fa-dice-d20"></i>
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900 hidden sm:block">
            BoardGame SomeDay
          </span>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex bg-slate-100 rounded-full px-1.5 py-1 items-center gap-1 text-sm font-sans border border-slate-200">
          <button
            onClick={() => setCurrentPage('floorplan')}
            className={`px-4 py-1.5 rounded-full font-bold flex items-center gap-2 transition-all ${
              currentPage === 'floorplan'
                ? 'bg-[#064e3b] text-white shadow-sm'
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            <i className="fa-solid fa-layer-group text-sm"></i> Floor Plan
          </button>

          <button
            onClick={() => setCurrentPage('catalog')}
            className={`px-4 py-1.5 rounded-full font-bold flex items-center gap-2 transition-all ${
              currentPage === 'catalog'
                ? 'bg-[#064e3b] text-white shadow-sm'
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            <i className="fa-solid fa-chess-knight text-sm"></i> Games Catalog
          </button>

          <button
            onClick={goReservations}
            className={`px-4 py-1.5 rounded-full font-bold flex items-center gap-2 transition-all ${
              currentPage === 'reservations'
                ? 'bg-[#064e3b] text-white shadow-sm'
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            <i className="fa-solid fa-bookmark text-sm"></i> My Reservations
          </button>
        </nav>

        {/* User Profile / Notifications */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="relative" ref={notifRef}>
                <button
                  onClick={toggleNotif}
                  className="relative w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 hover:bg-white text-slate-600 flex items-center justify-center text-sm shadow-sm transition"
                >
                  <i className="fa-solid fa-bell"></i>
                  {activeCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
                      {activeCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-800">การแจ้งเตือน</span>
                      <button
                        onClick={() => {
                          setNotifOpen(false);
                          goReservations();
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
                        <span className="text-sm">ยังไม่มีการแจ้งเตือน</span>
                      </div>
                    ) : (
                      <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {notifs.map((r) => {
                          const meta = STATUS_META[r.status] ?? STATUS_META.booked;
                          const gameName = r.game?.name ?? 'ไม่ระบุเกม';
                          const tableCode = r.table?.code ?? '-';
                          const dateStr = r.startAt
                            ? new Date(r.startAt).toLocaleDateString('th-TH', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '';
                          return (
                            <li
                              key={r._id}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition"
                              onClick={() => {
                                setNotifOpen(false);
                                goReservations();
                              }}
                            >
                              <div
                                className={`w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 ${meta.color}`}
                              >
                                <i className={`fa-solid ${meta.icon} text-sm`}></i>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                  {gameName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  โต๊ะ {tableCode} · {dateStr}
                                </p>
                                <span className={`text-[11px] font-semibold ${meta.color}`}>
                                  {meta.label}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <div className="h-6 w-px bg-slate-200 mx-1"></div>
              <div
                className="flex items-center gap-2.5 cursor-pointer group relative"
                onClick={goProfile}
                title="ตั้งค่าบัญชี"
              >
                <div className="w-9 h-9 rounded-full bg-[#064e3b] text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0">
                  {(user.username || user.email || '?').slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-bold text-slate-700 hidden sm:inline-block">
                  {user.username || user.email}
                </span>
              </div>
            </>
          ) : (
            <button
              onClick={() => navigate('/signin')}
              className="px-4 py-2 rounded-full bg-[#064e3b] text-white text-sm font-bold shadow-sm hover:bg-emerald-800 transition"
            >
              เข้าสู่ระบบ
            </button>
          )}
        </div>
      </header>

      {/* Main Content View Switcher */}
      <main className="flex-1">
        {currentPage === 'catalog' && (
          <GameCatalog
            selectedGame={selectedGame}
            setSelectedGame={setSelectedGame}
            onGoToFloorPlan={handleSelectGameAndGoToFloorPlan}
          />
        )}

        {currentPage === 'floorplan' && (
          <FloorPlan initialGame={selectedGame} clearInitialGame={() => setSelectedGame(null)} />
        )}

        {currentPage === 'reservations' && <MyReservations />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<UserApp />} />
      <Route path="/catalog" element={<UserApp />} />
      <Route path="/floorplan" element={<UserApp />} />
      <Route path="/reservations" element={<UserApp />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signin" element={<UserAuth />} />
      <Route path="/profile" element={<UserProfile />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="reservations" element={<Reservations />} />
        <Route path="settings" element={<Settings />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<Users />} />
        <Route path="users/:id" element={<MemberDetail />} />
        <Route path="roles" element={<Roles />} />
        <Route path="audit" element={<Audit />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="inventory/:id" element={<GameDetail />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
