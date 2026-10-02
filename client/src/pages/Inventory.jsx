import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Inventory() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);

  // ฟังก์ชันดึงข้อมูลเกม
  const fetchGames = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/games', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
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

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    fetchGames();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // ฟังก์ชันส่งข้อมูลที่แก้ไขไปอัปเดตที่หลังบ้าน
  const handleUpdateGame = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/games/${selectedGame._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(selectedGame),
      });

      if (response.ok) {
        alert('🎉 บันทึกการแก้ไขสำเร็จ!');
        setSelectedGame(null);
        fetchGames();
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(`❌ แก้ไขไม่สำเร็จ: ${errData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(error);
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  // ฟังก์ชันลบเกม
  const handleDeleteGame = async () => {
    if (!window.confirm(`⚠️ คุณต้องการลบเกม "${selectedGame.name}"ออกจากระบบใช่หรือไม่?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/games/${selectedGame._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        alert('🗑️ ลบเกมออกจากระบบเรียบร้อยแล้ว');
        setSelectedGame(null);
        fetchGames();
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(`❌ ลบไม่สำเร็จ: ${errData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(error);
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const safeGames = Array.isArray(games) ? games : [];
  const filteredGames = safeGames.filter((game) =>
    game.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f4f6f8',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* 1. Sidebar ด้านซ้าย */}
      <aside
        style={{
          width: '260px',
          backgroundColor: '#134e35',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1.5rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '2.5rem',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                backgroundColor: '#22c55e',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: '#134e35',
              }}
            >
              %
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem' }}>SomeDay</h2>
              <span style={{ fontSize: '0.7rem', color: '#86efac' }}>BOARDGAME CAFE</span>
            </div>
            <span
              style={{
                marginLeft: 'auto',
                backgroundColor: '#166534',
                fontSize: '0.65rem',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              ADMIN
            </span>
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: '#9ca3af',
              marginBottom: '0.75rem',
              fontWeight: 'bold',
              letterSpacing: '0.5px',
            }}
          >
            MAIN MODULES / เมนูหลัก
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div
              style={{
                backgroundColor: '#166534',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <span>📦</span> คลังเกม (Inventory)
            </div>
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#d1d5db',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <span>🪑</span> จัดการโต๊ะ / ตารางจอง
            </div>
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#d1d5db',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <span>👥</span> จัดการผู้ใช้ (Users)
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#86efac', marginBottom: '0.5rem' }}>
            ● Live Store Floor
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Core System Engine v2.4.0</div>
        </div>
      </aside>

      {/* 2. พื้นที่เนื้อหาหลักด้านขวา */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            backgroundColor: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '2px' }}>
              การจัดการระบบ (OVERVIEW) &gt; คลังบอร์ดเกม (INVENTORY VAULT)
            </div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#111827' }}>
              คลังบอร์ดเกม (Game Inventory Management)
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#4b5563' }}>
              รายละเอียดการจัดเก็บทั้งหมดในระบบ <b>{safeGames.length}</b> รายการ
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link
              to="/add"
              style={{
                backgroundColor: '#134e35',
                color: 'white',
                textDecoration: 'none',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 'bold',
              }}
            >
              + เพิ่มเกมใหม่เข้าคลัง (Add New)
            </Link>
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ออกจากระบบ
            </button>
          </div>
        </header>

        {/* Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              เกมทั้งหมดในคลัง (TOTAL VAULT)
            </span>
            <h2 style={{ margin: '0.5rem 0 0 0', fontSize: '1.75rem', color: '#111827' }}>
              {safeGames.length}{' '}
              <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#6b7280' }}>
                กล่อง
              </span>
            </h2>
          </div>
          <div
            style={{
              background: 'white',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 'bold' }}>
              พร้อมให้บริการ (IN-VAULT)
            </span>
            <h2 style={{ margin: '0.5rem 0 0 0', fontSize: '1.75rem', color: '#166534' }}>
              {safeGames.length}{' '}
              <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#6b7280' }}>
                กล่อง
              </span>
            </h2>
          </div>
          <div
            style={{
              background: 'white',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 'bold' }}>
              กำลังเล่นอยู่ (IN-PLAY)
            </span>
            <h2 style={{ margin: '0.5rem 0 0 0', fontSize: '1.75rem', color: '#d97706' }}>
              0{' '}
              <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#6b7280' }}>
                กล่อง
              </span>
            </h2>
          </div>
          <div
            style={{
              background: 'white',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 'bold' }}>
              ส่งซ่อมบำรุง (MAINTENANCE)
            </span>
            <h2 style={{ margin: '0.5rem 0 0 0', fontSize: '1.75rem', color: '#dc2626' }}>
              0{' '}
              <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#6b7280' }}>
                กล่อง
              </span>
            </h2>
          </div>
        </div>

        {/* แถบค้นหา */}
        <div style={{ marginBottom: '1.5rem' }}>
          <input
            type="text"
            placeholder="🔍 ค้นหาชื่อบอร์ดเกม, ดีไซเนอร์, รหัสสโตร์ ได้จากที่นี่..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '0.95rem',
              boxSizing: 'border-box',
              backgroundColor: 'white',
            }}
          />
        </div>

        {/* รายการการ์ดเกม */}
        {loading ? (
          <p>⏳ กำลังโหลดข้อมูลคลังเกม...</p>
        ) : filteredGames.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem',
              background: 'white',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
            }}
          >
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
              📭 ไม่พบรายชื่อบอร์ดเกมในระบบ ลองกดปุ่ม "+ เพิ่มเกมใหม่เข้าคลัง" ด้านบนเพื่อเริ่มต้น
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {filteredGames.map((game) => (
              <div
                key={game._id || game.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ padding: '1.25rem' }}>
                  {/* แสดงรูปภาพถ้ามี */}
                  {game.imageUrl && (
                    <div
                      style={{
                        width: '100%',
                        height: '160px',
                        overflow: 'hidden',
                        marginBottom: '1rem',
                        borderRadius: '8px',
                      }}
                    >
                      <img
                        src={game.imageUrl}
                        alt={game.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: '#def7ec',
                        color: '#03543f',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                      }}
                    >
                      พร้อมใช้งาน {game.quantity ? `(${game.quantity} กล่อง)` : ''}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 'bold' }}>
                      {game.yearPublished || '2024'}
                    </span>
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#111827' }}>
                    {game.name}
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      color: '#4b5563',
                      fontSize: '0.85rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <span>
                      👥 {game.minPlayers}-{game.maxPlayers} คน
                    </span>
                    <span>⏱️ {game.playtimeMin} นาที</span>
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#f9fafb',
                    padding: '0.75rem 1.25rem',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    ID: {game._id ? game._id.slice(-6) : 'N/A'}
                  </span>
                  <button
                    onClick={() => navigate(`/inventory/${game._id}`)}
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid #d1d5db',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: '#374151',
                    }}
                  >
                    ดูรายละเอียด / จัดการ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* POP-UP MODAL (แก้ไขและลบเกม) */}
      {selectedGame && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              width: '450px',
              maxWidth: '90%',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h2 style={{ margin: 0, color: '#134e35', fontSize: '1.25rem' }}>
                ⚙️ จัดการและแก้ไขข้อมูลเกม
              </h2>
              <button
                type="button"
                onClick={handleDeleteGame}
                title="ลบเกมนี้ออกจากระบบ"
                style={{
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 'bold',
                }}
              >
                🗑️ ลบเกม
              </button>
            </div>

            <form
              onSubmit={handleUpdateGame}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#374151' }}>
                  รูปภาพ (URL):
                </label>
                <input
                  type="text"
                  value={selectedGame.imageUrl || ''}
                  onChange={(e) => setSelectedGame({ ...selectedGame, imageUrl: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    marginTop: '4px',
                    boxSizing: 'border-box',
                  }}
                  placeholder="ลิงก์รูปภาพตัวอย่าง"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#374151' }}>
                    ชื่อเกม:
                  </label>
                  <input
                    type="text"
                    value={selectedGame.name}
                    onChange={(e) => setSelectedGame({ ...selectedGame, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      marginTop: '4px',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#374151' }}>
                    จำนวน (กล่อง):
                  </label>
                  <input
                    type="number"
                    value={selectedGame.quantity || 1}
                    onChange={(e) => setSelectedGame({ ...selectedGame, quantity: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      marginTop: '4px',
                      boxSizing: 'border-box',
                    }}
                    required
                    min="1"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#374151' }}>
                    ผู้เล่นต่ำสุด:
                  </label>
                  <input
                    type="number"
                    value={selectedGame.minPlayers}
                    onChange={(e) =>
                      setSelectedGame({ ...selectedGame, minPlayers: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      marginTop: '4px',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#374151' }}>
                    ผู้เล่นสูงสุด:
                  </label>
                  <input
                    type="number"
                    value={selectedGame.maxPlayers}
                    onChange={(e) =>
                      setSelectedGame({ ...selectedGame, maxPlayers: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      marginTop: '4px',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#374151' }}>
                    เวลาเล่น (นาที):
                  </label>
                  <input
                    type="number"
                    value={selectedGame.playtimeMin}
                    onChange={(e) =>
                      setSelectedGame({ ...selectedGame, playtimeMin: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      marginTop: '4px',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#374151' }}>
                    ปีที่พิมพ์:
                  </label>
                  <input
                    type="number"
                    value={selectedGame.yearPublished || ''}
                    onChange={(e) =>
                      setSelectedGame({ ...selectedGame, yearPublished: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      marginTop: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '4px 0 0 0' }}>
                รหัส ID: {selectedGame._id}
              </p>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedGame(null)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#134e35',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
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
