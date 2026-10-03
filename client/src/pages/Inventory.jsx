import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Inventory.css'; // 🌟 Import ไฟล์ CSS

export default function Inventory() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }

    const fetchGames = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/games', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        console.log('API Response:', data);

        if (Array.isArray(data)) {
          setGames(data);
        } else if (data && Array.isArray(data.items)) {
          setGames(data.items);
        } else if (data && Array.isArray(data.data)) {
          setGames(data.data);
        } else if (data && Array.isArray(data.games)) {
          setGames(data.games);
        } else {
          setGames([]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const safeGames = Array.isArray(games) ? games : [];

  const filteredGames = safeGames.filter((game) =>
    game.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="inventory-container">
      {/* 1. Sidebar */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-header">
            <div className="sidebar-logo-icon">%</div>
            <div className="sidebar-logo-text">
              <h2>SomeDay</h2>
              <span>BOARDGAME CAFE</span>
            </div>
            <span className="sidebar-badge">ADMIN</span>
          </div>
          <div className="sidebar-menu-title">MAIN MODULES / เมนูหลัก</div>
          <div className="sidebar-menu">
            <Link to="/inventory" className="menu-item active">
              <span>📦</span> คลังเกม (Inventory)
            </Link>
            <div className="menu-item">
              <span>🪑</span> จัดการโต๊ะ / ตารางจอง
            </div>
            <Link to="/users" className="menu-item">
              <span>👥</span> จัดการผู้ใช้ (Users)
            </Link>
          </div>
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-footer-title">● Live Store Floor</div>
          <div className="sidebar-footer-version">Core System Engine v2.4.0</div>
        </div>
      </aside>

      {/* 2. Main Content */}
      <main className="main-content">
        {/* Header Bar */}
        <header className="inventory-header">
          <div>
            <div className="header-breadcrumb">
              การจัดการระบบ (OVERVIEW) &gt; คลังบอร์ดเกม (INVENTORY VAULT)
            </div>
            <h1 className="header-title">คลังบอร์ดเกม (Game Inventory Management)</h1>
            <p className="header-subtitle">
              รายละเอียดการจัดเก็บทั้งหมดในระบบ <b>{safeGames.length}</b> รายการ
            </p>
          </div>
          <div className="header-actions">
            <Link to="/add" className="btn-add-game">
              + เพิ่มเกมใหม่เข้าคลัง (Add New)
            </Link>
            <button onClick={handleLogout} className="btn-logout">
              ออกจากระบบ
            </button>
          </div>
        </header>

        {/* Metric Cards */}
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">เกมทั้งหมดในคลัง (TOTAL VAULT)</span>
            <h2 className="metric-value">
              {safeGames.length} <span className="metric-unit">กล่อง</span>
            </h2>
          </div>
          <div className="metric-card">
            <span className="metric-label text-green font-bold">พร้อมให้บริการ (IN-VAULT)</span>
            <h2 className="metric-value text-green">
              {safeGames.length} <span className="metric-unit">กล่อง</span>
            </h2>
          </div>
          <div className="metric-card">
            <span className="metric-label text-orange font-bold">กำลังเล่นอยู่ (IN-PLAY)</span>
            <h2 className="metric-value text-orange">
              0 <span className="metric-unit">กล่อง</span>
            </h2>
          </div>
          <div className="metric-card">
            <span className="metric-label text-red font-bold">ส่งซ่อมบำรุง (MAINTENANCE)</span>
            <h2 className="metric-value text-red">
              0 <span className="metric-unit">กล่อง</span>
            </h2>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <input
            type="text"
            placeholder="🔍 ค้นหาชื่อบอร์ดเกม, ดีไซเนอร์, รหัสสโตร์ ได้จากที่นี่..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Game Cards Grid */}
        {loading ? (
          <p>⏳ กำลังโหลดข้อมูลคลังเกม...</p>
        ) : filteredGames.length === 0 ? (
          <div className="empty-state">
            <p className="empty-text">
              📭 ไม่พบรายชื่อบอร์ดเกมในระบบ ลองกดปุ่ม "+ เพิ่มเกมใหม่เข้าคลัง" ด้านบนเพื่อเริ่มต้น
            </p>
          </div>
        ) : (
          <div className="games-grid">
            {filteredGames.map((game) => (
              <div key={game._id || game.id} className="game-card">
                <img
                  src={game.thumbnail || game.image || 'https://placehold.co/400x300?text=No+Image'}
                  alt={game.name}
                  className="game-card-img"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://placehold.co/400x300?text=No+Image';
                  }}
                />

                <div className="game-card-body">
                  <div className="game-card-header">
                    <span className="badge-ready">พร้อมใช้งาน</span>
                    <span className="game-year">{game.yearPublished || '2024'}</span>
                  </div>
                  <h3 className="game-card-title">{game.name}</h3>
                  <div className="game-card-stats">
                    <span>
                      👥 {game.minPlayers}-{game.maxPlayers} คน
                    </span>
                    <span>⏱️ {game.playtimeMin} นาที</span>
                  </div>
                </div>

                <div className="game-card-footer">
                  <span className="game-id">ID: {game._id ? game._id.slice(-6) : 'N/A'}</span>
                  <button
                    onClick={() => navigate(`/inventory/${game._id || game.id}`)}
                    className="btn-manage"
                  >
                    ดูรายละเอียด / จัดการ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
