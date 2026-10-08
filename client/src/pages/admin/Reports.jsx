import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { addDays, formatThaiDate, todayTH } from '../../lib/date.js';
import './reports.css';

const num = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);
const baht = (n) => '฿' + num(n).toLocaleString('th-TH', { maximumFractionDigits: 0 });

const PRESETS = [
  { key: 'today', label: 'วันนี้' },
  { key: '7', label: '7 วัน' },
  { key: '30', label: '30 วัน' },
  { key: 'custom', label: 'กำหนดเอง' },
];

function rangeFromPreset(key, customFrom, customTo) {
  const today = todayTH();
  if (key === 'today') return { from: today, to: today };
  if (key === '7') return { from: addDays(today, -6), to: today };
  if (key === '30') return { from: addDays(today, -29), to: today };
  return {
    from: customFrom || addDays(today, -6),
    to: customTo || today,
  };
}

function ChangePct({ value }) {
  if (value === undefined || value === null) return null;
  const v = num(value);
  const up = v > 0;
  const flat = v === 0;
  return (
    <span className={'rp-pct' + (flat ? ' flat' : up ? ' up' : ' down')}>
      {flat ? '0%' : `${up ? '+' : ''}${v}%`}
      <small> vs ช่วงก่อน</small>
    </span>
  );
}

function RevenueChart({ series }) {
  const data = (series || []).map((d) => ({
    date: d.date,
    value: num(d.revenue),
  }));
  const W = 720;
  const H = 220;
  const P = 28;
  const max = Math.max(1, ...data.map((d) => d.value));
  const x = (i) => P + (i * (W - 2 * P)) / Math.max(1, data.length - 1);
  const y = (v) => H - P - (v / max) * (H - 2 * P);
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');

  if (data.length === 0) {
    return <p className="muted">ไม่มีข้อมูลในช่วงนี้</p>;
  }

  return (
    <div className="rp-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="rp-chart" role="img" aria-label="แนวโน้มรายได้">
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={P} x2={W - P} y1={y(max * t)} y2={y(max * t)} className="rp-grid" />
        ))}
        {data.length > 1 && (
          <polygon
            points={`${x(0)},${H - P} ${pts} ${x(data.length - 1)},${H - P}`}
            className="rp-area"
          />
        )}
        <polyline points={pts} className="rp-line" />
        {data.map((d, i) => (
          <circle
            key={d.date}
            cx={x(i)}
            cy={y(d.value)}
            r={i === data.length - 1 ? 5 : 3.5}
            className="rp-dot"
          >
            <title>
              {d.date}: {baht(d.value)}
            </title>
          </circle>
        ))}
      </svg>
      <div
        className="rp-chart-days"
        style={{ gridTemplateColumns: `repeat(${Math.min(data.length, 14)}, 1fr)` }}
      >
        {data.length <= 14
          ? data.map((d) => (
              <span key={d.date}>
                {d.date.slice(8)}
                <small>{baht(d.value)}</small>
              </span>
            ))
          : [data[0], data[Math.floor(data.length / 2)], data[data.length - 1]].map((d) => (
              <span key={d.date}>{d.date}</span>
            ))}
      </div>
    </div>
  );
}

