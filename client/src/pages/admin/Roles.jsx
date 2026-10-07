import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import './roles.css';

const EMPTY_PERM = (key) => ({ key, view: false, edit: false, del: false, approve: false });

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [perms, setPerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/roles');
      setRoles(data?.items ?? []);
      setCatalog(data?.catalog ?? []);
      if (!selected && data?.items?.[0]) setSelected(data.items[0]._id);
    } catch (err) {
      setError(err.message || 'โหลดบทบาทไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [selected]);

  const loadDetail = useCallback(
    async (id) => {
      if (!id) return;
      try {
        const d = await api(`/roles/${id}`);
        setDetail(d);
        const map = Object.fromEntries((d.permissions || []).map((p) => [p.key, p]));
        const keys = catalog.length ? catalog.map((c) => c.key) : Object.keys(map);
        setPerms(
          (catalog.length ? catalog : keys.map((k) => ({ key: k, label: k }))).map((c) => ({
            key: c.key,
            label: c.label || c.key,
            view: !!map[c.key]?.view,
            edit: !!map[c.key]?.edit,
            del: !!map[c.key]?.del,
            approve: !!map[c.key]?.approve,
          })),
        );
      } catch (err) {
        setError(err.message);
      }
    },
    [catalog],
  );

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (selected) loadDetail(selected);
  }, [selected, catalog, loadDetail]);

  function toggle(key, field) {
    setPerms((prev) => prev.map((p) => (p.key === key ? { ...p, [field]: !p[field] } : p)));
  }

  async function savePermissions() {
    if (!selected) return;
    setSaving(true);
    setMsg('');
    setError('');
    try {
      await api(`/roles/${selected}/permissions`, {
        method: 'PUT',
        body: {
          permissions: perms.map(({ key, view, edit, del, approve }) => ({
            key,
            view,
            edit,
            del,
            approve,
          })),
        },
      });
      setMsg('บันทึกสิทธิ์แล้ว');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function createRole(e) {
    e.preventDefault();
    setError('');
    try {
      const role = await api('/roles', {
        method: 'POST',
        body: {
          name: form.name,
          slug: form.slug || undefined,
          description: form.description,
          permissions: catalog.map((c) => EMPTY_PERM(c.key)),
        },
      });
      setShowCreate(false);
      setForm({ name: '', slug: '', description: '' });
      await load();
      setSelected(role._id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeRole() {
    if (!selected || !detail) return;
    if (detail.isSystem) {
      setError('ลบ system role ไม่ได้');
      return;
    }
    if (!confirm(`ลบบทบาท "${detail.name}" ?`)) return;
    try {
      await api(`/roles/${selected}`, { method: 'DELETE' });
      setSelected(null);
      setDetail(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeMember(userId) {
    try {
      await api(`/roles/${selected}/members/${userId}`, { method: 'DELETE' });
      loadDetail(selected);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="roles">
      <div className="page-head">
        <div>
          <p className="muted">จัดการสิทธิ์การเข้าถึง</p>
          <h1>
            บทบาท & สิทธิ์ <span className="title-en">Roles & Permissions</span>
          </h1>
        </div>
        <button type="button" className="btn primary" onClick={() => setShowCreate(true)}>
          + เพิ่มบทบาท
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}
      {msg && <div className="ok-box">{msg}</div>}

      {loading ? (
        <p className="muted">กำลังโหลด...</p>
      ) : (
        <div className="roles-grid">
          <aside className="roles-list">
            <h3>รายชื่อบทบาท ({roles.length})</h3>
            {roles.map((r) => (
              <button
                type="button"
                key={r._id}
                className={'role-card' + (selected === r._id ? ' active' : '')}
                onClick={() => setSelected(r._id)}
              >
                <strong>{r.name}</strong>
                <span className="muted">{r.slug}</span>
                {r.isSystem && <span className="sys-badge">system</span>}
                <span className="member-count">{r.memberCount ?? 0} คน</span>
              </button>
            ))}
          </aside>

          <section className="roles-detail">
            {!detail ? (
              <p className="muted">เลือกบทบาททางซ้าย</p>
            ) : (
              <>
                <div className="detail-head">
                  <div>
                    <h2>{detail.name}</h2>
                    <p className="muted">{detail.description || detail.slug}</p>
                  </div>
                  {!detail.isSystem && (
                    <button type="button" className="btn danger" onClick={removeRole}>
                      ลบบทบาท
                    </button>
                  )}
                </div>

                <h3>สิทธิ์ตามโมดูล</h3>
                <div className="perm-table-wrap">
                  <table className="perm-table">
                    <thead>
                      <tr>
                        <th>ฟีเจอร์</th>
                        <th>ดู</th>
                        <th>แก้</th>
                        <th>ลบ</th>
                        <th>อนุมัติ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perms.map((p) => (
                        <tr key={p.key}>
                          <td>{p.label || p.key}</td>
                          {['view', 'edit', 'del', 'approve'].map((f) => (
                            <td key={f}>
                              <input
                                type="checkbox"
                                checked={!!p[f]}
                                onChange={() => toggle(p.key, f)}
                                disabled={detail.isSystem && detail.slug === 'admin'}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!(detail.isSystem && detail.slug === 'admin') && (
                  <button
                    type="button"
                    className="btn primary"
                    disabled={saving}
                    onClick={savePermissions}
                  >
                    {saving ? 'กำลังบันทึก...' : 'บันทึกสิทธิ์'}
                  </button>
                )}

                <h3 style={{ marginTop: 28 }}>สมาชิกในบทบาทนี้</h3>
                <div className="members">
                  {(detail.members || []).length === 0 && (
                    <p className="muted">ยังไม่มีสมาชิก (กำหนด role ให้ user จากหน้า Users)</p>
                  )}
                  {(detail.members || []).map((u) => (
                    <div key={u._id} className="member-row">
                      <span>{u.displayName || u.username}</span>
                      <span className="muted">{u.email}</span>
                      <button type="button" className="btn sm" onClick={() => removeMember(u._id)}>
                        ถอด
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {showCreate && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && setShowCreate(false)}
        >
          <form className="modal" onSubmit={createRole}>
            <h2>สร้างบทบาทใหม่</h2>
            <label>
              ชื่อ
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label>
              Slug (ภาษาอังกฤษ)
              <input
                placeholder="เช่น game-master"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </label>
            <label>
              คำอธิบาย
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setShowCreate(false)}>
                ยกเลิก
              </button>
              <button type="submit" className="btn primary">
                สร้าง
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
