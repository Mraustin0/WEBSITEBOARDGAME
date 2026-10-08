import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import './notification.css';

// ประเภทแจ้งเตือนจาก server (NOTIFICATION_TYPES) → ไอคอน / สี / ชื่อไทย / หน้าปลายทาง
const TYPE_META = {
  booking_new: { icon: '📅', tone: 'book', label: 'การจองใหม่', href: '/admin/reservations' },
  booking_cancelled: {
    icon: '✕',
    tone: 'noshow',
    label: 'ยกเลิกการจอง',
    href: '/admin/reservations',
  },
  booking_affected: {
    icon: '⚠',
    tone: 'noshow',
    label: 'การจองที่ได้รับผลกระทบ',
    href: '/admin/maintenance',
  },
  time_ending: { icon: '⏱', tone: 'fix', label: 'ใกล้หมดเวลา', href: '/admin/reservations' },
  time_overdue: { icon: '⏰', tone: 'noshow', label: 'เลยเวลา', href: '/admin/reservations' },
  assist: { icon: '🙋', tone: 'noshow', label: 'เรียกพนักงาน', href: '/admin/reservations' },
  maintenance_new: { icon: '🔧', tone: 'fix', label: 'แจ้งซ่อมใหม่', href: '/admin/maintenance' },
  maintenance_done: { icon: '✅', tone: 'play', label: 'ซ่อมเสร็จ', href: '/admin/maintenance' },
};
const TYPES = Object.keys(TYPE_META);

const GROUPS = [
  { key: 'today', label: 'วันนี้ (TODAY)' },
  { key: 'yesterday', label: 'เมื่อวาน' },
  { key: 'earlier', label: 'ก่อนหน้านี้' },
];