function CategoryBars({ categories }) {
  const list = categories || [];
  if (!list.length) return <p className="muted">ไม่มีข้อมูลหมวดหมู่</p>;
  const max = Math.max(1, ...list.map((c) => num(c.sessions)));
  return (
    <ul className="rp-cats">
      {list.slice(0, 8).map((c) => (
        <li key={c.category}>
          <div className="rp-cat-top">
            <strong>{c.category}</strong>
            <span>
              {c.sessions} รอบ · {baht(c.revenue)} · {c.pct}%
            </span>
          </div>
          <div className="rp-bar">
            <i style={{ width: `${(num(c.sessions) / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Heatmap({ matrix, days, max }) {
  const hours = Array.from({ length: 14 }, (_, i) => i + 10);
  const m = matrix || Array.from({ length: 7 }, () => Array(24).fill(0));
  const peak = Math.max(1, num(max));
  const dayTH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  return (
    <div className="rp-heat">
      <div className="rp-heat-row head">
        <span className="rp-heat-label" />
        {hours.map((h) => (
          <span key={h} className="rp-heat-h">
            {String(h).padStart(2, '0')}
          </span>
        ))}
      </div>
      {(days || dayTH).map((label, dow) => (
        <div key={label} className="rp-heat-row">
          <span className="rp-heat-label">{dayTH[dow] ?? label}</span>
          {hours.map((h) => {
            const v = num(m[dow]?.[h]);
            const intensity = v / peak;
            return (
              <span
                key={h}
                className="rp-heat-cell"
                style={{
                  background:
                    v === 0 ? 'var(--color-bg)' : `rgba(6, 78, 59, ${0.12 + intensity * 0.78})`,
                  color: intensity > 0.55 ? '#fff' : 'var(--color-text-muted)',
                }}
                title={`${dayTH[dow]} ${h}:00 — ${v} การจอง`}
              >
                {v || ''}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function Reports() {
  const [preset, setPreset] = useState('7');
  const [customFrom, setCustomFrom] = useState(() => addDays(todayTH(), -6));
  const [customTo, setCustomTo] = useState(() => todayTH());
  const [report, setReport] = useState(null);
  const [heat, setHeat] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const range = useMemo(
    () => rangeFromPreset(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = { from: range.from, to: range.to };
      const [a, b] = await Promise.allSettled([
        api('/stats/report', { query: q }),
        api('/stats/heatmap', { query: q }),
      ]);
      if (a.status === 'fulfilled') setReport(a.value);
      else setReport(null);
      if (b.status === 'fulfilled') setHeat(b.value);
      else setHeat(null);
      const bad = [a, b].find((r) => r.status === 'rejected' && r.reason?.status !== 401);
      if (bad) setError(bad.reason?.message || 'โหลดรายงานไม่สำเร็จ');
    } catch (err) {
      setError(err.message || 'โหลดรายงานไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  async function onExport() {
    setExporting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const qs = new URLSearchParams({ from: range.from, to: range.to });
      const res = await fetch(`/api/stats/export.csv?${qs}`, {
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || res.statusText || 'Export ไม่สำเร็จ');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${range.from}_${range.to}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Export ไม่สำเร็จ');
    } finally {
      setExporting(false);
    }
  }

  const kpis = report?.kpis || {};
  const change = report?.changePct || {};

  const kpiCards = [
    { key: 'revenue', label: 'รายได้', value: baht(kpis.revenue), change: change.revenue },
    {
      key: 'sessions',
      label: 'รอบเล่น',
      value: num(kpis.sessions).toLocaleString('th-TH'),
      change: change.sessions,
    },
    {
      key: 'players',
      label: 'ผู้เล่นรวม',
      value: num(kpis.players).toLocaleString('th-TH'),
      change: change.players,
    },
    {
      key: 'hours',
      label: 'ชั่วโมงเล่น',
      value: num(kpis.hours).toLocaleString('th-TH'),
      change: change.hours,
    },
    {
      key: 'avgPerSession',
      label: 'เฉลี่ย/รอบ',
      value: baht(kpis.avgPerSession),
      change: change.avgPerSession,
    },
    {
      key: 'newMembers',
      label: 'สมาชิกใหม่',
      value: num(kpis.newMembers).toLocaleString('th-TH'),
      change: change.newMembers,
    },
    {
      key: 'repeatRatePct',
      label: 'ลูกค้ากลับมา',
      value: `${num(kpis.repeatRatePct)}%`,
      change: change.repeatRatePct,
    },
  ];

  return (
    <div className="rp">
      <div className="page-head">
        <div>
          <h1>รายงานและสถิติ (Reports)</h1>
          <p className="muted">
            {formatThaiDate(range.from)}
            {range.from !== range.to ? ` – ${formatThaiDate(range.to)}` : ''}
            {report?.previous ? (
              <>
                {' '}
                · เทียบกับ {report.previous.from} – {report.previous.to}
              </>
            ) : null}
          </p>
        </div>
        <div className="rp-head-actions">
          <button type="button" className="btn-ghost" onClick={load} disabled={loading}>
            รีเฟรช
          </button>
          <button type="button" className="btn-primary" onClick={onExport} disabled={exporting}>
            {exporting ? 'กำลังส่งออก...' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="rp-filters panel">
        <div className="rp-presets" role="group" aria-label="ช่วงเวลา">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={'rp-preset' + (preset === p.key ? ' active' : '')}
              onClick={() => setPreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="rp-custom">
            <label>
              จาก
              <input
                type="date"
                className="input"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </label>
            <label>
              ถึง
              <input
                type="date"
                className="input"
                value={customTo}
                min={customFrom}
                max={todayTH()}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </label>
          </div>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}
      {loading && !report && <p className="muted">กำลังโหลดรายงาน...</p>}

      <div className="rp-kpis">
        {kpiCards.map((c) => (
          <div key={c.key} className="rp-kpi panel">
            <div className="rp-kpi-label">{c.label}</div>
            <div className="rp-kpi-value">{loading && !report ? '—' : c.value}</div>
            <ChangePct value={c.change} />
          </div>
        ))}
      </div>

      <div className="rp-main">
        <section className="panel rp-section">
          <div className="rp-section-head">
            <h2>แนวโน้มรายได้</h2>
          </div>
          <RevenueChart series={report?.revenueTrend} />
        </section>

        <section className="panel rp-section">
          <div className="rp-section-head">
            <h2>เกมยอดนิยม</h2>
            <span className="muted">Top 10</span>
          </div>
          <ol className="rp-top-games">
            {(report?.topGames || []).length === 0 && <li className="muted">ยังไม่มีข้อมูล</li>}
            {(report?.topGames || []).map((g, i) => (
              <li key={g.game?._id || i}>
                <span className="rp-rank">{i + 1}</span>
                {g.game?.thumbnail ? (
                  <img src={g.game.thumbnail} alt="" className="rp-thumb" />
                ) : (
                  <span className="rp-thumb placeholder">🎲</span>
                )}
                <div className="rp-game-info">
                  <strong>{g.game?.name || '—'}</strong>
                  <small>
                    {num(g.reservations)} รอบ · {num(g.players)} คน · {num(g.hours)} ชม.
                    {g.avgRating != null ? ` · ★ ${g.avgRating}` : ''}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="rp-main">
        <section className="panel rp-section">
          <div className="rp-section-head">
            <h2>สัดส่วนหมวดหมู่เกม</h2>
          </div>
          <CategoryBars categories={report?.categories} />
        </section>

        <section className="panel rp-section rp-section-wide">
          <div className="rp-section-head">
            <h2>ช่วงเวลาคนเยอะ (Heatmap)</h2>
            <span className="muted">{heat ? `${heat.from} – ${heat.to}` : '10:00–23:00'}</span>
          </div>
          <Heatmap matrix={heat?.matrix} days={heat?.days} max={heat?.max} />
        </section>
      </div>
    </div>
  );
}
