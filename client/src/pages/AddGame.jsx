import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function AddGame() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // State สำหรับเก็บข้อมูลที่กรอกในฟอร์ม
  const [formData, setFormData] = useState({
    name: '',
    image: '', // ตัวนี้เราจะส่งไปเป็น 'thumbnail' ตอนยิง API
    minPlayers: 1,
    maxPlayers: 4,
    playtimeMin: 30,
    yearPublished: new Date().getFullYear(),
    copies: 1,
  });

  // 🌟 State สำหรับระบบดึงข้อมูล BGG
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

  // 🌟 ฟังก์ชันที่ 1: ค้นหารายชื่อเกมจาก BGG (/api/bgg/search)
  const handleSearchBGG = async (e) => {
    e.preventDefault();
    if (!bggQuery.trim()) return;

    setSearchingBgg(true);
    try {
      const token = localStorage.getItem('token');
      // สมมติว่า Backend ใช้ query param ?q=ชื่อเกม
      const response = await fetch(`/api/bgg/search?q=${encodeURIComponent(bggQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // รองรับกรณีที่ Backend ส่งมาเป็น Array หรือ Object
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

  // 🌟 ฟังก์ชันที่ 2: เลือกเกมแล้วดึงข้อมูลเชิงลึกมากรอกฟอร์ม (/api/bgg/game/{bggId})
  const handleSelectBggGame = async (bggId) => {
    setSearchingBgg(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bgg/game/${bggId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const detail = data.data || data; // ปรับตามโครงสร้าง Backend

        // 🔥 ไฮไลท์: นำข้อมูลที่ได้มากรอกลงฟอร์มอัตโนมัติ!
        setFormData((prev) => ({
          ...prev,
          name: detail.name || prev.name,
          minPlayers: detail.minPlayers || prev.minPlayers,
          maxPlayers: detail.maxPlayers || prev.maxPlayers,
          playtimeMin: detail.playtimeMin || prev.playtimeMin,
          yearPublished: detail.yearPublished || prev.yearPublished,
          image: detail.thumbnail || detail.image || prev.image,
        }));

        setShowBggModal(false); // ปิดหน้าต่าง
        setBggResults([]); // ล้างผลลัพธ์
        alert('✨ ดึงข้อมูลจาก BGG สำเร็จ! ตรวจสอบความถูกต้องและกดบันทึกได้เลย');
      }
    } catch (error) {
      console.error(error);
      alert('❌ ดึงข้อมูลรายละเอียดเกมไม่สำเร็จ');
    } finally {
      setSearchingBgg(false);
    }
  };

  // ฟังก์ชันบันทึกเกมเข้า Database ของร้านเรา (POST /api/games)
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
        // 🌟 แก้ชื่อตัวแปรให้ตรงกับที่ดูใน Swagger เป๊ะๆ!
        body: JSON.stringify({
          name: formData.name,
          minPlayers: formData.minPlayers,
          maxPlayers: formData.maxPlayers,
          playtimeMin: formData.playtimeMin,
          yearPublished: formData.yearPublished,
          thumbnail: formData.image, // 👈 เปลี่ยนเป็น thumbnail
          copies: formData.copies, // 👈 ส่ง copies เพื่อรอหลังบ้านรับ
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
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: "'Kanit', sans-serif",
      }}
    >
      {/* 1. Sidebar ด้านซ้าย (เมนูหลัก) */}
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

      {/* 2. พื้นที่เนื้อหาหลักด้านขวา */}
      <main style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
        {/* Header */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '2rem',
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
              <span style={{ color: '#111827' }}>เพิ่มเกมใหม่เข้าคลัง</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#111827', fontWeight: '800' }}>
              ✨ เพิ่มบอร์ดเกมใหม่ (Add New Game)
            </h1>
          </div>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
            }}
          >
            ออกจากระบบ
          </button>
        </header>

        {/* ฟอร์มกรอกข้อมูล */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '2rem',
            border: '1px solid #e5e7eb',
            maxWidth: '800px',
          }}
        >
          {/* กล่อง BGG API */}
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '1rem 1.5rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  color: '#166534',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  marginBottom: '4px',
                }}
              >
                💡 เชื่อมต่อกับ BoardGameGeek API
              </div>
              <div style={{ color: '#15803d', fontSize: '0.8rem' }}>
                ค้นหาเกมจาก BGG เพื่อดึงข้อมูลทั้งหมดมาเติมในฟอร์มให้อัตโนมัติ
              </div>
            </div>
            <button
              onClick={() => setShowBggModal(true)}
              style={{
                backgroundColor: 'white',
                border: '2px solid #22c55e',
                color: '#166534',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                gap: '6px',
              }}
            >
              🔍 ค้นหาจาก BGG
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            {/* แถวที่ 1: ชื่อเกม & จำนวนกล่อง */}
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ flex: 3 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  ชื่อบอร์ดเกม (Game Name) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  จำนวนในคลัง (กล่อง) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  name="copies"
                  value={formData.copies === 0 ? '' : formData.copies}
                  onChange={handleChange}
                  min="1"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* แถวที่ 2: รูปภาพ */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px',
                }}
              >
                รูปภาพปกเกม (URL)
              </label>
              <input
                type="url"
                name="image"
                value={formData.image}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            {/* แถวที่ 3: สถิติเกม */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1.5rem',
                backgroundColor: '#f8fafc',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  ผู้เล่นต่ำสุด (คน) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  name="minPlayers"
                  value={formData.minPlayers === 0 ? '' : formData.minPlayers}
                  onChange={handleChange}
                  min="1"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  ผู้เล่นสูงสุด (คน) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  name="maxPlayers"
                  value={formData.maxPlayers === 0 ? '' : formData.maxPlayers}
                  onChange={handleChange}
                  min="1"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  เวลาเล่นเฉลี่ย (นาที) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  name="playtimeMin"
                  value={formData.playtimeMin === 0 ? '' : formData.playtimeMin}
                  onChange={handleChange}
                  min="1"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* แถวที่ 4: ปีที่พิมพ์ */}
            <div style={{ width: '30%' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px',
                }}
              >
                ปีที่พิมพ์ (Year Published)
              </label>
              <input
                type="number"
                name="yearPublished"
                value={formData.yearPublished === 0 ? '' : formData.yearPublished}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1rem 0' }} />

            {/* ปุ่มกดยกเลิก / บันทึก */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <Link
                to="/inventory"
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  color: '#4b5563',
                  textDecoration: 'none',
                  fontWeight: '600',
                }}
              >
                ยกเลิก
              </Link>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#134e35',
                  color: 'white',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'กำลังบันทึก...' : '💾 บันทึกเกมเข้าคลัง'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* 🌟 3. หน้าต่าง Pop-up ค้นหาเกมจาก BGG */}
      {showBggModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
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
              width: '500px',
              maxWidth: '90%',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <h2 style={{ margin: 0, color: '#111827', fontSize: '1.3rem' }}>
                🔍 ค้นหาบอร์ดเกมจาก BGG
              </h2>
              <button
                onClick={() => setShowBggModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  color: '#9ca3af',
                }}
              >
                ✖
              </button>
            </div>

            <form
              onSubmit={handleSearchBGG}
              style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}
            >
              <input
                type="text"
                value={bggQuery}
                onChange={(e) => setBggQuery(e.target.value)}
                placeholder="พิมพ์ชื่อเกมภาษาอังกฤษ..."
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  outline: 'none',
                }}
                required
              />
              <button
                type="submit"
                disabled={searchingBgg}
                style={{
                  backgroundColor: '#22c55e',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                {searchingBgg ? 'กำลังหา...' : 'ค้นหา'}
              </button>
            </form>

            {/* แสดงผลการค้นหา */}
            <div
              style={{
                maxHeight: '300px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {bggResults.length > 0 ? (
                bggResults.map((bggGame) => (
                  <div
                    key={bggGame.bggId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: '#f9fafb',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#1f2937' }}>{bggGame.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        ปี: {bggGame.yearPublished || '-'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelectBggGame(bggGame.bggId)}
                      disabled={searchingBgg}
                      style={{
                        backgroundColor: '#134e35',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      เลือก
                    </button>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2rem 0',
                    color: '#9ca3af',
                    fontSize: '0.9rem',
                  }}
                >
                  พิมพ์ชื่อเกมแล้วกดค้นหา เพื่อดูผลลัพธ์
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
