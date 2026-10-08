import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';
import { minutesFromDayStart, timeTH } from '../../../lib/date.js';
import { customerName, endAtOf, gameName, statusOf } from '../../../lib/reservationStatus.js';

// ช่วงเวลาที่แสดงในตาราง (ปรับได้)
const START_HOUR = 10;
const END_HOUR = 24;
const TOTAL_MIN = (END_HOUR - START_HOUR) * 60;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

// ตารางเวลาจองโต๊ะ ใช้ GET /api/tables/schedule?date= -> zones[].tables[].reservations[]
export default function ScheduleGrid({ date, refreshKey }) {
  const [zones, setZones] = useState([]);
  const [zoneFilter, setZoneFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api('/tables/schedule', { query: { date } })
      .then((d) => {
        if (!alive) return;
        if (!Array.isArray(d?.zones)) setError('รูปแบบข้อมูลตารางไม่ตรงกับที่คาดไว้ (ไม่พบ zones)');
        setZones(Array.isArray(d?.zones) ? d.zones : []);
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [date, refreshKey]);

  const zoneName = (z) => z.name ?? z.zone ?? 'โซน';
  const visible = zoneFilter === 'all' ? zones : zones.filter((z) => zoneName(z) === zoneFilter);
  const tableCount = zones.reduce((n, z) => n + (z.tables?.length ?? 0), 0);

  return (
    <section className="panel schedule">
      <div className="panel-head">
        <h2>ตารางเวลาจองโต๊ะ</h2>
        <div className="legend">
          <span className="chip tone-available">จองล่วงหน้า</span>
          <span className="chip tone-reserved">กำลังเล่น</span>
          <span className="chip tone-maintenance">ใช้งานแล้ว</span>
          <span className="chip tone-occupied">ยกเลิก/ไม่มา</span>
        </div>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={'tab' + (zoneFilter === 'all' ? ' active' : '')}
          onClick={() => setZoneFilter('all')}
        >
          ทั้งหมด ({tableCount})
        </button>
        {zones.map((z) => (
          <button
            key={zoneName(z)}
            type="button"
            className={'tab' + (zoneFilter === zoneName(z) ? ' active' : '')}
            onClick={() => setZoneFilter(zoneName(z))}
          >
            {zoneName(z)} ({z.tables?.length ?? 0})
          </button>
        ))}
      </div>

      {error && <div className="form-error">{error}</div>}
      {loading && <p className="muted">กำลังโหลด...</p>}

      <div className="grid-scroll">
        <div className="grid-inner">
          <div className="grid-row grid-head">
            <div className="grid-label" />
            <div className="grid-track">
              {HOURS.map((h) => (
                <span
                  key={h}
                  className="hour-label"
                  style={{ left: `${((h - START_HOUR) * 60 * 100) / TOTAL_MIN}%` }}
                >
                  {String(h).padStart(2, '0')}:00
                </span>
              ))}
            </div>
          </div>

          {visible.flatMap((z) =>
            (z.tables ?? []).map((t) => (
              <div className="grid-row" key={t._id ?? t.code}>
                <div className="grid-label">
                  <strong>{t.code}</strong>
                  <small>
                    {zoneName(z)} • {t.capacity} ที่นั่ง
                  </small>
                </div>
                <div className="grid-track" style={{ '--cols': HOURS.length }}>
                  {(t.reservations ?? []).map((r) => {
                    const s = Math.max(minutesFromDayStart(r.startAt, date), START_HOUR * 60);
                    const e = Math.min(minutesFromDayStart(endAtOf(r), date), END_HOUR * 60);
                    if (e <= s) return null;
                    const st = statusOf(r.status);
                    const label = `${customerName(r)} (${r.players})${gameName(r) ? ' • ' + gameName(r) : ''}`;
                    return (
                      <div
                        key={r._id}
                        className={`sched-block tone-${st.tone}`}
                        style={{
                          left: `${((s - START_HOUR * 60) * 100) / TOTAL_MIN}%`,
                          width: `${((e - s) * 100) / TOTAL_MIN}%`,
                        }}
                        title={`${label}\n${timeTH(r.startAt)} – ${timeTH(endAtOf(r))} • ${st.label}`}
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )),
          )}
        </div>
      </div>

      {!loading && !error && tableCount === 0 && <p className="muted">ยังไม่มีโต๊ะในระบบ</p>}
    </section>
  );
}
