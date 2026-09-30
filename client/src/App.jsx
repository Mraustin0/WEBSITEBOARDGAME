import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminReservations from './pages/admin/Reservations';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* หน้าแรก สมมติให้ Redirect ไปที่หน้า Admin ก่อนชั่วคราว */}
        <Route path="/" element={<Navigate to="/admin/reservations" replace />} />

        {/* หน้าที่ 4: Admin Reservations */}
        <Route path="/admin/reservations" element={<AdminReservations />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
