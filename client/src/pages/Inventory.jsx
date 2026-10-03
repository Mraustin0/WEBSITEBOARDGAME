import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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

        // รองรับคีย์ items ที่หลังบ้านส่งกลับมา
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

  // กรองรายชื่อเกมตามช่องค้นหา
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
        {/* Header Bar ด้านบน */}
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

        {/* Metric Cards สรุปตัวเลข */}
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
                <img
                  src={game.thumbnail || game.image || 'https://placehold.co/400x300?text=No+Image'}
                  alt={game.name}
                  style={{ width: '100%', height: 180, objectFit: 'cover', background: '#f3f4f6' }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://placehold.co/400x300?text=No+Image';
                  }}
                />

                <div style={{ padding: '1.25rem' }}>
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
                      พร้อมใช้งาน
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
                    onClick={() => navigate(`/inventory/${game._id || game.id}`)}
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
    </div>
  );
}
