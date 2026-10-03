import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AddGame() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    minPlayers: 1,
    maxPlayers: 4,
    playtimeMin: 30,
    yearPublished: 2024,
    copies: 1, // เพิ่มฟิลด์จำนวนเกม
    imageUrl: '', // เพิ่มฟิลด์รูปภาพ
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
    }
  }, [navigate]);

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          minPlayers: Number(formData.minPlayers),
          maxPlayers: Number(formData.maxPlayers),
          playtimeMin: Number(formData.playtimeMin),
          yearPublished: Number(formData.yearPublished),
          copies: Number(formData.copies), // ส่งค่าจำนวนไปที่ Backend
        }),
      });
      if (response.ok) {
        alert('🎉 บันทึกบอร์ดเกมสำเร็จ!');
        navigate('/inventory');
      } else {
        const errorData = await response.json();
        alert(`❌ ไม่สามารถบันทึกได้: ${errorData.error || JSON.stringify(errorData)}`);
      }
    } catch (error) {
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        fontFamily: 'system-ui',
        padding: '2rem',
        backgroundColor: '#f8f9fa',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '600px',
          border: '1px solid #e5e7eb',
        }}
      >
        <button
          onClick={() => navigate('/inventory')}
          style={{
            marginBottom: '1rem',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            color: '#134e35',
            fontWeight: 'bold',
          }}
        >
          ← กลับ
        </button>
        <h2>เพิ่มบอร์ดเกมใหม่</h2>
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <input
            required
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="ชื่อเกม *"
            style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
          />

          {/* เพิ่มช่องใส่ลิงก์รูปภาพ */}
          <input
            type="text"
            name="imageUrl"
            value={formData.imageUrl}
            onChange={handleChange}
            placeholder="ลิงก์รูปภาพ (URL)"
            style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
          />

          <div style={{ display: 'flex', gap: '1rem' }}>
            {/* เพิ่มช่องใส่จำนวนเกม */}
            <input
              required
              type="number"
              name="copies"
              value={formData.copies}
              onChange={handleChange}
              placeholder="จำนวน (กล่อง)"
              min="1"
              style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <input
              required
              type="number"
              name="minPlayers"
              value={formData.minPlayers}
              onChange={handleChange}
              placeholder="ผู้เล่นขั้นต่ำ"
              style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
            />
            <input
              required
              type="number"
              name="maxPlayers"
              value={formData.maxPlayers}
              onChange={handleChange}
              placeholder="ผู้เล่นสูงสุด"
              style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input
              required
              type="number"
              name="playtimeMin"
              value={formData.playtimeMin}
              onChange={handleChange}
              placeholder="เวลาเล่น (นาที)"
              style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
            />
            <input
              required
              type="number"
              name="yearPublished"
              value={formData.yearPublished}
              onChange={handleChange}
              placeholder="ปีที่ผลิต"
              style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            style={{
              backgroundColor: '#134e35',
              color: 'white',
              padding: '1rem',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </button>
        </form>
      </div>
    </div>
  );
}
