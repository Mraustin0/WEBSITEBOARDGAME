import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { addDays, timeTH, todayTH } from '../../lib/date.js';
import { customerName, gameName, tableCode } from '../../lib/reservationStatus.js';
import WalkInModal from '../../components/admin/reservations/WalkInModal.jsx';
import './overview.css';

const num = (v) => (typeof v === 'number' ? v : 0);
const baht = (n) => '฿' + num(n).toLocaleString('th-TH', { maximumFractionDigits: 0 });
const short = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n)));
const rows = (d) => (Array.isArray(d) ? d : (d?.items ?? []));

// กราฟเส้น 7 วัน (SVG ล้วน ไม่ใช้ไลบรารี)
function TrendChart({ data }) {
  const W = 700,
    H = 200,
    P = 24;
  const max = Math.max(1, ...data.map((d) => d.value));
  const x = (i) => P + (i * (W - 2 * P)) / Math.max(1, data.length - 1);
  const y = (v) => H - P - (v / max) * (H - 2 * P);
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="ov-chart"
      role="img"
      aria-label="แนวโน้มรายได้ 7 วันล่าสุด"
    >
      {data.length > 1 && (
        <polygon
          points={`${x(0)},${H - P} ${pts} ${x(data.length - 1)},${H - P}`}
          className="ov-area"
        />
      )}
      <polyline points={pts} className="ov-line" />
      {data.map((d, i) => (
        <circle
          key={d.date}
          cx={x(i)}
          cy={y(d.value)}
          r={i === data.length - 1 ? 6 : 4}
          className="ov-dot"
        />
      ))}
    </svg>
  );
}

