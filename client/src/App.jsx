import { Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
  return (
    <Routes>
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
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
