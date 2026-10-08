import { useEffect, useState } from 'react';
import { needsConfirm } from '../../../lib/reservationStatus.js';
import ReservationItem from './ReservationItem.jsx';

const TABS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'pending', label: 'รอยืนยัน' },
  { key: 'booked', label: 'จองล่วงหน้า' },
  { key: 'playing', label: 'กำลังเล่น' },
];

// รายการจองด้านขวา: ค้นหา (ส่ง ?q= ไป server) + แท็บกรองสถานะ (กรองฝั่ง client)
// tab "รอยืนยัน" = booked ที่ยังไม่มี confirmedAt (ตรงกับ API confirmed=false)
export default function TodayList({
  items,
  loading,
  busyId,
  onSearch,
  onCancel,
  onNoShow,
  onCheckout,
  onConfirm,
}) {
  const [tab, setTab] = useState('all');
  const [text, setText] = useState('');

  // หน่วงการค้นหา 400ms ไม่ให้ยิง API ทุกตัวอักษร
  useEffect(() => {
    const id = setTimeout(() => onSearch(text.trim()), 400);
    return () => clearTimeout(id);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = (key) => {
    if (key === 'all') return items.length;
    if (key === 'pending') return items.filter((i) => needsConfirm(i)).length;
    return items.filter((i) => i.status === key).length;
  };

  const shown =
    tab === 'all'
      ? items
      : tab === 'pending'
        ? items.filter((i) => needsConfirm(i))
        : items.filter((i) => i.status === tab);

  return (
    <section className="panel today-list">
      <div className="panel-head">
        <h2>รายการจอง</h2>
        <span className="chip tone-available">{items.length} รายการ</span>
      </div>

      <input
        className="input"
        type="search"
        placeholder="ค้นหาชื่อ เบอร์โทร หรือ username"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={'tab' + (tab === t.key ? ' active' : '')}
            onClick={() => setTab(t.key)}
          >
            {t.label} ({count(t.key)})
          </button>
        ))}
      </div>

      {loading && <p className="muted">กำลังโหลด...</p>}
      {!loading && shown.length === 0 && <p className="muted">ไม่มีรายการจองในช่วงนี้</p>}

      <ul className="res-list">
        {shown.map((r) => (
          <ReservationItem
            key={r._id}
            r={r}
            busy={busyId === r._id}
            onCancel={onCancel}
            onNoShow={onNoShow}
            onCheckout={onCheckout}
            onConfirm={onConfirm}
          />
        ))}
      </ul>
    </section>
  );
}
