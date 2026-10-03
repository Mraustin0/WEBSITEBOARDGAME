import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import './GameDetail.css';

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [activeTab, setActiveTab] = useState('general');

  const fetchGameDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/games/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const gameData = data.data || data.game || data.item || data;
        setGame(gameData);
        setEditData(gameData);
      } else {
        alert('❌ ไม่พบข้อมูลเกมนี้');
        navigate('/inventory');
      }
    } catch (error) {
      console.error(error);
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    fetchGameDetail();
  }, [id, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleDeleteGame = async () => {
    if (!window.confirm(`⚠️ คุณต้องการลบเกม "${game.name}" ออกจากระบบใช่หรือไม่?`)) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/games/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        alert('🗑️ ลบเกมออกจากระบบเรียบร้อยแล้ว');
        navigate('/inventory');
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(`❌ ลบไม่สำเร็จ: ${errData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateGame = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/games/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        alert('🎉 บันทึกการแก้ไขสำเร็จ!');
        setIsEditing(false);
        fetchGameDetail();
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(`❌ แก้ไขไม่สำเร็จ: ${errData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="center-screen">
        <h2>⏳ กำลังโหลดข้อมูล...</h2>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="center-screen-col">
        <h2>❌ ไม่พบข้อมูลเกมนี้</h2>
        <button onClick={() => navigate('/inventory')} className="btn btn-solid-green">
          กลับหน้าคลังเกม
        </button>
      </div>
    );
  }

  const sku = game.sku || `BG-${game.yearPublished || 'YYYY'}-${id.slice(-4).toUpperCase()}`;
  const condition = game.condition || `มีในคลัง ${game.copies || game.quantity || 1} กล่อง`;
  const bggScore = game.bggScore || '-';
  const complexity = game.complexity || '-';

  return (
    <div className="game-detail-container">
      {/* Sidebar */}
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
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header & Quick Actions */}
        <header className="page-header">
          <div>
            <div className="breadcrumb">
              <Link to="/inventory" className="breadcrumb-link">
                <span>←</span> กลับไปคลังเกม
              </Link>
              <span>/</span>
              <span>รายละเอียดเกม</span>
              <span>/</span>
              <span className="breadcrumb-current">{sku}</span>
            </div>
          </div>
          <div className="quick-actions">
            <button onClick={() => setIsEditing(true)} className="btn btn-outline-gray">
              ✏️ แก้ไขข้อมูล
            </button>
            <button className="btn btn-outline-red">🚫 บันทึกส่งซ่อม</button>
            <button className="btn btn-solid-green">✔️ จองโต๊ะพร้อมเกมนี้</button>
          </div>
        </header>

        {/* Hero Section */}
        <div className="hero-card">
          <div className="hero-image-wrapper">
            {game.image || game.imageUrl ? (
              <img src={game.image || game.imageUrl} alt={game.name} className="hero-image" />
            ) : (
              <div className="hero-no-image">ไม่มีรูปภาพปก</div>
            )}
            <span className="badge-year">{game.yearPublished || 'N/A'}</span>
            <span className="badge-sku-img">SKU: {sku}</span>
          </div>

          <div className="hero-details">
            <div className="hero-badges-row">
              <div className="hero-badges-left">
                <span className="badge-condition">
                  <span className="dot-green"></span> {condition}
                </span>
                <span className="badge-bgg-score">⭐ BGG • {bggScore} / 10</span>
              </div>
            </div>

            <h1 className="game-title">{game.name}</h1>
            <p className="game-subtitle">{game.subtitle || 'Board Game'}</p>

            <div className="game-credits">
              <div>
                👤 <span className="credit-highlight">ผู้ออกแบบ:</span>{' '}
                {game.designer || 'รอเพิ่มข้อมูล'}
              </div>
              <div>
                🏢 <span className="credit-highlight">ผู้ผลิต:</span>{' '}
                {game.publisher || 'รอเพิ่มข้อมูล'}
              </div>
            </div>

            <div className="stats-grid-4">
              <div className="stat-box">
                <span className="stat-icon">👥</span>
                <div>
                  <div className="stat-label">จำนวนผู้เล่น</div>
                  <div className="stat-value">
                    {game.minPlayers} - {game.maxPlayers} <span className="stat-unit">คน</span>
                  </div>
                </div>
              </div>
              <div className="stat-box">
                <span className="stat-icon">⏱️</span>
                <div>
                  <div className="stat-label">เวลาเล่นเฉลี่ย</div>
                  <div className="stat-value">
                    {game.playtimeMin} <span className="stat-unit">นาที</span>
                  </div>
                </div>
              </div>
              <div className="stat-box">
                <span className="stat-icon">🧠</span>
                <div>
                  <div className="stat-label">ระดับความซับซ้อน</div>
                  <div className="stat-value">
                    {complexity} <span className="stat-unit-small"></span>
                  </div>
                </div>
              </div>
              <div className="stat-box">
                <span className="stat-icon">🧒</span>
                <div>
                  <div className="stat-label">ช่วงอายุแนะนำ</div>
                  <div className="stat-value">
                    {game.minAge || '?'} <span className="stat-unit">ปีขึ้นไป</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <div
            onClick={() => setActiveTab('general')}
            className={`tab-item ${activeTab === 'general' ? 'active' : ''}`}
          >
            ℹ️ ข้อมูลทั่วไป (General)
          </div>
          <div
            onClick={() => setActiveTab('copies')}
            className={`tab-item ${activeTab === 'copies' ? 'active' : ''}`}
          >
            📦 สำเนา & สภาพเกม{' '}
            <span className="tab-count-badge">{game.copies || game.quantity || 1}</span>
          </div>
        </div>

        {/* Layout ซ้ายขวา แบบ Dynamic */}
        <div className="layout-2-cols">
          <div className="col-main">
            {/* Overview */}
            <div className="content-card">
              <h3 className="card-title">📖 เรื่องย่อและรูปแบบการเล่น</h3>
              <p className="card-paragraph">
                {game.description ||
                  `ยังไม่มีคำอธิบายและเรื่องย่อสำหรับเกม ${game.name} ในระบบ กรุณาอัปเดตข้อมูลจาก BoardGameGeek หรือพิมพ์ด้วยตนเอง`}
              </p>
            </div>

            {/* Metadata Grid */}
            <div className="content-card">
              <h3 className="card-title">🗂️ คุณสมบัติจำเพาะ</h3>
              <div className="metadata-grid">
                <div className="metadata-box">
                  <div className="metadata-label">ขนาดซองการ์ด (SLEEVE SIZE)</div>
                  <div className="metadata-value">{game.sleeveSize || 'ไม่ระบุ'}</div>
                </div>
                <div className="metadata-box">
                  <div className="metadata-label">ภาษาในเกม (LANGUAGE)</div>
                  <div className="metadata-value">{game.language || 'ไม่ระบุ'}</div>
                </div>
                <div className="metadata-box">
                  <div className="metadata-label">ความพึ่งพาภาษา</div>
                  <div className="metadata-value">{game.languageDependency || 'ไม่ระบุ'}</div>
                </div>
                <div className="metadata-box">
                  <div className="metadata-label">ขนาดกล่อง</div>
                  <div className="metadata-value">{game.boxDimensions || 'ไม่ระบุ'}</div>
                </div>
                <div className="metadata-box">
                  <div className="metadata-label">ตำแหน่งจัดเก็บ</div>
                  <div className="metadata-value">{game.location || 'คลังส่วนกลาง'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-side">
            {/* Review Card */}
            <div className="side-card">
              <h4 className="side-card-title">คะแนนรีวิว & น้ำหนักเกม</h4>
              <div className="bgg-score-container">
                <div className="bgg-score-box">
                  <span className="bgg-score-number">{bggScore}</span>
                  <span className="bgg-score-max">เต็ม 10</span>
                </div>
                <div>
                  <div className="bgg-ref-text">อ้างอิงจาก BoardGameGeek</div>
                </div>
              </div>
            </div>

            {/* Checklist แบบ Dynamic */}
            <div className="side-card">
              <div className="checklist-header">
                <h4 className="side-card-title" style={{ margin: 0 }}>
                  รายการอุปกรณ์ภายในกล่อง
                </h4>
              </div>
              <div className="checklist-items">
                {game.components && game.components.length > 0 ? (
                  game.components.map((comp, idx) => (
                    <div key={idx} className="checklist-item">
                      <span>
                        <span className="check-icon">✔</span> {comp.name}
                      </span>
                      <b>{comp.amount}</b>
                    </div>
                  ))
                ) : (
                  <p className="empty-checklist">ยังไม่มีการบันทึกรายการอุปกรณ์</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* POP-UP MODAL แก้ไขเกม */}
      {isEditing && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">⚙️ แก้ไขข้อมูลเกม</h2>
            <form onSubmit={handleUpdateGame} className="edit-form">
              <div>
                <label className="form-label">รูปภาพปก (URL):</label>
                <input
                  type="url"
                  value={editData.image || editData.imageUrl || ''}
                  onChange={(e) =>
                    setEditData({ ...editData, image: e.target.value, imageUrl: e.target.value })
                  }
                  className="form-input"
                />
              </div>
              <div className="form-group-flex">
                <div className="flex-2">
                  <label className="form-label">ชื่อเกม:</label>
                  <input
                    type="text"
                    value={editData.name || ''}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="form-label">จำนวน (กล่อง):</label>
                  <input
                    type="number"
                    value={editData.copies ?? editData.quantity ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setEditData({ ...editData, copies: val, quantity: val });
                    }}
                    className="form-input"
                    required
                    min="1"
                  />
                </div>
              </div>
              <div className="form-group-flex">
                <div className="flex-1">
                  <label className="form-label">ผู้เล่นต่ำสุด:</label>
                  <input
                    type="number"
                    value={editData.minPlayers || ''}
                    onChange={(e) => setEditData({ ...editData, minPlayers: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="form-label">ผู้เล่นสูงสุด:</label>
                  <input
                    type="number"
                    value={editData.maxPlayers || ''}
                    onChange={(e) => setEditData({ ...editData, maxPlayers: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              <div className="form-group-flex">
                <div className="flex-1">
                  <label className="form-label">เวลาเล่น (นาที):</label>
                  <input
                    type="number"
                    value={editData.playtimeMin || ''}
                    onChange={(e) => setEditData({ ...editData, playtimeMin: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="form-label">ปีที่พิมพ์:</label>
                  <input
                    type="number"
                    value={editData.yearPublished || ''}
                    onChange={(e) => setEditData({ ...editData, yearPublished: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn btn-outline-gray"
                >
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-solid-green">
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
