import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './AddGame.css';

export default function AddGame() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    image: '',
    minPlayers: 1,
    maxPlayers: 4,
    playtimeMin: 30,
    yearPublished: new Date().getFullYear(),
    copies: 1,
  });

  const [showBggModal, setShowBggModal] = useState(false);
  const [bggQuery, setBggQuery] = useState('');
  const [bggResults, setBggResults] = useState([]);
  const [searchingBgg, setSearchingBgg] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ['name', 'image'].includes(name) ? value : Number(value),
    }));
  };

  const handleSearchBGG = async (e) => {
    e.preventDefault();
    if (!bggQuery.trim()) return;

    setSearchingBgg(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bgg/search?q=${encodeURIComponent(bggQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setBggResults(Array.isArray(data) ? data : data.items || data.data || []);
      } else {
        alert('❌ ค้นหาไม่พบ หรือ API ไม่ตอบสนอง');
      }
    } catch (error) {
      console.error(error);
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ BGG API');
    } finally {
      setSearchingBgg(false);
    }
  };

  const handleSelectBggGame = async (bggId) => {
    setSearchingBgg(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bgg/game/${bggId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const detail = data.data || data;

        setFormData((prev) => ({
          ...prev,
          name: detail.name || prev.name,
          minPlayers: detail.minPlayers || prev.minPlayers,
          maxPlayers: detail.maxPlayers || prev.maxPlayers,
          playtimeMin: detail.playtimeMin || prev.playtimeMin,
          yearPublished: detail.yearPublished || prev.yearPublished,
          image: detail.thumbnail || detail.image || prev.image,
        }));

        setShowBggModal(false);
        setBggResults([]);
        alert('✨ ดึงข้อมูลจาก BGG สำเร็จ! ตรวจสอบความถูกต้องและกดบันทึกได้เลย');
      }
    } catch (error) {
      console.error(error);
      alert('❌ ดึงข้อมูลรายละเอียดเกมไม่สำเร็จ');
    } finally {
      setSearchingBgg(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          minPlayers: formData.minPlayers,
          maxPlayers: formData.maxPlayers,
          playtimeMin: formData.playtimeMin,
          yearPublished: formData.yearPublished,
          thumbnail: formData.image,
          copies: formData.copies,
          quantity: formData.copies,
          status: 'active',
        }),
      });

      if (response.ok) {
        alert('🎉 เพิ่มเกมใหม่เข้าคลังสำเร็จ!');
        navigate('/inventory');
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(`❌ ไม่สามารถเพิ่มเกมได้: ${errData.error || errData.message || 'ข้อมูลไม่ถูกต้อง'}`);
      }
    } catch (error) {
      console.error('Error adding game:', error);
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-game-container">
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
      </aside>

      {/* 2. Main Content */}
      <main className="main-content">
        <header className="page-header">
          <div>
            <div className="breadcrumb">
              <Link to="/inventory" className="breadcrumb-link">
                <span>←</span> กลับไปคลังเกม
              </Link>
              <span>/</span>
              <span className="breadcrumb-current">เพิ่มเกมใหม่เข้าคลัง</span>
            </div>
            <h1 className="page-title">✨ เพิ่มบอร์ดเกมใหม่ (Add New Game)</h1>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            ออกจากระบบ
          </button>
        </header>

        {/* Form Container */}
        <div className="form-container">
          {/* BGG API Banner */}
          <div className="bgg-banner">
            <div>
              <div className="bgg-banner-title">💡 เชื่อมต่อกับ BoardGameGeek API</div>
              <div className="bgg-banner-desc">
                ค้นหาเกมจาก BGG เพื่อดึงข้อมูลทั้งหมดมาเติมในฟอร์มให้อัตโนมัติ
              </div>
            </div>
            <button onClick={() => setShowBggModal(true)} type="button" className="btn-bgg-search">
              🔍 ค้นหาจาก BGG
            </button>
          </div>

          <form onSubmit={handleSubmit} className="add-game-form">
            {/* แถวที่ 1 */}
            <div className="form-row">
              <div className="form-col-3">
                <label className="form-label">
                  ชื่อบอร์ดเกม (Game Name) <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-col-1">
                <label className="form-label">
                  จำนวนในคลัง (กล่อง) <span className="required-star">*</span>
                </label>
                <input
                  type="number"
                  name="copies"
                  value={formData.copies === 0 ? '' : formData.copies}
                  onChange={handleChange}
                  min="1"
                  required
                  className="form-input"
                />
              </div>
            </div>

            {/* แถวที่ 2 */}
            <div>
              <label className="form-label">รูปภาพปกเกม (URL)</label>
              <input
                type="url"
                name="image"
                value={formData.image}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            {/* แถวที่ 3 */}
            <div className="form-grid-3">
              <div>
                <label className="form-label">
                  ผู้เล่นต่ำสุด (คน) <span className="required-star">*</span>
                </label>
                <input
                  type="number"
                  name="minPlayers"
                  value={formData.minPlayers === 0 ? '' : formData.minPlayers}
                  onChange={handleChange}
                  min="1"
                  required
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">
                  ผู้เล่นสูงสุด (คน) <span className="required-star">*</span>
                </label>
                <input
                  type="number"
                  name="maxPlayers"
                  value={formData.maxPlayers === 0 ? '' : formData.maxPlayers}
                  onChange={handleChange}
                  min="1"
                  required
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">
                  เวลาเล่นเฉลี่ย (นาที) <span className="required-star">*</span>
                </label>
                <input
                  type="number"
                  name="playtimeMin"
                  value={formData.playtimeMin === 0 ? '' : formData.playtimeMin}
                  onChange={handleChange}
                  min="1"
                  required
                  className="form-input"
                />
              </div>
            </div>

            {/* แถวที่ 4 */}
            <div className="form-col-width-30">
              <label className="form-label">ปีที่พิมพ์ (Year Published)</label>
              <input
                type="number"
                name="yearPublished"
                value={formData.yearPublished === 0 ? '' : formData.yearPublished}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <hr className="form-divider" />

            {/* Action Buttons */}
            <div className="form-actions">
              <Link to="/inventory" className="btn-cancel">
                ยกเลิก
              </Link>
              <button type="submit" disabled={loading} className="btn-submit">
                {loading ? 'กำลังบันทึก...' : '💾 บันทึกเกมเข้าคลัง'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* 3. Modal ค้นหา BGG */}
      {showBggModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">🔍 ค้นหาบอร์ดเกมจาก BGG</h2>
              <button onClick={() => setShowBggModal(false)} className="btn-close-modal">
                ✖
              </button>
            </div>

            <form onSubmit={handleSearchBGG} className="modal-search-form">
              <input
                type="text"
                value={bggQuery}
                onChange={(e) => setBggQuery(e.target.value)}
                placeholder="พิมพ์ชื่อเกมภาษาอังกฤษ..."
                className="modal-search-input"
                required
              />
              <button type="submit" disabled={searchingBgg} className="btn-modal-search">
                {searchingBgg ? 'กำลังหา...' : 'ค้นหา'}
              </button>
            </form>

            {/* ผลลัพธ์ BGG */}
            <div className="modal-results-list">
              {bggResults.length > 0 ? (
                bggResults.map((bggGame) => (
                  <div key={bggGame.bggId} className="modal-result-item">
                    <div className="modal-result-info">
                      <div className="modal-result-name">{bggGame.name}</div>
                      <div className="modal-result-year">ปี: {bggGame.yearPublished || '-'}</div>
                    </div>
                    <button
                      onClick={() => handleSelectBggGame(bggGame.bggId)}
                      disabled={searchingBgg}
                      className="btn-select-game"
                    >
                      เลือก
                    </button>
                  </div>
                ))
              ) : (
                <div className="modal-empty-state">พิมพ์ชื่อเกมแล้วกดค้นหา เพื่อดูผลลัพธ์</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
