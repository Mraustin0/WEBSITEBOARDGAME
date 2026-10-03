import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

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

  if (!game) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          backgroundColor: '#f4f6f8',
        }}
      >
        <h2>❌ ไม่พบข้อมูลเกมนี้</h2>
        <button
          onClick={() => navigate('/inventory')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#134e35',
            color: 'white',
            borderRadius: '8px',
            cursor: 'pointer',
            border: 'none',
          }}
        >
          กลับหน้าคลังเกม
        </button>
      </div>
    );
  }

  // 🌟 ดึงข้อมูลจาก API จริง ถ้าไม่มีให้เป็นค่าเริ่มต้น
  const sku = game.sku || `BG-${game.yearPublished || 'YYYY'}-${id.slice(-4).toUpperCase()}`;
  const condition = game.condition || `มีในคลัง ${game.copies || game.quantity || 1} กล่อง`;
  const bggScore = game.bggScore || '-';
  const complexity = game.complexity || '-';

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: "'Kanit', sans-serif",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: '260px',
          backgroundColor: '#134e35',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1.5rem',
          flexShrink: 0,
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
            <Link
              to="/users"
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#d1d5db',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textDecoration: 'none',
              }}
            >
              <span>👥</span> จัดการผู้ใช้ (Users)
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
        {/* Header & Quick Actions */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: '#6b7280',
                fontWeight: '600',
                marginBottom: '8px',
              }}
            >
              <Link
                to="/inventory"
                style={{
                  color: '#4b5563',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '1rem' }}>←</span> กลับไปคลังเกม
              </Link>
              <span>/</span>
              <span>รายละเอียดเกม</span>
              <span>/</span>
              <span style={{ color: '#111827' }}>{sku}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              ✏️ แก้ไขข้อมูล
            </button>
            <button
              style={{
                backgroundColor: 'white',
                color: '#dc2626',
                border: '1px solid #fca5a5',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              🚫 บันทึกส่งซ่อม
            </button>
            <button
              style={{
                backgroundColor: '#134e35',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              ✔️ จองโต๊ะพร้อมเกมนี้
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <div
          style={{
            display: 'flex',
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            gap: '2rem',
            border: '1px solid #e5e7eb',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              width: '280px',
              height: '280px',
              flexShrink: 0,
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: '#f3f4f6',
              position: 'relative',
            }}
          >
            {game.image || game.imageUrl ? (
              <img
                src={game.image || game.imageUrl}
                alt={game.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af',
                }}
              >
                ไม่มีรูปภาพปก
              </div>
            )}
            <span
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                backgroundColor: '#166534',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                padding: '4px 10px',
                borderRadius: '12px',
              }}
            >
              {game.yearPublished || 'N/A'}
            </span>
            <span
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                backgroundColor: 'rgba(0,0,0,0.6)',
                color: 'white',
                fontSize: '0.7rem',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
            >
              SKU: {sku}
            </span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span
                  style={{
                    backgroundColor: '#def7ec',
                    color: '#03543f',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#059669',
                      borderRadius: '50%',
                    }}
                  ></span>{' '}
                  {condition}
                </span>
                <span
                  style={{
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                  }}
                >
                  ⭐ BGG • {bggScore} / 10
                </span>
              </div>
            </div>

            <h1
              style={{
                margin: '0 0 4px 0',
                fontSize: '2.2rem',
                color: '#111827',
                fontWeight: '800',
                lineHeight: '1.2',
              }}
            >
              {game.name}
            </h1>
            <p
              style={{
                margin: '0 0 1rem 0',
                fontSize: '1.1rem',
                color: '#4b5563',
                fontWeight: '500',
              }}
            >
              {game.subtitle || 'Board Game'}
            </p>

            <div
              style={{
                display: 'flex',
                gap: '1.5rem',
                fontSize: '0.85rem',
                color: '#6b7280',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                👤 <span style={{ color: '#374151', fontWeight: '600' }}>ผู้ออกแบบ:</span>{' '}
                {game.designer || 'รอเพิ่มข้อมูล'}
              </div>
              <div>
                🏢 <span style={{ color: '#374151', fontWeight: '600' }}>ผู้ผลิต:</span>{' '}
                {game.publisher || 'รอเพิ่มข้อมูล'}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1rem',
                marginTop: 'auto',
              }}
            >
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>👥</span>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold' }}>
                    จำนวนผู้เล่น
                  </div>
                  <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '700' }}>
                    {game.minPlayers} - {game.maxPlayers}{' '}
                    <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>คน</span>
                  </div>
                </div>
              </div>
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>⏱️</span>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold' }}>
                    เวลาเล่นเฉลี่ย
                  </div>
                  <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '700' }}>
                    {game.playtimeMin}{' '}
                    <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>นาที</span>
                  </div>
                </div>
              </div>
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>🧠</span>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold' }}>
                    ระดับความซับซ้อน
                  </div>
                  <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '700' }}>
                    {complexity}{' '}
                    <span
                      style={{ fontSize: '0.7rem', fontWeight: '500', color: '#64748b' }}
                    ></span>
                  </div>
                </div>
              </div>
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>🧒</span>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold' }}>
                    ช่วงอายุแนะนำ
                  </div>
                  <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '700' }}>
                    {game.minAge || '?'}{' '}
                    <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>ปีขึ้นไป</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '2rem',
            borderBottom: '2px solid #e5e7eb',
            marginBottom: '2rem',
          }}
        >
          <div
            onClick={() => setActiveTab('general')}
            style={{
              paddingBottom: '12px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              color: activeTab === 'general' ? '#134e35' : '#6b7280',
              borderBottom: activeTab === 'general' ? '3px solid #134e35' : 'none',
            }}
          >
            ℹ️ ข้อมูลทั่วไป (General)
          </div>
          <div
            onClick={() => setActiveTab('copies')}
            style={{
              paddingBottom: '12px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              color: activeTab === 'copies' ? '#134e35' : '#6b7280',
              borderBottom: activeTab === 'copies' ? '3px solid #134e35' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            📦 สำเนา & สภาพเกม{' '}
            <span
              style={{
                backgroundColor: '#e2e8f0',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.7rem',
              }}
            >
              {game.copies || game.quantity || 1}
            </span>
          </div>
        </div>

        {/* Layout ซ้ายขวา แบบ Dynamic */}
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Overview */}
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '2rem',
                border: '1px solid #e5e7eb',
              }}
            >
              <h3
                style={{
                  margin: '0 0 1rem 0',
                  fontSize: '1.2rem',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                📖 เรื่องย่อและรูปแบบการเล่น
              </h3>
              <p
                style={{
                  fontSize: '0.95rem',
                  color: '#4b5563',
                  lineHeight: '1.6',
                  marginBottom: '1.5rem',
                }}
              >
                {game.description ||
                  `ยังไม่มีคำอธิบายและเรื่องย่อสำหรับเกม ${game.name} ในระบบ กรุณาอัปเดตข้อมูลจาก BoardGameGeek หรือพิมพ์ด้วยตนเอง`}
              </p>
            </div>

            {/* Metadata Grid */}
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '2rem',
                border: '1px solid #e5e7eb',
              }}
            >
              <h3
                style={{
                  margin: '0 0 1.5rem 0',
                  fontSize: '1.2rem',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                🗂️ คุณสมบัติจำเพาะ
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: '#64748b',
                      fontWeight: 'bold',
                      marginBottom: '4px',
                    }}
                  >
                    ขนาดซองการ์ด (SLEEVE SIZE)
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '700' }}>
                    {game.sleeveSize || 'ไม่ระบุ'}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: '#64748b',
                      fontWeight: 'bold',
                      marginBottom: '4px',
                    }}
                  >
                    ภาษาในเกม (LANGUAGE)
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '700' }}>
                    {game.language || 'ไม่ระบุ'}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: '#64748b',
                      fontWeight: 'bold',
                      marginBottom: '4px',
                    }}
                  >
                    ความพึ่งพาภาษา
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '700' }}>
                    {game.languageDependency || 'ไม่ระบุ'}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: '#64748b',
                      fontWeight: 'bold',
                      marginBottom: '4px',
                    }}
                  >
                    ขนาดกล่อง
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '700' }}>
                    {game.boxDimensions || 'ไม่ระบุ'}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: '#64748b',
                      fontWeight: 'bold',
                      marginBottom: '4px',
                    }}
                  >
                    ตำแหน่งจัดเก็บ
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '700' }}>
                    {game.location || 'คลังส่วนกลาง'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              minWidth: '320px',
            }}
          >
            {/* Review Card */}
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '1px solid #e5e7eb',
              }}
            >
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#111827' }}>
                คะแนนรีวิว & น้ำหนักเกม
              </h4>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    backgroundColor: '#78350f',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                  }}
                >
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold', lineHeight: '1' }}>
                    {bggScore}
                  </span>
                  <span style={{ fontSize: '0.65rem' }}>เต็ม 10</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    อ้างอิงจาก BoardGameGeek
                  </div>
                </div>
              </div>
            </div>

            {/* Checklist แบบ Dynamic */}
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '1px solid #e5e7eb',
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
                <h4 style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>
                  รายการอุปกรณ์ภายในกล่อง
                </h4>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  fontSize: '0.85rem',
                  color: '#374151',
                  marginBottom: '1.5rem',
                }}
              >
                {game.components && game.components.length > 0 ? (
                  game.components.map((comp, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #f3f4f6',
                        paddingBottom: '4px',
                      }}
                    >
                      <span>
                        <span style={{ color: '#10b981', marginRight: '6px' }}>✔</span> {comp.name}
                      </span>{' '}
                      <b>{comp.amount}</b>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#9ca3af', fontStyle: 'italic', textAlign: 'center' }}>
                    ยังไม่มีการบันทึกรายการอุปกรณ์
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* POP-UP MODAL แก้ไขเกม */}
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
              borderRadius: '16px',
              width: '450px',
              maxWidth: '90%',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h2 style={{ margin: '0 0 1.5rem 0', color: '#111827', fontSize: '1.25rem' }}>
              ⚙️ แก้ไขข้อมูลเกม
            </h2>
            <form
              onSubmit={handleUpdateGame}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#374151' }}>
                  รูปภาพปก (URL):
                </label>
                <input
                  type="url"
                  value={editData.image || editData.imageUrl || ''}
                  onChange={(e) =>
                    setEditData({ ...editData, image: e.target.value, imageUrl: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '8px',
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
                    value={editData.name || ''}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '8px',
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
                    value={editData.copies ?? editData.quantity ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setEditData({ ...editData, copies: val, quantity: val });
                    }}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '8px',
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
                    value={editData.minPlayers || ''}
                    onChange={(e) => setEditData({ ...editData, minPlayers: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '8px',
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
                    value={editData.maxPlayers || ''}
                    onChange={(e) => setEditData({ ...editData, maxPlayers: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '8px',
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
                    value={editData.playtimeMin || ''}
                    onChange={(e) => setEditData({ ...editData, playtimeMin: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '8px',
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
                      padding: '0.6rem',
                      borderRadius: '8px',
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
                    padding: '8px 16px',
                    borderRadius: '8px',
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
                    padding: '8px 16px',
                    borderRadius: '8px',
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