// หน้า 12 ภาพรวมร้าน
export default function Dashboard() {
  const [ov, setOv] = useState(null);
  const [tables, setTables] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [trend, setTrend] = useState([]);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [showWalkIn, setShowWalkIn] = useState(false);

  // ข้อมูลที่เปลี่ยนบ่อย: ยิง 3 endpoint พร้อมกัน (ตัวไหนพังไม่ทำให้ทั้งหน้าว่าง)
  const load = useCallback(async () => {
    const today = todayTH();
    const [a, b, c] = await Promise.allSettled([
      api('/stats/overview', { query: { date: today } }),
      api('/tables/floor'),
      api('/reservations/admin', { query: { date: today } }),
    ]);
    const bad = [a, b, c].find((r) => r.status === 'rejected' && r.reason?.status !== 401);
    setError(bad ? bad.reason.message : '');
    if (a.status === 'fulfilled') setOv(a.value);
    if (b.status === 'fulfilled') setTables(b.value?.tables ?? []);
    if (c.status === 'fulfilled') {
      const now = Date.now();
      setUpcoming(
        rows(c.value)
          .filter((r) => r.status === 'booked' && new Date(r.startAt).getTime() >= now)
          .sort((p, q) => new Date(p.startAt) - new Date(q.startAt))
          .slice(0, 3),
      );
    }
    setUpdatedAt(new Date().toISOString());
  }, []);

  // รายได้ย้อนหลัง 7 วัน: เรียก /stats/overview ทีละวัน (โหลดตอนเปิดหน้า/กดรีเฟรช)
  const loadTrend = useCallback(async () => {
    const today = todayTH();
    const days = [-6, -5, -4, -3, -2, -1, 0].map((n) => addDays(today, n));
    const res = await Promise.allSettled(
      days.map((date) => api('/stats/overview', { query: { date } })),
    );
    setTrend(
      days.map((date, i) => ({
        date,
        label: new Date(`${date}T12:00:00+07:00`).toLocaleDateString('th-TH', {
          weekday: 'short',
          timeZone: 'Asia/Bangkok',
        }),
        value: res[i].status === 'fulfilled' ? num(res[i].value?.collected) : 0,
      })),
    );
  }, []);

  useEffect(() => {
    load();
    loadTrend();
    const id = setInterval(load, 60000); // อัปเดตทุก 1 นาที
    return () => clearInterval(id);
  }, [load, loadTrend]);

  const refresh = () => {
    load();
    loadTrend();
  };

  const r = ov?.reservations ?? {};
  const total = tables.length;
  const playing = tables.filter((t) => t.state === 'occupied').length;
  const closed = tables.filter((t) => t.state === 'closed').length;
  const free = tables.filter((t) => t.state === 'available').length;
  const occPct = total ? Math.round((playing / total) * 100) : 0;
  const revPct = Math.min(num(ov?.revenueTargetPct), 100);
  const week = trend.reduce((s, d) => s + d.value, 0);
  const alerts = [
    num(ov?.openMaintenance) > 0 && {
      tone: 'warn',
      title: `มีใบแจ้งซ่อมค้าง ${ov.openMaintenance} รายการ`,
      text: 'เกมหรือโต๊ะที่ปิดใช้งานระหว่างซ่อม',
      to: '/admin/maintenance',
    },
    num(ov?.unpaid) > 0 && {
      tone: 'danger',
      title: `ยอดค้างชำระ ${baht(ov.unpaid)}`,
      text: 'มีรายการที่คืนโต๊ะแล้วแต่ยังไม่ได้รับเงิน',
      to: '/admin/reservations',
    },
  ].filter(Boolean);

  return (
    <div className="ov">
      <div className="page-head">
        <div>
          <h1>
            ภาพรวมร้าน (Store Overview){' '}
            <span className="chip tone-available">● LIVE FLOOR OPERATIONS</span>
          </h1>
          <p className="muted">
            อัปเดตล่าสุดเมื่อสักครู่ ({updatedAt ? timeTH(updatedAt) : '–'} น.) •
            ภาพรวมสถานะและข้อมูลปฏิบัติการประจำวัน
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn-ghost" onClick={refresh}>
            ⟳ รีเฟรชข้อมูล (Sync)
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowWalkIn(true)}>
            + เปิดโต๊ะ Walk-In ด่วน
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="ov-kpis">
        <div className="ov-card">
          <div className="ov-title">รายได้วันนี้ (TODAY'S REVENUE)</div>
          <div className="ov-value">{ov ? baht(ov.collected) : '–'}</div>
          <div className="ov-bar">
            <i style={{ width: `${revPct}%` }} />
          </div>
          <div className="ov-note">
            เป้าหมาย {baht(ov?.revenueTarget)} ({num(ov?.revenueTargetPct)}%) • ค้างชำระ{' '}
            {baht(ov?.unpaid)}
          </div>
        </div>
        <div className="ov-card">
          <div className="ov-title">โต๊ะที่ใช้งาน (TABLE OCCUPANCY)</div>
          <div className="ov-value">
            {playing}/{total} <small>({occPct}%)</small>
          </div>
          <div className="ov-bar">
            <i style={{ width: `${occPct}%` }} />
          </div>
          <div className="ov-note">
            {playing} กำลังเล่น • {free} ว่าง • {closed} ปิด/ซ่อมบำรุง
          </div>
        </div>
        <div className="ov-card">
          <div className="ov-title">สมาชิกที่ใช้งาน 7 วันล่าสุด</div>
          <div className="ov-value">
            {ov ? num(ov.activeMembers7d) : '–'} <small>คน</small>
          </div>
          <div className="ov-note">
            Walk-in วันนี้ {num(ov?.walkIns)} โต๊ะ • ใช้เวลาโต๊ะ {num(ov?.utilizationPct)}%
            ของเวลาเปิดร้าน
          </div>
        </div>
        <div className={'ov-card' + (num(ov?.openMaintenance) > 0 ? ' danger' : '')}>
          <div className="ov-title">แจ้งซ่อมค้างอยู่ (ACTION NEEDED)</div>
          <div className="ov-value">
            {ov ? num(ov.openMaintenance) : '–'} <small>รายการ</small>
          </div>
          <div className="ov-note">
            {num(ov?.openMaintenance) > 0 ? 'ต้องดำเนินการด่วน' : 'ไม่มีรายการค้าง'}
          </div>
        </div>
      </div>

      <div className="ov-main">
        <section className="panel">
          <div className="panel-head">
            <h2>แนวโน้มรายได้ 7 วันล่าสุด (Revenue Trend)</h2>
          </div>
          <p className="muted">เปรียบเทียบยอดที่รับเงินแล้วรายวัน</p>
          {trend.length === 0 ? (
            <p className="muted">กำลังโหลด...</p>
          ) : (
            <>
              <TrendChart data={trend} />
              <div className="ov-days">
                {trend.map((d, i) => (
                  <div key={d.date} className={i === trend.length - 1 ? 'today' : ''}>
                    <b>
                      {d.label}
                      {i === trend.length - 1 ? ' (วันนี้)' : ''}
                    </b>
                    <span>฿{short(d.value)}</span>
                  </div>
                ))}
              </div>
              <div className="ov-sum">
                <div>
                  <small>ยอดเฉลี่ยต่อวัน</small>
                  <b>{baht(week / 7)}</b>
                </div>
                <div>
                  <small>ยอดรวมรอบ 7 วัน</small>
                  <b>{baht(week)}</b>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>งานด่วนที่ต้องทำ (Alerts)</h2>
            {alerts.length > 0 && (
              <span className="chip tone-occupied">{alerts.length} เคสค้าง</span>
            )}
          </div>
          {alerts.length === 0 && <p className="muted">ไม่มีงานค้าง</p>}
          {alerts.map((a) => (
            <div key={a.title} className={`ov-alert ${a.tone}`}>
              <strong>{a.title}</strong>
              <p>{a.text}</p>
              <Link to={a.to}>ดูรายละเอียด →</Link>
            </div>
          ))}
        </section>
      </div>

      <div className="ov-trio">
        <section className="panel">
          <div className="panel-head">
            <h2>เกมยอดนิยมวันนี้</h2>
          </div>
          {(ov?.popularGames ?? []).length === 0 && (
            <p className="muted">ยังไม่มีข้อมูลการเล่นวันนี้</p>
          )}
          {(ov?.popularGames ?? []).map((g, i) => (
            <div key={g._id ?? i} className="ov-row">
              <span className="rank">{i + 1}</span>
              <span className="grow">{g.name}</span>
              <span className="muted">{num(g.playCount)} รอบเล่น</span>
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>สถานะการจองวันนี้</h2>
          </div>
          {[
            ['จองล่วงหน้า', r.booked],
            ['กำลังเล่น', r.playing],
            ['ใช้งานแล้ว', r.completed],
            ['ยกเลิก', r.cancelled],
            ['ไม่มา', r.no_show],
          ].map(([l, v]) => (
            <div key={l} className="ov-row">
              <span className="grow">{l}</span>
              <b>{num(v)}</b>
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>คิวจองที่กำลังจะถึง</h2>
          </div>
          {upcoming.length === 0 && <p className="muted">ไม่มีคิวจองที่เหลือในวันนี้</p>}
          {upcoming.map((q) => (
            <div key={q._id} className="ov-row q">
              <span className="chip tone-available">{timeTH(q.startAt)} น.</span>
              <span className="grow">
                <b>{customerName(q)}</b> ({q.players} ท่าน)
              </span>
              <span className="muted">
                โต๊ะ {tableCode(q)}
                {gameName(q) ? ` • ${gameName(q)}` : ''}
              </span>
            </div>
          ))}
          <Link className="ov-more" to="/admin/reservations">
            ดูผังการจองทั้งหมด →
          </Link>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>เข้าถึงโมดูลหลักอย่างรวดเร็ว (Quick Module Access)</h2>
        </div>
        <div className="ov-quick">
          <Link to="/admin/inventory">
            <b>คลังบอร์ดเกม (Vault)</b>
            <span>จัดการเกมและสต็อก</span>
          </Link>
          <Link to="/admin/reservations">
            <b>ผังโต๊ะ & คุมคิว</b>
            <span>
              {total} โต๊ะทั้งหมด • {playing} กำลังเล่น
            </span>
          </Link>
          <Link to="/admin/users">
            <b>จัดการผู้ใช้งาน</b>
            <span>สมาชิกและสิทธิ์</span>
          </Link>
          <Link to="/admin/reports">
            <b>รายงาน & บัญชี</b>
            <span>สรุปยอดขายและสถิติโต๊ะ</span>
          </Link>
        </div>
      </section>

      {showWalkIn && (
        <WalkInModal
          onClose={() => setShowWalkIn(false)}
          onCreated={() => {
            setShowWalkIn(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