function agoText(iso) {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'เมื่อสักครู่';
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} ชม. ที่แล้ว`;
  return `${Math.floor(h / 24)} วันที่แล้ว`;
}

// server ส่ง path เป็น "/api/..." แต่ api() เติม /api ให้เอง
const stripApi = (path) => path.replace(/^\/api/, '');

/**
 * Notification Center (หน้า 10) — ใช้ /notifications ของ server
 * สถานะอ่านแล้วนับรายคนที่ server, ปุ่มดำเนินการ (ต่อเวลา / รับเรื่อง) ยิง action ที่ server ส่งมา
 */
export default function NotificationPanel({ open, onClose, onCountChange }) {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ total: 0, unread: 0, important: 0 });
  const [filter, setFilter] = useState('all'); // all | unread | important
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [showPrefs, setShowPrefs] = useState(false);
  const [muted, setMuted] = useState([]);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError('');
      try {
        const res = await api('/notifications', { query: { filter, limit: 50 } });
        setItems(res.items ?? []);
        setCounts({
          total: res.total ?? 0,
          unread: res.unread ?? 0,
          important: res.important ?? 0,
        });
        onCountChange?.(res.unread ?? 0);
      } catch (err) {
        setError(err.message || 'โหลดการแจ้งเตือนไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    },
    [filter, onCountChange],
  );

  // โหลดตอนเปิด/เปลี่ยน filter + รีเฟรชเงียบ ๆ ทุก 30 วิ ขณะเปิดอยู่
  useEffect(() => {
    if (!open) return undefined;
    load();
    const id = setInterval(() => load({ silent: true }), 30000);
    return () => clearInterval(id);
  }, [open, load]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // ตั้งค่าประเภทที่ปิดแจ้งเตือน
  useEffect(() => {
    if (!open || !showPrefs) return;
    api('/notifications/preferences')
      .then((r) => setMuted(r.muted ?? []))
      .catch((err) => setError(err.message));
  }, [open, showPrefs]);

  async function markRead(id) {
    setItems((list) => list.map((n) => (n._id === id ? { ...n, read: true } : n)));
    try {
      await api(`/notifications/${id}/read`, { method: 'PATCH' });
      load({ silent: true });
    } catch (err) {
      setError(err.message);
    }
  }

  async function markAllRead() {
    try {
      await api('/notifications/read-all', { method: 'PATCH' });
      await load({ silent: true });
    } catch (err) {
      setError(err.message);
    }
  }

  async function runAction(n, a) {
    setBusyKey(`${n._id}:${a.key}`);
    setError('');
    try {
      await api(stripApi(a.path), { method: a.method, body: a.body });
      if (!n.read) await api(`/notifications/${n._id}/read`, { method: 'PATCH' });
      await load({ silent: true });
    } catch (err) {
      setError(err.message || 'ดำเนินการไม่สำเร็จ');
    } finally {
      setBusyKey('');
    }
  }

  async function togglePref(type) {
    const next = muted.includes(type) ? muted.filter((t) => t !== type) : [...muted, type];
    setMuted(next);
    try {
      await api('/notifications/preferences', { method: 'PUT', body: { muted: next } });
      load({ silent: true });
    } catch (err) {
      setError(err.message);
    }
  }

  if (!open) return null;

  return (
    <div className="nf-root" role="dialog" aria-modal="true" aria-label="การแจ้งเตือน">
      <div className="nf-backdrop" onClick={onClose} />
      <aside className="nf-panel">
        <header className="nf-head">
          <div>
            <h2>
              การแจ้งเตือน
              {counts.unread > 0 && <span className="nf-new">{counts.unread} ใหม่</span>}
            </h2>
          </div>
          <div className="nf-head-actions">
            <button
              type="button"
              className={'nf-icon-btn' + (showPrefs ? ' active' : '')}
              onClick={() => setShowPrefs((v) => !v)}
              title="ตั้งค่าการแจ้งเตือน"
              aria-pressed={showPrefs}
            >
              ⚙
            </button>
            <button type="button" className="nf-icon-btn" onClick={() => load()} title="รีเฟรช">
              ↻
            </button>
            <button type="button" className="nf-icon-btn" onClick={onClose} aria-label="ปิด">
              ✕
            </button>
          </div>
        </header>

        {showPrefs && (
          <div className="nf-prefs">
            <strong>เลือกประเภทที่ต้องการรับแจ้งเตือน</strong>
            {TYPES.map((t) => (
              <label key={t} className="nf-pref-row">
                <input
                  type="checkbox"
                  checked={!muted.includes(t)}
                  onChange={() => togglePref(t)}
                />
                <span>
                  {TYPE_META[t].icon} {TYPE_META[t].label}
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="nf-filters">
          {[
            { key: 'all', label: filter === 'all' ? `ทั้งหมด ${counts.total}` : 'ทั้งหมด' },
            { key: 'unread', label: `ยังไม่อ่าน ${counts.unread}` },
            { key: 'important', label: `สำคัญ ${counts.important}` },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              className={'nf-chip' + (filter === f.key ? ' active' : '')}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            className="nf-mark"
            onClick={markAllRead}
            disabled={counts.unread === 0}
          >
            ✓ อ่านทั้งหมด
          </button>
        </div>

        {error && <div className="form-error nf-error">{error}</div>}
        {loading && <p className="nf-muted">กำลังโหลด...</p>}

        <div className="nf-list">
          {!loading && items.length === 0 && (
            <p className="nf-muted nf-empty">ไม่มีการแจ้งเตือนในหมวดนี้</p>
          )}

          {GROUPS.map((g) => {
            const rows = items.filter((n) => n.dayGroup === g.key);
            if (rows.length === 0) return null;
            return (
              <div className="nf-group" key={g.key}>
                <div className="nf-group-label">
                  <span>{g.label}</span>
                  <span>{rows.length} รายการ</span>
                </div>
                {rows.map((n) => (
                  <NotifItem
                    key={n._id}
                    item={n}
                    busyKey={busyKey}
                    onRead={() => markRead(n._id)}
                    onAction={(a) => runAction(n, a)}
                    onClose={onClose}
                  />
                ))}
              </div>
            );
          })}
        </div>

        <footer className="nf-foot">
          <span className="nf-muted">เก็บประวัติแจ้งเตือน 60 วัน</span>
          <Link to="/admin/maintenance" className="nf-foot-link" onClick={onClose}>
            ดูซ่อมบำรุง →
          </Link>
        </footer>
      </aside>
    </div>
  );
}

function NotifItem({ item, busyKey, onRead, onAction, onClose }) {
  const meta = TYPE_META[item.type] ?? { icon: '•', tone: 'book', href: '/admin' };
  // action แบบ GET = ไปดูรายละเอียด (ยังไม่มีหน้าเฉพาะ → พาไปหน้ารวม), อื่น ๆ = ยิง API ตรง ๆ
  const doable = (item.actions ?? []).filter((a) => a.method && a.method !== 'GET');
  const hasView = (item.actions ?? []).some((a) => a.method === 'GET') || doable.length === 0;

  return (
    <article className={'nf-item' + (item.read ? ' read' : '') + (item.important ? ' urgent' : '')}>
      <div className={'nf-ico nf-ico-' + meta.tone}>{meta.icon}</div>
      <div className="nf-body">
        <div className="nf-item-top">
          <strong>{item.title}</strong>
          <span className="nf-time">{agoText(item.createdAt)}</span>
        </div>
        <p>{item.message}</p>
        <div className="nf-item-actions">
          {item.done ? (
            <span className="nf-done">✓ จัดการแล้ว</span>
          ) : (
            doable.map((a) => (
              <button
                key={a.key}
                type="button"
                className="nf-action"
                disabled={busyKey === `${item._id}:${a.key}`}
                onClick={() => onAction(a)}
              >
                {busyKey === `${item._id}:${a.key}` ? '...' : a.label}
              </button>
            ))
          )}
          {hasView && (
            <Link
              className="nf-action ghost"
              to={meta.href}
              onClick={() => {
                if (!item.read) onRead();
                onClose();
              }}
            >
              ดูรายละเอียด
            </Link>
          )}
          {!item.read && (
            <button type="button" className="nf-action ghost" onClick={onRead}>
              ทำเครื่องหมายว่าอ่านแล้ว
            </button>
          )}
        </div>
      </div>
      {!item.read && <span className="nf-unread-dot" />}
    </article>
  );
}

/** ปุ่มกระดิ่ง + badge สำหรับใส่ใน topbar */
export function NotificationBell({ onClick, count }) {
  return (
    <button type="button" className="nf-bell" onClick={onClick} aria-label="การแจ้งเตือน">
      🔔
      {count > 0 && <span className="nf-bell-badge">{count > 9 ? '9+' : count}</span>}
    </button>
  );
}
