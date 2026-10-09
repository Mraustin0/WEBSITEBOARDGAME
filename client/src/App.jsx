import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import GameCatalog from './pages/GameCatalog.jsx';
import FloorPlan from './pages/FloorPlan.jsx';
import MyReservations from './pages/MyReservations.jsx';

import AdminLayout from './components/admin/AdminLayout.jsx';
import Login from './pages/Login.jsx';
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

function ComingSoon() {
  return (
    <div className="panel">
      <h2>หน้านี้ยังไม่พร้อมใช้งาน</h2>
      <p className="muted">กำลังพัฒนา</p>
    </div>
  );
}

function UserApp() {
  const [currentPage, setCurrentPage] = useState('floorplan');
  const [selectedGame, setSelectedGame] = useState(null);

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
            onClick={() => setCurrentPage('reservations')}
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
          <button className="relative w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 hover:bg-white text-slate-600 flex items-center justify-center text-sm shadow-sm transition">
            <i className="fa-solid fa-bell"></i>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute top-2 right-2.5"></span>
          </button>
          <div className="h-6 w-px bg-slate-200 mx-1"></div>
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-[#064e3b] text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0">
              JD
            </div>
            <span className="text-sm font-bold text-slate-700 hidden sm:inline-block">
              Guildmaster Alex
            </span>
          </div>
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
