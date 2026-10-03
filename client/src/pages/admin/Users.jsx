import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import './users.css';

const LIMIT = 20;
const ROLE_TH = { admin: 'ผู้ดูแล (admin)', user: 'สมาชิก (user)' };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function currentUserId() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    return u?.id ?? u?._id ?? null;
  } catch {
    return null;
  }
}

/** หน้าจัดการผู้ใช้ — ใช้ GET /admin/users, PUT /admin/users/:id/role, DELETE /admin/users/:id */
export default function Users() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState(''); // ค่า q ที่ debounce แล้ว
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const me = currentUserId();

  // หน่วงการพิมพ์ค้นหา 300ms
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/admin/users', {
        query: { q: search, role, page, limit: LIMIT },
      });
      setData({ items: res.items ?? [], total: res.total ?? 0 });
    } catch (err) {
      setError(err.message || 'โหลดรายชื่อผู้ใช้ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [search, role, page]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(data.total / LIMIT));

  async function changeRole(u, next) {
    if (next === u.role) return;
    const msg =
      next === 'admin'
        ? `ให้สิทธิ์ผู้ดูแลระบบแก่ "${u.username}"?`
        : `ถอดสิทธิ์ผู้ดูแลระบบของ "${u.username}"?`;
    if (!window.confirm(msg)) return;
    setBusyId(u._id);
    setError('');
    try {
      const updated = await api(`/admin/users/${u._id}/role`, {
        method: 'PUT',
        body: { role: next },
      });
      setData((d) => ({
        ...d,
        items: d.items.map((x) => (x._id === u._id ? { ...x, role: updated.role } : x)),
      }));
    } catch (err) {
      setError(err.message || 'เปลี่ยนสิทธิ์ไม่สำเร็จ');
    } finally {
      setBusyId('');
    }
  }

  async function remove(u) {
    if (!window.confirm(`ลบผู้ใช้ "${u.username}" ถาวร? การกระทำนี้ย้อนกลับไม่ได้`)) return;
    setBusyId(u._id);
    setError('');
    try {
      await api(`/admin/users/${u._id}`, { method: 'DELETE' });
      // ลบรายการสุดท้ายของหน้า → ถอยกลับหน้าก่อนหน้า
      if (data.items.length === 1 && page > 1) setPage(page - 1);
      else await load();
    } catch (err) {
      setError(err.message || 'ลบผู้ใช้ไม่สำเร็จ');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="us">
      <div className="page-head">
        <div>
          <h1>จัดการผู้ใช้ (Users)</h1>
          <p className="muted">ค้นหา กำหนดสิทธิ์ และลบบัญชีสมาชิกของร้าน</p>
        </div>
        <span className="chip tone-available">ทั้งหมด {data.total} บัญชี</span>
      </div>

      <section className="panel">
        <div className="us-filters">
          <input
            className="input us-search"
            type="search"
            placeholder="ค้นหาชื่อผู้ใช้หรืออีเมล"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="input us-role-filter"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">ทุกสิทธิ์</option>
            <option value="admin">ผู้ดูแล (admin)</option>
            <option value="user">สมาชิก (user)</option>
          </select>
        </div>

        {error && <div className="us-error">{error}</div>}

        <div className="us-table-wrap">
          <table className="us-table">
            <thead>
              <tr>
                <th>ผู้ใช้</th>
                <th>อีเมล</th>
                <th>สิทธิ์</th>
                <th>สมัครเมื่อ</th>
                <th aria-label="จัดการ" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="us-empty">
                    กำลังโหลด...
                  </td>
                </tr>
              )}
              {!loading && data.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="us-empty">
                    ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข
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
                          <span className="us-avatar" aria-hidden="true">
                            {u.username.charAt(0).toUpperCase()}
                          </span>
                          <strong>{u.username}</strong>
                          {isMe && <span className="chip tone-available">คุณ</span>}
                        </div>
                      </td>
                      <td className="us-email">{u.email}</td>
                      <td>
                        <select
                          className="us-role-select"
                          value={u.role}
                          disabled={isMe || busyId === u._id}
                          title={isMe ? 'ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้' : undefined}
                          onChange={(e) => changeRole(u, e.target.value)}
                        >
                          {Object.entries(ROLE_TH).map(([v, label]) => (
                            <option key={v} value={v}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="us-date">{formatDate(u.createdAt)}</td>
                      <td className="us-actions">
                        <button
                          type="button"
                          className="us-delete"
                          disabled={isMe || busyId === u._id}
                          title={isMe ? 'ไม่สามารถลบบัญชีตัวเองได้' : 'ลบผู้ใช้'}
                          onClick={() => remove(u)}
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
          <span className="muted">
            หน้า {page} / {pages}
          </span>
          <div className="us-pager-btns">
            <button
              type="button"
              className="btn-ghost"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              ← ก่อนหน้า
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              ถัดไป →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
