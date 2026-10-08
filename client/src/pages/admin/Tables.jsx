import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import './tables.css';

const STATUSES = {
  active: { label: 'เปิดใช้งาน', tone: 'available' },
  closed: { label: 'ปิดโต๊ะ', tone: 'occupied' },
};

const SHAPES = {
  rect: 'สี่เหลี่ยม',
  round: 'วงกลม',
};

const EMPTY_FORM = {
  code: '',
  name: '',
  zone: 'Main',
  capacity: 4,
  status: 'active',
  extraPerHour: 0,
  shape: 'rect',
  notes: '',
  position: { x: 5, y: 10, w: 18, h: 15 },
};

function errorText(err, fallback) {
  if (err.status === 409) return err.message || 'รหัสโต๊ะซ้ำ หรือมีคิวจองค้างอยู่';
  if (err.status === 400) return err.message || 'ข้อมูลไม่ถูกต้อง';
  if (err.status === 403) return 'ไม่มีสิทธิ์จัดการโต๊ะ (ต้องมีสิทธิ์ floor)';
  return err.message || fallback;
}

function Modal({ title, subtitle, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="tbl-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={'tbl-modal' + (wide ? ' wide' : '')}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tbl-modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          <button type="button" className="btn-ghost tbl-x" onClick={onClose} aria-label="ปิด">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TableForm({ initial, onSubmit, onCancel, saving, isEdit }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...initial }));
  const [err, setErr] = useState('');

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function setPos(key, value) {
    setForm((f) => ({
      ...f,
      position: { ...f.position, [key]: Number(value) || 0 },
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    const code = form.code.trim().toUpperCase();
    if (!code) {
      setErr('กรุณาระบุรหัสโต๊ะ');
      return;
    }
    if (!form.zone.trim()) {
      setErr('กรุณาระบุโซน');
      return;
    }
    if (!form.capacity || form.capacity < 1) {
      setErr('ความจุต้องอย่างน้อย 1 ที่นั่ง');
      return;
    }
    try {
      await onSubmit({
        code,
        name: form.name.trim(),
        zone: form.zone.trim(),
        capacity: Number(form.capacity),
        status: form.status,
        extraPerHour: Number(form.extraPerHour) || 0,
        shape: form.shape,
        notes: form.notes.trim(),
        position: {
          x: Number(form.position?.x) || 0,
          y: Number(form.position?.y) || 0,
          w: Number(form.position?.w) || 10,
          h: Number(form.position?.h) || 10,
        },
      });
    } catch (error) {
      setErr(errorText(error, 'บันทึกไม่สำเร็จ'));
    }
  }

  return (
    <form className="tbl-form" onSubmit={handleSubmit}>
      {err && <div className="form-error">{err}</div>}

      <div className="tbl-form-grid">
        <label>
          <span>รหัสโต๊ะ *</span>
          <input
            className="input"
            value={form.code}
            onChange={(e) => set('code', e.target.value.toUpperCase())}
            placeholder="เช่น A1, VIP1"
            maxLength={20}
            required
            disabled={isEdit}
          />
          {isEdit && <small className="muted">รหัสโต๊ะแก้ไม่ได้</small>}
        </label>

        <label>
          <span>ชื่อเรียก</span>
          <input
            className="input"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="เช่น Private Room 1"
            maxLength={60}
          />
        </label>

        <label>
          <span>โซน *</span>
          <input
            className="input"
            value={form.zone}
            onChange={(e) => set('zone', e.target.value)}
            placeholder="Main / VIP / Outdoor"
            maxLength={40}
            required
            list="zone-suggestions"
          />
        </label>

        <label>
          <span>ที่นั่ง (capacity) *</span>
          <input
            className="input"
            type="number"
            min={1}
            max={30}
            value={form.capacity}
            onChange={(e) => set('capacity', e.target.value)}
            required
          />
        </label>

        <label>
          <span>สถานะ</span>
          <select
            className="input"
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
          >
            <option value="active">เปิดใช้งาน</option>
            <option value="closed">ปิดโต๊ะ</option>
          </select>
        </label>

        <label>
          <span>รูปทรง</span>
          <select
            className="input"
            value={form.shape}
            onChange={(e) => set('shape', e.target.value)}
          >
            <option value="rect">สี่เหลี่ยม</option>
            <option value="round">วงกลม</option>
          </select>
        </label>

        <label>
          <span>ค่าเพิ่ม / ชม. (บาท)</span>
          <input
            className="input"
            type="number"
            min={0}
            max={10000}
            step={10}
            value={form.extraPerHour}
            onChange={(e) => set('extraPerHour', e.target.value)}
          />
        </label>

        <label className="tbl-span-2">
          <span>หมายเหตุ</span>
          <input
            className="input"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            maxLength={300}
            placeholder="เช่น ใกล้หน้าต่าง, มีปลั๊ก"
          />
        </label>
      </div>

      <details className="tbl-pos">
        <summary>ตำแหน่งบนผังร้าน (ไม่บังคับ)</summary>
        <div className="tbl-form-grid tbl-pos-grid">
          {['x', 'y', 'w', 'h'].map((k) => (
            <label key={k}>
              <span>{k.toUpperCase()} (%)</span>
              <input
                className="input"
                type="number"
                min={0}
                max={100}
                value={form.position?.[k] ?? 0}
                onChange={(e) => setPos(k, e.target.value)}
              />
            </label>
          ))}
        </div>
      </details>

      <div className="tbl-form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
          ยกเลิก
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มโต๊ะ'}
        </button>
      </div>
    </form>
  );
}

export default function Tables() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [modal, setModal] = useState(null); // null | 'create' | table object (edit)
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const query = {};
      if (zoneFilter) query.zone = zoneFilter;
      if (statusFilter) query.status = statusFilter;
      const list = await api('/tables', { query });
      const rows = Array.isArray(list) ? list : (list?.items ?? list?.tables ?? []);
      setItems(rows);
    } catch (err) {
      setError(errorText(err, 'โหลดรายการโต๊ะไม่สำเร็จ'));
    } finally {
      setLoading(false);
    }
  }, [zoneFilter, statusFilter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const zones = useMemo(() => {
    const set = new Set(items.map((t) => t.zone).filter(Boolean));
    return [...set].sort();
  }, [items]);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (!text) return items;
    return items.filter(
      (t) =>
        t.code?.toLowerCase().includes(text) ||
        t.name?.toLowerCase().includes(text) ||
        t.zone?.toLowerCase().includes(text) ||
        t.notes?.toLowerCase().includes(text),
    );
  }, [items, q]);

  const stats = useMemo(() => {
    const active = items.filter((t) => t.status === 'active').length;
    const closed = items.filter((t) => t.status === 'closed').length;
    const seats = items.reduce((s, t) => s + (Number(t.capacity) || 0), 0);
    return { total: items.length, active, closed, seats };
  }, [items]);

  async function handleCreate(body) {
    setSaving(true);
    try {
      await api('/tables', { method: 'POST', body });
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(body) {
    if (!modal?._id) return;
    setSaving(true);
    try {
      // code แก้ไม่ได้ — ส่งเฉพาะ field ที่แก้ได้
      const { code: _c, ...rest } = body;
      await api(`/tables/${modal._id}`, { method: 'PUT', body: rest });
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(t) {
    const next = t.status === 'active' ? 'closed' : 'active';
    const label = next === 'closed' ? 'ปิดโต๊ะ' : 'เปิดโต๊ะ';
    if (!window.confirm(`${label} ${t.code}?`)) return;
    setBusyId(t._id);
    setError('');
    try {
      await api(`/tables/${t._id}/status`, { method: 'PATCH', body: { status: next } });
      await load();
    } catch (err) {
      setError(errorText(err, 'เปลี่ยนสถานะไม่สำเร็จ'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(t) {
    if (
      !window.confirm(`ลบโต๊ะ ${t.code}?\nถ้ามีคิวจองค้างอยู่ ระบบจะไม่อนุญาตให้ลบ (ปิดโต๊ะแทนได้)`)
    ) {
      return;
    }
    setBusyId(t._id);
    setError('');
    try {
      await api(`/tables/${t._id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(errorText(err, 'ลบโต๊ะไม่สำเร็จ'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="tables-page">
      <div className="page-head">
        <div>
          <h1>จัดการโต๊ะ</h1>
          <p className="muted">เพิ่ม แก้ไข เปิด/ปิด และลบโต๊ะในร้าน — ใช้กับผังจองและ walk-in</p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn-ghost" onClick={() => load()} disabled={loading}>
            รีเฟรช
          </button>
          <button type="button" className="btn-primary" onClick={() => setModal('create')}>
            + เพิ่มโต๊ะ
          </button>
        </div>
      </div>

      <div className="tbl-stats">
        <div className="tbl-stat">
          <span className="tbl-stat-n">{stats.total}</span>
          <span className="muted">โต๊ะทั้งหมด</span>
        </div>
        <div className="tbl-stat tone-available">
          <span className="tbl-stat-n">{stats.active}</span>
          <span className="muted">เปิดใช้งาน</span>
        </div>
        <div className="tbl-stat tone-occupied">
          <span className="tbl-stat-n">{stats.closed}</span>
          <span className="muted">ปิดโต๊ะ</span>
        </div>
        <div className="tbl-stat">
          <span className="tbl-stat-n">{stats.seats}</span>
          <span className="muted">ที่นั่งรวม</span>
        </div>
      </div>

      <div className="toolbar tbl-toolbar">
        <input
          className="input"
          type="search"
          placeholder="ค้นหารหัส ชื่อ โซน..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="input"
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
        >
          <option value="">ทุกโซน</option>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">ทุกสถานะ</option>
          <option value="active">เปิดใช้งาน</option>
          <option value="closed">ปิดโต๊ะ</option>
        </select>
      </div>

      {error && <div className="form-error">{error}</div>}

      <section className="panel tbl-panel">
        {loading && <p className="muted">กำลังโหลด...</p>}
        {!loading && filtered.length === 0 && (
          <p className="muted">ยังไม่มีโต๊ะ — กด「เพิ่มโต๊ะ」หรือรัน seed:tables</p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="tbl-table-wrap">
            <table className="tbl-table">
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>ชื่อ</th>
                  <th>โซน</th>
                  <th>ที่นั่ง</th>
                  <th>รูปทรง</th>
                  <th>ค่าเพิ่ม/ชม.</th>
                  <th>สถานะ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const st = STATUSES[t.status] ?? { label: t.status, tone: 'maintenance' };
                  const busy = busyId === t._id;
                  return (
                    <tr key={t._id} className={t.status === 'closed' ? 'is-dim' : ''}>
                      <td>
                        <strong className="tbl-code">{t.code}</strong>
                      </td>
                      <td>{t.name || '—'}</td>
                      <td>
                        <span className="chip tone-maintenance">{t.zone}</span>
                      </td>
                      <td>{t.capacity}</td>
                      <td>{SHAPES[t.shape] ?? t.shape}</td>
                      <td>{t.extraPerHour ? `฿${t.extraPerHour}` : '—'}</td>
                      <td>
                        <span className={`chip tone-${st.tone}`}>{st.label}</span>
                      </td>
                      <td className="tbl-actions">
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={busy}
                          onClick={() => setModal(t)}
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={busy}
                          onClick={() => toggleStatus(t)}
                        >
                          {t.status === 'active' ? 'ปิดโต๊ะ' : 'เปิดโต๊ะ'}
                        </button>
                        <button
                          type="button"
                          className="btn-danger"
                          disabled={busy}
                          onClick={() => handleDelete(t)}
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
        )}
      </section>

      {/* zone suggestions for create/edit */}
      <datalist id="zone-suggestions">
        {['Main', 'VIP', 'Outdoor', ...zones]
          .filter((v, i, a) => a.indexOf(v) === i)
          .map((z) => (
            <option key={z} value={z} />
          ))}
      </datalist>

      {modal === 'create' && (
        <Modal
          title="เพิ่มโต๊ะใหม่"
          subtitle="รหัสโต๊ะต้องไม่ซ้ำ — ใช้กับผังจองและ walk-in"
          onClose={() => !saving && setModal(null)}
          wide
        >
          <TableForm
            initial={EMPTY_FORM}
            onSubmit={handleCreate}
            onCancel={() => setModal(null)}
            saving={saving}
            isEdit={false}
          />
        </Modal>
      )}

      {modal && modal !== 'create' && (
        <Modal
          title={`แก้ไขโต๊ะ ${modal.code}`}
          subtitle={modal.name || modal.zone}
          onClose={() => !saving && setModal(null)}
          wide
        >
          <TableForm
            initial={{
              ...EMPTY_FORM,
              ...modal,
              position: modal.position || EMPTY_FORM.position,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setModal(null)}
            saving={saving}
            isEdit
          />
        </Modal>
      )}
    </div>
  );
}
