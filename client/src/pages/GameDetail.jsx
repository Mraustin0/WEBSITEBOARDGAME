import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

export default function GameDetail() {
  const { id } = useParams(); // ดึง ID จาก URL (เช่น /inventory/12345)
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);

  // ดึงข้อมูลเกมตาม ID
  const fetchGameDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/games/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        // ปรับตามโครงสร้าง Backend ของคุณ
        const gameData = data.data || data.game || data.item || data;
        setGame(gameData);
        setEditData(gameData); // เตรียมข้อมูลไว้เผื่อกดแก้ไข
      } else {
        alert('❌ ไม่พบข้อมูลเกมนี้');
        navigate('/inventory'); // กลับไปหน้าคลังถ้าไม่เจอ
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

  // ฟังก์ชันลบเกม
  const handleDeleteGame = async () => {
    if (!window.confirm(`⚠️ คุณต้องการลบเกม "${game.name}" ออกจากระบบใช่หรือไม่?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/games/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        alert('🗑️ ลบเกมออกจากระบบเรียบร้อยแล้ว');
        navigate('/inventory'); // ลบเสร็จให้เด้งกลับหน้า Inventory
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(`❌ ลบไม่สำเร็จ: ${errData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(error);
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  // ฟังก์ชันอัปเดตข้อมูลเกม
  const handleUpdateGame = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/games/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        alert('🎉 บันทึกการแก้ไขสำเร็จ!');
        setIsEditing(false);
        fetchGameDetail(); // ดึงข้อมูลใหม่มาแสดง
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(`❌ แก้ไขไม่สำเร็จ: ${errData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(error);
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f4f6f8',
        }}
      >
        <h2>⏳ กำลังโหลดข้อมูล...</h2>
      </div>
    );
  }

  if (!game) return null; // ป้องกันเรนเดอร์ตอนข้อมูลว่างเปล่า

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f4f6f8',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* 1. Sidebar ด้านซ้าย (คงรูปแบบเดิมไว้) */}
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
            <Link
              to="/inventory"
              style={{
                backgroundColor: '#166534',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: 'white',
                textDecoration: 'none',
              }}
            >
              <span>📦</span> คลังเกม (Inventory)
            </Link>
            {/* เมนูอื่นๆ ปล่อยเป็น div ตามหน้าเดิม */}
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
              <Link to="/inventory" style={{ color: '#134e35', textDecoration: 'none' }}>
                คลังบอร์ดเกม
              </Link>{' '}
              &gt; รายละเอียดเกม
            </div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#111827' }}>{game.name}</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link
              to="/inventory"
              style={{
                backgroundColor: '#f3f4f6',
                color: '#374151',
                textDecoration: 'none',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                border: '1px solid #d1d5db',
              }}
            >
              🔙 กลับหน้าคลัง
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

        {/* ข้อมูลเกม (Card ใหญ่) */}
        <div
          style={{
            display: 'flex',
            gap: '2rem',
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          {/* รูปภาพ */}
          <div style={{ flex: '0 0 300px' }}>
            <div
              style={{
                width: '100%',
                height: '300px',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {game.imageUrl ? (
                <img
                  src={game.imageUrl}
                  alt={game.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ color: '#9ca3af' }}>ไม่มีรูปภาพ</span>
              )}
            </div>
          </div>

          {/* รายละเอียด */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
            >
              <div>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', color: '#111827' }}>
                  {game.name}
                </h2>
                <span
                  style={{
                    backgroundColor: '#def7ec',
                    color: '#03543f',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    display: 'inline-block',
                    marginBottom: '1.5rem',
                  }}
                >
                  ✅ พร้อมให้บริการ
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    backgroundColor: '#134e35',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  ✏️ แก้ไขข้อมูล
                </button>
                <button
                  onClick={handleDeleteGame}
                  style={{
                    backgroundColor: 'white',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  🗑️ ลบ
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.5rem',
                borderTop: '1px solid #f3f4f6',
                paddingTop: '1.5rem',
              }}
            >
              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                  จำนวนผู้เล่น (คน)
                </p>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#111827' }}>
                  👥 {game.minPlayers} - {game.maxPlayers}
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                  เวลาเล่นเฉลี่ย (นาที)
                </p>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#111827' }}>
                  ⏱️ {game.playtimeMin}
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                  จำนวนกล่องในคลัง
                </p>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#166534' }}>
                  📦 {game.quantity || 1} กล่อง
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                  ปีที่พิมพ์ / วางจำหน่าย
                </p>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#111827' }}>
                  📅 {game.yearPublished || 'ไม่ระบุ'}
                </p>
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>
                Database ID: {game._id}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* POP-UP MODAL (แก้ไขข้อมูลเกม) เหมือนกับหน้า Inventory */}
      {isEditing && (
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
            <h2 style={{ margin: '0 0 1.5rem 0', color: '#134e35', fontSize: '1.25rem' }}>
              ⚙️ แก้ไขข้อมูลเกม
            </h2>

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
                  value={editData.imageUrl || ''}
                  onChange={(e) => setEditData({ ...editData, imageUrl: e.target.value })}
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
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#374151' }}>
                    ชื่อเกม:
                  </label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
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
                    value={editData.quantity || 1}
                    onChange={(e) => setEditData({ ...editData, quantity: e.target.value })}
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
                    value={editData.minPlayers}
                    onChange={(e) => setEditData({ ...editData, minPlayers: e.target.value })}
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
                    value={editData.maxPlayers}
                    onChange={(e) => setEditData({ ...editData, maxPlayers: e.target.value })}
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
                    value={editData.playtimeMin}
                    onChange={(e) => setEditData({ ...editData, playtimeMin: e.target.value })}
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
                    value={editData.yearPublished || ''}
                    onChange={(e) => setEditData({ ...editData, yearPublished: e.target.value })}
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

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
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
