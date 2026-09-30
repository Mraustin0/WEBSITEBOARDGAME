// การ์ดตัวเลข 3 ใบ ใช้ข้อมูลจาก GET /api/stats/overview?date=
const num = (v) => (typeof v === 'number' ? v : 0);

export default function StatCards({ overview, loading }) {
  const r = overview?.reservations ?? {};
  const total =
    typeof r.total === 'number'
      ? r.total
      : num(r.booked) + num(r.playing) + num(r.completed) + num(r.cancelled) + num(r.no_show);

  const cards = [
    {
      key: 'total',
      title: 'การจองวันนี้',
      value: total,
      note: `กำลังเล่นอยู่ ${num(r.playing)} โต๊ะ`,
      tone: 'primary',
    },
    {
      key: 'booked',
      title: 'จองล่วงหน้า',
      value: num(r.booked),
      note: 'ยังไม่ถึงเวลาเล่น',
      tone: 'available',
    },
    {
      key: 'lost',
      title: 'ยกเลิก / ไม่มา',
      value: num(r.cancelled) + num(r.no_show),
      note: `ยกเลิก ${num(r.cancelled)} • ไม่มา ${num(r.no_show)}`,
      tone: 'occupied',
    },
  ];

  return (
    <div className="stat-cards">
      {cards.map((c) => (
        <div key={c.key} className={`stat-card tone-${c.tone}`}>
          <div className="stat-title">{c.title}</div>
          <div className="stat-value">
            {loading ? '–' : c.value} <span className="stat-unit">คิว</span>
          </div>
          <div className="stat-note">{c.note}</div>
        </div>
      ))}
    </div>
  );
}
