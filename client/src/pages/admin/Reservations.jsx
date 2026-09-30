import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function AdminReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchReservations() {
      try {
        // ดึงข้อมูลจาก Backend (ปรับ path ให้ตรงกับ API จริงใน Swagger ของคุณ)
        const data = await api('/reservations');
        // สมมติว่า backend ส่งข้อมูลมาในรูปแบบ array โดยตรง หรืออยู่ใน data.items
        setReservations(data.items || data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchReservations();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>;
  if (error) return <div className="p-8 text-center text-red-500">เกิดข้อผิดพลาด: {error}</div>;

  return (
    <div className="p-8 font-sans">
      <h1 className="text-2xl font-bold mb-6">จัดการการจอง (Admin)</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 border-b text-left">รหัสการจอง</th>
              <th className="py-2 px-4 border-b text-left">ลูกค้า</th>
              <th className="py-2 px-4 border-b text-left">วันที่/เวลา</th>
              <th className="py-2 px-4 border-b text-left">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-4 text-center text-gray-500">
                  ไม่พบข้อมูลการจอง
                </td>
              </tr>
            ) : (
              reservations.map((res, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {/* เปลี่ยนฟิลด์ res._id, res.customer ให้ตรงกับ JSON ที่ Backend ส่งมา */}
                  <td className="py-2 px-4 border-b">{res._id || res.id}</td>
                  <td className="py-2 px-4 border-b">{res.customer?.name || 'ไม่ระบุ'}</td>
                  <td className="py-2 px-4 border-b">{res.date || 'ไม่ระบุ'}</td>
                  <td className="py-2 px-4 border-b">{res.status || 'รอดำเนินการ'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
