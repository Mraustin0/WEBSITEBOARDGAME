import { useCallback, useEffect, useState } from 'react';
import FieldError, { FieldHint, PASSWORD_HINT } from '../../components/FieldError.jsx';
import { DUP_ACCOUNT_MSG, useFieldErrors } from '../../lib/useFieldErrors.js';
import { vEmail, vNewPassword, vText, vUsername } from '../../lib/validate.js';
import { api } from '../../lib/api.js';
import './users.css';

const LIMIT = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

/** fallback ถ้า API โหลดบทบาทไม่สำเร็จ */
const FALLBACK_ROLES = [
  {
    slug: 'admin',
    name: 'ผู้ดูแลระบบ',
    label: 'ผู้ดูแลระบบ',
    description: 'จัดการร้านได้ทุกเมนู รวมถึงผู้ใช้และการตั้งค่า',
  },
  {
    slug: 'user',
    name: 'สมาชิก',
    label: 'สมาชิก',
    description: 'ลูกค้า จองโต๊ะและดูการจองของตัวเองได้',
  },
];

function roleLabel(slug, roleList) {
  const r = (roleList || []).find((x) => x.slug === slug);
  if (r) return r.name || r.label || slug;
  const fb = FALLBACK_ROLES.find((x) => x.slug === slug);
  return fb?.label || fb?.name || slug;
}

const STATUSES = {
  active: { label: 'ปกติ', className: 'ok' },
  suspended: { label: 'ถูกระงับ', className: 'bad' },
  pending: { label: 'รออนุมัติ', className: 'warn' },
};

const TIERS = {
  regular: 'ทั่วไป',
  gold: 'Gold',
  vip: 'VIP',
  new: 'ใหม่',
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function relativeDay(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
  if (days <= 0) return 'วันนี้';
  if (days === 1) return 'เมื่อวาน';
  if (days < 30) return `${days} วันที่แล้ว`;
  if (days < 365) return `${Math.floor(days / 30)} เดือนที่แล้ว`;
  return `${Math.floor(days / 365)} ปีที่แล้ว`;
}

function currentUserId() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    return u?.id ?? u?._id ?? null;
  } catch {
    return null;
  }
}

// รายการเลขหน้า: 1 … current-1 current current+1 … last
function pageList(page, pages) {
  const set = new Set([1, pages, page - 1, page, page + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push('gap-' + n);
    out.push(n);
  });
  return out;
}

function errorText(err, fallback) {
  if (err.status === 409) return DUP_ACCOUNT_MSG;
  if (err.status === 400) return 'ข้อมูลไม่ถูกต้อง ตรวจสอบช่องที่กรอกอีกครั้ง';
  return err.message || fallback;
}

