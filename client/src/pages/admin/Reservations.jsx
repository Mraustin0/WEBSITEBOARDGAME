import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { addDays, formatThaiDate, monthRange, todayTH, weekRange } from '../../lib/date.js';
import { customerName } from '../../lib/reservationStatus.js';
import StatCards from '../../components/admin/reservations/StatCards.jsx';
import TodayList from '../../components/admin/reservations/TodayList.jsx';
import ScheduleGrid from '../../components/admin/reservations/ScheduleGrid.jsx';
import NewBookingModal from '../../components/admin/reservations/NewBookingModal.jsx';
import './reservations.css';

const RANGES = [
  { key: 'day', label: 'วัน' },
  { key: 'week', label: 'สัปดาห์' },
  { key: 'month', label: 'เดือน' },
];

export default function Reservations() {
  const [date, setDate] = useState(todayTH());
  const [range, setRange] = useState('day');
  const [q, setQ] = useState('');
  const [overview, setOverview] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setError('');
    try {
      const query = { q };
      if (range === 'day') query.date = date;
      else {
        const r = range === 'week' ? weekRange(date) : monthRange(date);
        query.from = r.from;
        query.to = r.to;
      }
      const [ov, list] = await Promise.all([
        api('/stats/overview', { query: { date } }),
        api('/reservations/admin', { query }),
      ]);
      const rows = Array.isArray(list) ? list : (list?.items ?? []);
      rows.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
      setOverview(ov);
      setItems(rows);
    } catch (err) {
      setError(err.status === 401 ? 'เซสชันหมดอายุ หรือยังไม่ได้เข้าสู่ระบบ' : err.message);
    } finally {
      setLoading(false);
    }
  }, [date, range, q]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  function reloadAll() {
    load();
    setRefreshKey((k) => k + 1);
  }

  async function runAction(r, path, options) {
    setBusyId(r._id);
    setError('');
    try {
      await api(path, options);
      reloadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function onCancel(r) {
    const reason = window.prompt(`ยกเลิกการจองของ ${customerName(r)}\nเหตุผล (ไม่บังคับ):`, '');
    if (reason === null) return;
    runAction(r, `/reservations/${r._id}/cancel`, {
      method: 'PATCH',
      body: { reason: reason.trim() || undefined },
    });
  }

  function onNoShow(r) {
    if (!window.confirm(`บันทึกว่า ${customerName(r)} ไม่มาตามนัด?`)) return;
    runAction(r, `/reservations/admin/${r._id}/no-show`, { method: 'PATCH' });
  }

  const step = range === 'day' ? 1 : range === 'week' ? 7 : 30;

  return (
    <div className="reservations-page">
      <div className="page-head">
        <div>
          <h1>จัดการการจองล่วงหน้า</h1>
          <p className="muted">ดูและจัดการการจองทั้งหมดตามวัน สัปดาห์ หรือเดือน</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowNew(true)}>
          + เพิ่มการจองใหม่
        </button>
      </div>

      <div className="toolbar">
        <div className="tabs">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              className={'tab' + (range === r.key ? ' active' : '')}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="date-nav">
          <button type="button" className="btn-ghost" onClick={() => setDate(addDays(date, -step))}>
            ‹
          </button>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
          <button type="button" className="btn-ghost" onClick={() => setDate(addDays(date, step))}>
            ›
          </button>
          <button type="button" className="btn-ghost" onClick={() => setDate(todayTH())}>
            วันนี้
          </button>
          <span className="muted">{formatThaiDate(date)}</span>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <StatCards overview={overview} loading={loading && !overview} />

      <div className="res-main">
        <ScheduleGrid date={date} refreshKey={refreshKey} />
        <TodayList
          items={items}
          loading={loading}
          busyId={busyId}
          onSearch={setQ}
          onCancel={onCancel}
          onNoShow={onNoShow}
        />
      </div>

      {showNew && (
        <NewBookingModal
          date={date}
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            reloadAll();
          }}
        />
      )}
    </div>
  );
}
