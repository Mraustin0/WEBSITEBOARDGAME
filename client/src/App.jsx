import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import UserLayout from './components/user/UserLayout.jsx';
import GameCatalog from './pages/GameCatalog.jsx';
import FloorPlan from './pages/FloorPlan.jsx';
import MyReservations from './pages/MyReservations.jsx';
import { getToken, isStaff, useSession } from './lib/session.js';

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

/** หน้าหลังร้าน: ต้อง login และเป็นพนักงาน/แอดมิน (สมาชิกถูกส่งกลับหน้าคลังเกม) */
function RequireStaff({ children }) {
  const user = useSession();
  if (!getToken() || !user) return <Navigate to="/login" replace />;
  if (!isStaff(user)) return <Navigate to="/catalog" replace />;
  return children;
}

/** หน้าของสมาชิกที่ต้อง login (การจองของฉัน, โปรไฟล์) → ไปหน้า /signin แล้วกลับมาที่เดิม */
function RequireMember({ children }) {
  const user = useSession();
  const location = useLocation();
  if (!getToken() || !user) {
    return <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
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
      <Route element={<UserLayout />}>
        <Route path="/" element={<Navigate to="/catalog" replace />} />
        <Route path="/catalog" element={<GameCatalog />} />
        <Route path="/booking" element={<FloorPlan />} />
        <Route path="/floorplan" element={<Navigate to="/booking" replace />} />
        <Route
          path="/reservations"
          element={
            <RequireMember>
              <MyReservations />
            </RequireMember>
          }
        />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/signin" element={<UserAuth />} />
      <Route
        path="/profile"
        element={
          <RequireMember>
            <UserProfile />
          </RequireMember>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireStaff>
            <AdminLayout />
          </RequireStaff>
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
      <Route path="*" element={<Navigate to="/catalog" replace />} />
    </Routes>
  );
}