function Modal({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="us-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="us-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="us-modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="us-muted">{subtitle}</p>}
          </div>
          <button type="button" className="us-x" aria-label="ปิด" onClick={onClose}>
            ✕
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function RoleOptions({ value, onChange, roles }) {
  const list = roles?.length ? roles : FALLBACK_ROLES;
  return (
    <div className="us-role-opts">
      {list.map((r) => {
        const key = r.slug;
        const title = r.name || r.label || key;
        const desc = r.description || r.desc || '';
        return (
          <label key={key} className={'us-role-opt' + (value === key ? ' on' : '')}>
            <input
              type="radio"
              name="role"
              value={key}
              checked={value === key}
              onChange={() => onChange(key)}
            />
            <span className="us-role-opt-title">{title}</span>
            {desc ? <span className="us-muted">{desc}</span> : null}
          </label>
        );
      })}
    </div>
  );
}

function AddUserModal({ onClose, onDone, roles }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'user' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const v = useFieldErrors(form, (f) => ({
    username: vUsername(f.username),
    email: vEmail(f.email),
    password: vNewPassword(f.password),
    role: f.role ? '' : 'เลือกบทบาท',
  }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!v.submit()) return;
    setBusy(true);
    const username = form.username.trim();
    try {
      const { password, role } = form;
      // ใช้ endpoint admin ที่รองรับ role ได้เลย
      await api('/admin/users', {
        method: 'POST',
        body: { username, email: form.email.trim(), password, role: role || 'user' },
      });
      onDone({
        tone: 'ok',
        text: `เพิ่มผู้ใช้ "${username}" เป็น ${roleLabel(role, roles)} แล้ว`,
      });
    } catch (err) {
      setBusy(false);
      if (err.status === 400 && v.server(err)) return;
      if (
        err.status === 409 &&
        (v.server(err) || v.setErrors({ username: DUP_ACCOUNT_MSG, email: DUP_ACCOUNT_MSG }))
      )
        return;
      setError(errorText(err, 'เพิ่มผู้ใช้ไม่สำเร็จ'));
    }
  }

  return (
    <Modal title="เพิ่มผู้ใช้" subtitle="สร้างบัญชีและเลือกบทบาท" onClose={onClose}>
      <form className="us-form" onSubmit={submit} noValidate>
        <label>
          <span>ชื่อผู้ใช้</span>
          <input
            className="input"
            required
            maxLength={32}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={form.username}
            onChange={set('username')}
            autoFocus
            {...v.bind('username')}
          />
          <FieldError variant="admin" id={v.errId('username')} msg={v.errors.username} />
        </label>
        <label>
          <span>อีเมล</span>
          <input
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            maxLength={254}
            value={form.email}
            onChange={set('email')}
            {...v.bind('email')}
          />
          <FieldError variant="admin" id={v.errId('email')} msg={v.errors.email} />
        </label>
        <label>
          <span>รหัสผ่าน</span>
          <input
            className="input"
            type="password"
            required
            maxLength={128}
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
            {...v.bind('password', { hintId: 'us-add-pw-hint' })}
          />
          <FieldHint variant="admin" id="us-add-pw-hint">
            {PASSWORD_HINT}
          </FieldHint>
          <FieldError variant="admin" id={v.errId('password')} msg={v.errors.password} />
        </label>
        <div>
          <span className="us-label">บทบาท</span>
          <RoleOptions
            value={form.role}
            onChange={(role) => setForm((f) => ({ ...f, role }))}
            roles={roles}
          />
          <FieldError variant="admin" id={v.errId('role')} msg={v.errors.role} />
        </div>
        {error && <div className="us-error">{error}</div>}
        <footer className="us-modal-foot">
          <button type="button" className="us-btn" onClick={onClose} disabled={busy}>
            ยกเลิก
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'กำลังบันทึก...' : 'เพิ่มผู้ใช้'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function EditRoleModal({ user, onClose, onDone, roles }) {
  const [role, setRole] = useState(user.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    try {
      await api(`/admin/users/${user._id}/role`, { method: 'PUT', body: { role } });
      onDone({
        tone: 'ok',
        text: `เปลี่ยนบทบาทของ "${user.username}" เป็น ${roleLabel(role, roles)} แล้ว`,
      });
    } catch (err) {
      setError(err.message || 'เปลี่ยนบทบาทไม่สำเร็จ');
      setBusy(false);
    }
  }

  return (
    <Modal title="เปลี่ยนบทบาท" subtitle={`${user.username} · ${user.email}`} onClose={onClose}>
      <div className="us-form">
        <RoleOptions value={role} onChange={setRole} roles={roles} />
        {error && <div className="us-error">{error}</div>}
        <footer className="us-modal-foot">
          <button type="button" className="us-btn" onClick={onClose} disabled={busy}>
            ยกเลิก
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={save}
            disabled={busy || role === user.role}
          >
            {busy ? 'กำลังบันทึก...' : 'บันทึกบทบาท'}
          </button>
        </footer>
      </div>
    </Modal>
  );
}

function DeleteModal({ user, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      await api(`/admin/users/${user._id}`, { method: 'DELETE' });
      onDone({ tone: 'ok', text: `ลบผู้ใช้ "${user.username}" แล้ว` });
    } catch (err) {
      setError(err.message || 'ลบผู้ใช้ไม่สำเร็จ');
      setBusy(false);
    }
  }

  return (
    <Modal title="ลบผู้ใช้" subtitle="ลบแล้วกู้คืนไม่ได้" onClose={onClose}>
      <div className="us-form">
        <p>
          ต้องการลบบัญชี <strong>{user.username}</strong> ({user.email}) ถาวรหรือไม่
        </p>
        {error && <div className="us-error">{error}</div>}
        <footer className="us-modal-foot">
          <button type="button" className="us-btn" onClick={onClose} disabled={busy}>
            ยกเลิก
          </button>
          <button type="button" className="us-btn us-btn-danger" onClick={confirm} disabled={busy}>
            {busy ? 'กำลังลบ...' : 'ลบถาวร'}
          </button>
        </footer>
      </div>
    </Modal>
  );
}

/** ระงับบัญชี + เหตุผล (ไม่บังคับ ≤ 300 ตัว ตาม suspendBody) — แทน window.prompt */
function SuspendModal({ user, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const v = useFieldErrors({ reason }, (f) => ({
    reason: vText(f.reason, { max: 300, label: 'เหตุผล' }),
  }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!v.submit()) return;
    setBusy(true);
    try {
      await suspendUser(user, reason.trim());
      onDone({ tone: 'ok', text: `ระงับบัญชี ${user.username} แล้ว` });
    } catch (err) {
      setBusy(false);
      if (!(err.status === 400 && v.server(err))) setError(err.message || 'ระงับบัญชีไม่สำเร็จ');
    }
  }

  return (
    <Modal title="ระงับบัญชี" subtitle={`${user.username} · ${user.email}`} onClose={onClose}>
      <form className="us-form" onSubmit={submit} noValidate>
        <label>
          <span>เหตุผลที่ระงับ (ไม่บังคับ)</span>
          <textarea
            className="input"
            rows={3}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="เช่น ไม่มาตามนัดหลายครั้ง"
            autoFocus
            {...v.bind('reason')}
          />
          <FieldError variant="admin" id={v.errId('reason')} msg={v.errors.reason} />
        </label>
        {error && <div className="us-error">{error}</div>}
        <footer className="us-modal-foot">
          <button type="button" className="us-btn" onClick={onClose} disabled={busy}>
            ยกเลิก
          </button>
          <button type="submit" className="us-btn us-btn-warn" disabled={busy}>
            {busy ? 'กำลังระงับ...' : 'ระงับบัญชี'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

/**
 * หน้าจัดการผู้ใช้งานและสิทธิ์ (ดีไซน์หน้า 5)
 * ใช้ GET /admin/users, PUT /admin/users/:id/role, DELETE /admin/users/:id, POST /auth/register
 * รองรับ status / tier / suspend / approve จาก API ใหม่
 */

async function suspendUser(user, reason = '') {
  await api(`/admin/users/${user._id}/suspend`, { method: 'PATCH', body: { reason } });
}
async function unsuspendUser(user) {
  await api(`/admin/users/${user._id}/unsuspend`, { method: 'PATCH' });
}
async function approveUser(user) {
  await api(`/admin/users/${user._id}/approve`, { method: 'PATCH' });
}

export default function Users() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState(''); // ค่า q ที่ debounce แล้ว
  const [role, setRole] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [stats, setStats] = useState({ total: 0, admins: 0, recent: 0, recentCapped: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState(null); // { type: 'add' | 'role' | 'suspend' | 'delete', user? }
  const [roleList, setRoleList] = useState(FALLBACK_ROLES);
  const me = currentUserId();

  // โหลดรายการบทบาทจากระบบ Roles เพื่อให้เลือกได้ยืดหยุ่น
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api('/roles');
        const items = res?.items ?? [];
        if (!cancelled && items.length) {
          setRoleList(
            items.map((r) => ({
              slug: r.slug,
              name: r.name,
              label: r.name,
              description: r.description || '',
              memberCount: r.memberCount ?? 0,
              isSystem: !!r.isSystem,
            })),
          );
        }
      } catch {
        // ใช้ FALLBACK_ROLES ต่อไป
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // หน่วงการพิมพ์ค้นหา 300ms
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(id);
  }, [notice]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/admin/users', {
        query: { q: search, role, status: statusFilter || undefined, page, limit: LIMIT },
      });
      setData({ items: res.items ?? [], total: res.total ?? 0 });
    } catch (err) {
      setError(err.message || 'โหลดรายชื่อผู้ใช้ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [search, role, statusFilter, page]);

  // ตัวเลขสรุป: ผู้ใช้ทั้งหมด / ผู้ดูแล / สมัครใหม่ 7 วัน (นับจาก 200 รายล่าสุด)
  const loadStats = useCallback(async () => {
    try {
      const s = await api('/admin/users/stats');
      setStats({
        total: s.total ?? 0,
        admins: s.staff ?? 0,
        recent: s.pending ?? 0,
        recentCapped: false,
        active: s.active ?? 0,
        suspended: s.suspended ?? 0,
      });
    } catch {
      /* การ์ดสรุปไม่สำคัญเท่าตาราง: ปล่อยค่าเดิมไว้ */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const pages = Math.max(1, Math.ceil(data.total / LIMIT));
  const members = Math.max(0, stats.total - stats.admins);
  const from = data.total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = Math.min(page * LIMIT, data.total);

  function done(result, { afterDelete = false } = {}) {
    setModal(null);
    setNotice(result);
    if (afterDelete && data.items.length === 1 && page > 1) setPage(page - 1);
    else load();
    loadStats();
    // รีเฟรชจำนวนสมาชิกในแต่ละบทบาท
    api('/roles')
      .then((res) => {
        const items = res?.items ?? [];
        if (items.length) {
          setRoleList(
            items.map((r) => ({
              slug: r.slug,
              name: r.name,
              label: r.name,
              description: r.description || '',
              memberCount: r.memberCount ?? 0,
              isSystem: !!r.isSystem,
            })),
          );
        }
      })
      .catch(() => {});
  }

  function pickRole(next) {
    setRole(next);
    setPage(1);
  }

  // แท็บกรองตามบทบาท — ดึงจาก roleList ที่โหลดจาก API
  const tabs = [
    { key: '', label: 'ทั้งหมด', count: stats.total },
    ...roleList.map((r) => ({
      key: r.slug,
      label: r.name || r.label || r.slug,
      count:
        r.memberCount ??
        (r.slug === 'user' ? members : r.slug === 'admin' ? stats.admins : undefined),
    })),
  ];

  const cards = [
    { label: 'ทั้งหมด', title: 'บัญชีผู้ใช้ทั้งหมด', value: stats.total, unit: 'บัญชี' },
    { label: 'สมาชิก', title: 'สมาชิกทั่วไป', value: members, unit: 'คน' },
    { label: 'พนักงาน', title: 'พนักงานและผู้ดูแลระบบ', value: stats.admins, unit: 'คน' },
    {
      label: 'สมัครใหม่',
      title: 'สมัครใหม่ 7 วันล่าสุด',
      value: stats.recentCapped ? `${stats.recent}+` : stats.recent,
      unit: 'บัญชี',
    },
  ];

  return (
    <div className="us">
      <div className="us-head">
        <div>
          <h1>ผู้ใช้งาน</h1>
          <p className="us-muted">
            ผู้ใช้ทั้งหมด {stats.total} คน • พนักงาน {stats.admins} คน • สมัครใหม่สัปดาห์นี้ +
            {stats.recent} คน
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setModal({ type: 'add' })}>
          + เพิ่มผู้ใช้
        </button>
      </div>

      {notice && <div className={'us-notice ' + notice.tone}>{notice.text}</div>}

      <section className="us-cards">
        {cards.map((c) => (
          <article key={c.label} className="us-card">
            <span className="us-card-label">{c.label}</span>
            <span className="us-card-title">{c.title}</span>
            <strong className="us-card-value">
              {c.value} <small>{c.unit}</small>
            </strong>
          </article>
        ))}
      </section>

      <section className="us-panel">
        <div className="us-filters">
          <input
            className="input us-search"
            type="search"
            placeholder="ค้นหาชื่อ อีเมล เบอร์โทร หรือ LINE"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">ทุกสถานะ</option>
            <option value="active">ปกติ</option>
            <option value="suspended">ถูกระงับ</option>
            <option value="pending">รออนุมัติ</option>
          </select>
          <div className="us-tabs" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.key || 'all'}
                type="button"
                role="tab"
                aria-selected={role === t.key}
                className={'us-tab' + (role === t.key ? ' on' : '')}
                onClick={() => pickRole(t.key)}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
        </div>

        {error && <div className="us-error">{error}</div>}

        <div className="us-table-wrap">
          <table className="us-table">
            <thead>
              <tr>
                <th>ผู้ใช้</th>
                <th>อีเมล</th>
                <th>วันที่สมัคร</th>
                <th>บทบาท</th>
                <th>สถานะ</th>
                <th aria-label="จัดการ" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="us-empty">
                    กำลังโหลด...
                  </td>
                </tr>
              )}
              {!loading && data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="us-empty">
                    ไม่พบผู้ใช้ที่ค้นหา
                  </td>
                </tr>
              )}
              {!loading &&
                data.items.map((u) => {
                  const isMe = String(u._id) === String(me);
                  return (
                    <tr key={u._id}>
                      <td>
                        <div className="us-person">
                          <span className={'us-avatar ' + u.role} aria-hidden="true">
                            {u.username.charAt(0).toUpperCase()}
                          </span>
                          <div className="us-person-text">
                            <strong>
                              {u.username}
                              {isMe && <span className="us-me">คุณ</span>}
                            </strong>
                            <small className="us-muted">
                              รหัส #{String(u._id).slice(-6).toUpperCase()}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="us-email">{u.email}</td>
                      <td>
                        <div className="us-person-text">
                          <span>{formatDate(u.createdAt)}</span>
                          <small className="us-muted">{relativeDay(u.createdAt)}</small>
                        </div>
                      </td>
                      <td>
                        <span className={'us-role ' + u.role}>{roleLabel(u.role, roleList)}</span>
                        {u.tier && u.tier !== 'regular' && (
                          <small className="us-muted"> · {TIERS[u.tier] || u.tier}</small>
                        )}
                      </td>
                      <td>
                        <span className={'us-status ' + (u.status || 'active')}>
                          {STATUSES[u.status]?.label || u.status || 'ปกติ'}
                        </span>
                      </td>
                      <td className="us-actions">
                        <button
                          type="button"
                          className="us-btn"
                          disabled={isMe}
                          title={isMe ? 'เปลี่ยนบทบาทของตัวเองไม่ได้' : undefined}
                          onClick={() => setModal({ type: 'role', user: u })}
                        >
                          เปลี่ยนบทบาท
                        </button>
                        {u.status === 'suspended' ? (
                          <button
                            type="button"
                            className="us-btn"
                            disabled={isMe}
                            onClick={async () => {
                              try {
                                await unsuspendUser(u);
                                setNotice({ tone: 'ok', text: `ปลดระงับ ${u.username} แล้ว` });
                                load();
                                loadStats();
                              } catch (err) {
                                setError(err.message);
                              }
                            }}
                          >
                            ปลดระงับ
                          </button>
                        ) : u.status === 'pending' ? (
                          <button
                            type="button"
                            className="us-btn"
                            onClick={async () => {
                              try {
                                await approveUser(u);
                                setNotice({ tone: 'ok', text: `อนุมัติ ${u.username} แล้ว` });
                                load();
                                loadStats();
                              } catch (err) {
                                setError(err.message);
                              }
                            }}
                          >
                            อนุมัติ
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="us-btn us-btn-warn"
                            disabled={isMe}
                            onClick={() => setModal({ type: 'suspend', user: u })}
                          >
                            ระงับบัญชี
                          </button>
                        )}
                        <button
                          type="button"
                          className="us-btn us-btn-danger"
                          disabled={isMe}
                          title={isMe ? 'ลบบัญชีตัวเองไม่ได้' : undefined}
                          onClick={() => setModal({ type: 'delete', user: u })}
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="us-pager">
          <span className="us-muted">
            แสดง {from}–{to} จาก {data.total} บัญชี
          </span>
          <div className="us-pager-btns">
            <button
              type="button"
              className="us-pg"
              aria-label="หน้าก่อนหน้า"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              ‹
            </button>
            {pageList(page, pages).map((n) =>
              typeof n === 'string' ? (
                <span key={n} className="us-gap">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  className={'us-pg' + (n === page ? ' on' : '')}
                  aria-current={n === page ? 'page' : undefined}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ),
            )}
            <button
              type="button"
              className="us-pg"
              aria-label="หน้าถัดไป"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              ›
            </button>
          </div>
        </div>
      </section>

      {modal?.type === 'add' && (
        <AddUserModal onClose={() => setModal(null)} onDone={done} roles={roleList} />
      )}
      {modal?.type === 'role' && (
        <EditRoleModal
          user={modal.user}
          onClose={() => setModal(null)}
          onDone={done}
          roles={roleList}
        />
      )}
      {modal?.type === 'suspend' && (
        <SuspendModal user={modal.user} onClose={() => setModal(null)} onDone={done} />
      )}
      {modal?.type === 'delete' && (
        <DeleteModal
          user={modal.user}
          onClose={() => setModal(null)}
          onDone={(r) => done(r, { afterDelete: true })}
        />
      )}
    </div>
  );
}
