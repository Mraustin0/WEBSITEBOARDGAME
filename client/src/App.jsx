import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/admin/AdminLayout.jsx';
import Reservations from './pages/admin/Reservations.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="reservations" replace />} />
        <Route path="reservations" element={<Reservations />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin/reservations" replace />} />
    </Routes>
  );
}
