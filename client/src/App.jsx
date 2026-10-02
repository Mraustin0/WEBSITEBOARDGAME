import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import AddGame from './pages/AddGame';
import GameDetail from './pages/GameDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/add" element={<AddGame />} />
        <Route path="/inventory/:id" element={<GameDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
