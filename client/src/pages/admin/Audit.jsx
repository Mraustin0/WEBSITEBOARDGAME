import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import './audit.css';

const ACTIONS = [
  '',
  'create',
  'update',
  'delete',
  'suspend',
  'unsuspend',
  'approve',
  'login',
  'role_change',
  'settings',
  'pay',
  'return',
  'no_show',
  'cancel',
];
const MODULES = [
  '',
  'auth',
  'users',
  'games',
  'tables',
  'reservations',
  'maintenance',
  'settings',
  'roles',
  'reviews',
  'notifications',
  'assist',
  'system',
];

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ACTION_COLOR = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  suspend: 'orange',
  unsuspend: 'green',
  approve: 'green',
  login: 'gray',
  role_change: 'purple',
};

export default function Audit() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const [module, setModule] = useState('');
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const limit = 30;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, sum] = await Promise.all([
        api('/audit', {
          query: {
            page,
            limit,
            action: action || undefined,
            module: module || undefined,
            q: q || undefined,
          },
        }),
        api('/audit/summary'),
      ]);
      setItems(list?.items ?? []);
      setTotal(list?.total ?? 0);
      setSummary(sum);
    } catch (err) {
      setError(err.message || 'โหลดบันทึกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [page, action, module, q]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQ(qInput.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [qInput]);

  async function exportCsv() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/audit/export.csv', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: 'audit.csv' }).click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  const pages = Math.max(1, Math.ceil(total / limit));
  const byAction = summary?.byAction || {};

  return (
    <div className="audit">
      <div className="page-head">
        <div>
          <p className="muted">ตั้งค่าระบบ / บันทึกกิจกรรม</p>
          <h1>
            บันทึกกิจกรรมระบบ <span className="title-en">Audit Trail</span>
          </h1>
        </div>
        <button type="button" className="btn primary" onClick={exportCsv}>
          ⬇ Export CSV
        </button>
      </div>

      {summary && (
        <div className="audit-stats">
          <div className="stat-card">
            <span className="stat-label">วันนี้</span>
            <strong>{summary.total ?? 0}</strong>
            <span className="muted">กิจกรรม</span>
          </div>
          {Object.entries(byAction)
            .slice(0, 5)
            .map(([k, v]) => (
              <div className="stat-card" key={k}>
                <span className="stat-label">{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
        </div>
      )}

      <div className="audit-filters">
        <input
          placeholder="ค้นหาสรุป / ชื่อผู้ทำ / target..."
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
        <select
          value={action}
          onChange={(e) => {
            setPage(1);
            setAction(e.target.value);
          }}
        >
          <option value="">ทุก action</option>
          {ACTIONS.filter(Boolean).map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={module}
          onChange={(e) => {
            setPage(1);
            setModule(e.target.value);
          }}
        >
          <option value="">ทุกโมดูล</option>
          {MODULES.filter(Boolean).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error-box">{error}</div>}
      {loading ? (
        <p className="muted">กำลังโหลด...</p>
      ) : (
        <div className="audit-list">
          {items.length === 0 && <p className="muted">ไม่มีรายการ</p>}
          {items.map((row) => (
            <article key={row._id} className="audit-item">
              <div className="audit-item-top">
                <span className={`action-badge ${ACTION_COLOR[row.action] || 'gray'}`}>
                  {row.action}
                </span>
                <span className="module-tag">{row.module}</span>
                <time>{fmt(row.createdAt)}</time>
              </div>
              <p className="audit-summary">{row.summary}</p>
              <div className="audit-meta">
                <span>{row.actorName || 'system'}</span>
                {row.actorRole && <span className="muted">· {row.actorRole}</span>}
                {row.targetType && (
                  <span className="muted">
                    · {row.targetType} {row.targetId?.slice?.(-6)}
                  </span>
                )}
                {row.ip && <span className="muted">· {row.ip}</span>}
              </div>
            </article>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="pager">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ก่อนหน้า
          </button>
          <span>
            {page} / {pages} ({total} รายการ)
          </span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            ถัดไป
          </button>
        </div>
      )}
    </div>
  );
}
