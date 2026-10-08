import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { PRIORITY, baht, fmtDate, itemName } from '../../components/admin/maintenance/helpers.js';
import ReportIssueModal from '../../components/admin/maintenance/ReportIssueModal.jsx';
import ResolveModal from '../../components/admin/maintenance/ResolveModal.jsx';
import './maintenance.css';

const COLUMNS = [
  { key: 'pending', title: 'รอดำเนินการ' },
  { key: 'in_progress', title: 'กำลังซ่อม' },
  { key: 'resolved', title: 'เสร็จสิ้น' },
];

const FILTERS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'game', label: 'เฉพาะบอร์ดเกม' },
  { key: 'table', label: 'เฉพาะโต๊ะและอุปกรณ์' },
  { key: 'urgent', label: 'ด่วนพิเศษ' },
];

const matchFilter = (t, f) =>
  f === 'all' ? true : f === 'urgent' ? t.priority === 'high' : t.itemType === f;

function TicketCard({ t, col, busy, onStart, onResolve, onReopen, onDelete, onDragStart }) {
  const prio = PRIORITY[t.priority] ?? PRIORITY.medium;
  const thumb = t.itemType === 'game' ? t.game?.thumbnail : null;
  return (
    <li
      className={`mt-card${busy ? ' is-busy' : ''}`}
      draggable={!busy}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', t._id);
        onDragStart(t._id);
      }}
    >
      <div className="mt-card-top">
        {thumb ? (
          <img className="mt-thumb" src={thumb} alt="" />
        ) : (
          <span className="mt-thumb mt-thumb-ico">{t.itemType === 'game' ? '🎲' : '🪑'}</span>
        )}
        <div className="mt-card-title">
          <strong>{itemName(t)}</strong>
          <small className="muted">
            {t.itemType === 'game'
              ? 'บอร์ดเกม'
              : `โต๊ะ${t.table?.zone ? ' • ' + t.table.zone : ''}`}
          </small>
        </div>
        <span className={`mt-prio mt-prio-${prio.tone}`}>{prio.label}</span>
      </div>

      <div className="mt-desc">
        <b>{t.title}</b>
        {t.description && <p>{t.description}</p>}
        {col === 'resolved' && t.resolution && <p className="mt-resolution">✓ {t.resolution}</p>}
      </div>

      <div className="mt-card-foot">
        <span className="muted">
          {col === 'resolved'
            ? `${t.resolvedBy?.username ?? '-'} • ${fmtDate(t.resolvedAt)}${t.cost ? ' • ' + baht(t.cost) : ''}`
            : `${t.reportedBy?.username ?? '-'} • ${fmtDate(t.createdAt)}`}
        </span>
        <span className="mt-actions">
          {col === 'pending' && (
            <button
              type="button"
              className="btn-ghost mt-sm"
              disabled={busy}
              onClick={() => onStart(t)}
            >
              เริ่มซ่อม →
            </button>
          )}
          {col === 'in_progress' && (
            <button
              type="button"
              className="btn-primary mt-sm"
              disabled={busy}
              onClick={() => onResolve(t)}
            >
              ✓ เสร็จสิ้น
            </button>
          )}
          {col === 'resolved' && (
            <button
              type="button"
              className="btn-ghost mt-sm"
              disabled={busy}
              onClick={() => onReopen(t)}
            >
              เปิดงานใหม่
            </button>
          )}
          <button
            type="button"
            className="btn-danger mt-sm"
            disabled={busy}
            title="ลบใบแจ้งซ่อม"
            onClick={() => onDelete(t)}
          >
            ลบ
          </button>
        </span>
      </div>
    </li>
  );
}

// หน้า 8 ติดตามการซ่อมบำรุง
// GET /maintenance/summary + GET /maintenance?status=... / PATCH /maintenance/:id / POST /maintenance
export default function Maintenance() {
  const [summary, setSummary] = useState(null);
  const [lists, setLists] = useState({ pending: [], in_progress: [], resolved: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [historyQ, setHistoryQ] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [resolving, setResolving] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [sum, p, ip, rs] = await Promise.all([
        api('/maintenance/summary'),
        api('/maintenance', { query: { status: 'pending', limit: 200 } }),
        api('/maintenance', { query: { status: 'in_progress', limit: 200 } }),
        api('/maintenance', { query: { status: 'resolved', limit: 50 } }),
      ]);
      setSummary(sum);
      setLists({
        pending: p?.items ?? [],
        in_progress: ip?.items ?? [],
        resolved: rs?.items ?? [],
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const all = [...lists.pending, ...lists.in_progress, ...lists.resolved];
  const open = [...lists.pending, ...lists.in_progress];

  async function patch(t, body) {
    setBusyId(t._id);
    setError('');
    try {
      await api(`/maintenance/${t._id}`, { method: 'PATCH', body });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const onStart = (t) => patch(t, { status: 'in_progress' });
  const onReopen = (t) => {
    if (window.confirm(`เปิดงานซ่อม "${itemName(t)}" ใหม่? ระบบจะปิดการใช้งานชิ้นนี้อีกครั้ง`))
      patch(t, { status: 'pending' });
  };

  async function onDelete(t) {
    if (!window.confirm(`ลบใบแจ้งซ่อม "${itemName(t)}"?`)) return;
    setBusyId(t._id);
    setError('');
    try {
      await api(`/maintenance/${t._id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  // ลากการ์ดไปวางในคอลัมน์
  function onDrop(e, colKey) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragId;
    setOverCol(null);
    setDragId(null);
    const t = all.find((x) => x._id === id);
    if (!t || t.status === colKey) return;
    if (colKey === 'resolved') return setResolving(t); // ต้องกรอกผลซ่อม/ค่าซ่อมก่อน
    if (t.status === 'resolved') {
      if (window.confirm(`เปิดงานซ่อม "${itemName(t)}" ใหม่? ระบบจะปิดการใช้งานชิ้นนี้อีกครั้ง`))
        patch(t, { status: colKey });
      return;
    }
    patch(t, { status: colKey });
  }

  // ประวัติการซ่อม (ขวา): ค้นหาจากข้อมูลที่โหลดมา
  const hq = historyQ.trim().toLowerCase();
  const history = lists.resolved.filter(
    (t) =>
      !hq ||
      [itemName(t), t.title, t.resolution, t.resolvedBy?.username].some((s) =>
        (s ?? '').toLowerCase().includes(hq),
      ),
  );

  const cards = [
    {
      key: 'pending',
      title: 'รายการที่รอซ่อม (Pending)',
      value: summary?.pending,
      note: 'รอดำเนินการ',
    },
    {
      key: 'in_progress',
      title: 'กำลังดำเนินการ (In Progress)',
      value: summary?.in_progress,
      note: 'กำลังซ่อมอยู่',
    },
    {
      key: 'resolved',
      title: 'ซ่อมเสร็จแล้ว (Resolved)',
      value: summary?.resolved,
      note: `ค่าซ่อมรวมทั้งหมด ${baht(summary?.totalCost)}`,
    },
  ];

  return (
    <div className="maint-page">
      <div className="page-head">
        <div>
          <h1>ติดตามการซ่อมบำรุง (Maintenance & Repair Tracking)</h1>
          <p className="muted">
            ติดตามสถานะเกมและโต๊ะที่อยู่ระหว่างการซ่อมแซม ลากการ์ดเพื่ออัปเดตสถานะ
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowReport(true)}>
          + แจ้งปัญหาใหม่ (Report New Issue)
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="mt-cards">
        {cards.map((c) => (
          <div key={c.key} className={`stat-card mt-sum mt-sum-${c.key}`}>
            <div className="stat-title">{c.title}</div>
            <div className="stat-value">
              {loading ? '–' : (c.value ?? 0)} <span className="stat-unit">รายการ</span>
            </div>
            <div className="stat-note">{c.note}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={'tab' + (filter === f.key ? ' active' : '')}
            onClick={() => setFilter(f.key)}
          >
            {f.label} ({open.filter((t) => matchFilter(t, f.key)).length})
          </button>
        ))}
      </div>

      <div className="mt-main">
        <div className="mt-board">
          {COLUMNS.map((col) => {
            const items = lists[col.key].filter((t) => matchFilter(t, filter));
            const shown = col.key === 'resolved' ? items.slice(0, 8) : items;
            return (
              <section
                key={col.key}
                className={`mt-col mt-col-${col.key}${overCol === col.key ? ' is-over' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setOverCol(col.key)}
                onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setOverCol(null)}
                onDrop={(e) => onDrop(e, col.key)}
              >
                <header className="mt-col-head">
                  <h2>{col.title}</h2>
                  <span className="chip tone-maintenance">
                    {summary?.[col.key] ?? items.length}
                  </span>
                </header>
                {loading && <p className="muted">กำลังโหลด...</p>}
                {!loading && shown.length === 0 && <p className="muted mt-empty">ไม่มีรายการ</p>}
                <ul className="mt-list">
                  {shown.map((t) => (
                    <TicketCard
                      key={t._id}
                      t={t}
                      col={col.key}
                      busy={busyId === t._id}
                      onStart={onStart}
                      onResolve={setResolving}
                      onReopen={onReopen}
                      onDelete={onDelete}
                      onDragStart={setDragId}
                    />
                  ))}
                </ul>
                {col.key === 'resolved' && items.length > shown.length && (
                  <p className="muted mt-more">
                    แสดง {shown.length} จาก {items.length} รายการ ดูทั้งหมดในประวัติด้านขวา
                  </p>
                )}
              </section>
            );
          })}
        </div>

        <aside className="panel mt-history">
          <div className="panel-head">
            <h2>ประวัติการซ่อมทั้งหมด</h2>
            <span className="chip tone-available">{summary?.resolved ?? 0} รายการ</span>
          </div>
          <input
            className="input"
            type="search"
            placeholder="ค้นหาชื่อเกม โต๊ะ ผู้ซ่อม..."
            value={historyQ}
            onChange={(e) => setHistoryQ(e.target.value)}
          />
          {history.length === 0 && <p className="muted">ยังไม่มีประวัติการซ่อม</p>}
          <ul className="mt-hist-list">
            {history.map((t) => (
              <li key={t._id} className="mt-hist-item">
                <div className="mt-hist-top">
                  <strong>{itemName(t)}</strong>
                  <span className="mt-cost">{baht(t.cost)}</span>
                </div>
                <small className="muted">
                  {fmtDate(t.resolvedAt)} • {t.resolvedBy?.username ?? '-'}
                </small>
                <div className="mt-hist-note">
                  <div>
                    <b>อาการ:</b> {t.title}
                  </div>
                  {t.resolution && <div className="mt-resolution">✓ {t.resolution}</div>}
                </div>
              </li>
            ))}
          </ul>
          {summary?.resolved > lists.resolved.length && (
            <p className="muted">
              แสดงล่าสุด {lists.resolved.length} จาก {summary.resolved} รายการ
            </p>
          )}
        </aside>
      </div>

      {showReport && (
        <ReportIssueModal
          onClose={() => setShowReport(false)}
          onCreated={() => {
            setShowReport(false);
            load();
          }}
        />
      )}
      {resolving && (
        <ResolveModal
          ticket={resolving}
          onClose={() => setResolving(null)}
          onDone={() => {
            setResolving(null);
            load();
          }}
        />
      )}
    </div>
  );
}
