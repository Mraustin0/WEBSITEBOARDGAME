import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import FieldError from '../../components/FieldError.jsx';
import { useFieldErrors } from '../../lib/useFieldErrors.js';
import { vNumber, vTableCode, vText } from '../../lib/validate.js';
import './tables.css';

const STATUSES = {
  active: { label: 'เปิดใช้งาน', tone: 'available' },
  closed: { label: 'ปิดใช้งาน', tone: 'occupied' },
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
  if (err.status === 403) return 'ไม่มีสิทธิ์จัดการโต๊ะ (ต้องมีสิทธิ์ผังโต๊ะและการจอง)';
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

const POS_KEYS = ['x', 'y', 'w', 'h'];
const POS_LABEL = { x: 'แนวนอน', y: 'แนวตั้ง', w: 'กว้าง', h: 'สูง' };

// กฎเดียวกับ tables.schema.js
const tableRules = (f, isEdit) => ({
  code: isEdit ? '' : vTableCode(f.code),
  name: vText(f.name, { max: 60, label: 'ชื่อโต๊ะ' }),
  zone: vText(f.zone, { required: true, max: 40, label: 'โซน' }),
  capacity: vNumber(f.capacity, { min: 1, max: 30, integer: true, label: 'จำนวนที่นั่ง' }),
  extraPerHour: vNumber(f.extraPerHour, { min: 0, max: 10000, label: 'ค่าโต๊ะเพิ่ม' }),
  notes: vText(f.notes, { max: 300, label: 'หมายเหตุ' }),
  ...Object.fromEntries(
    POS_KEYS.map((k) => [
      `position.${k}`,
      vNumber(f.position?.[k], { min: 0, max: 100, required: false, label: POS_LABEL[k] }),
    ]),
  ),
});

function TableForm({ initial, onSubmit, onCancel, saving, isEdit }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...initial }));
  const [err, setErr] = useState('');
  const posRef = useRef(null);
  const v = useFieldErrors(form, (f) => tableRules(f, isEdit));

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function setPos(key, value) {
    setForm((f) => ({
      ...f,
      position: { ...f.position, [key]: value },
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    const all = tableRules(form, isEdit);
    // ช่องตำแหน่งอยู่ใน <details> — เปิดก่อนโฟกัสช่องที่ผิด
    if (posRef.current && POS_KEYS.some((k) => all[`position.${k}`])) posRef.current.open = true;
    if (!v.submit()) return;
    const code = form.code.trim().toUpperCase();
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
      if ((error.status === 400 || error.status === 409) && v.server(error)) return;
      setErr(errorText(error, 'บันทึกไม่สำเร็จ'));
    }
  }

  const fe = (k) => <FieldError variant="admin" id={v.errId(k)} msg={v.errors[k]} />;

  return (
    <form className="tbl-form" onSubmit={handleSubmit} noValidate>
      {err && <div className="form-error">{err}</div>}

      <div className="tbl-form-grid">
        <label>
          <span>รหัสโต๊ะ *</span>
          <input
            className="input"
            value={form.code}
            onChange={(e) => set('code', e.target.value.toUpperCase())}
            placeholder="เช่น A1, VIP-2"
            maxLength={10}
            autoCapitalize="characters"
            spellCheck={false}
            required
            disabled={isEdit}
            {...v.bind('code')}
          />
          {isEdit && <small className="muted">รหัสโต๊ะแก้ไม่ได้</small>}
          {fe('code')}
        </label>

        <label>
          <span>ชื่อเรียก</span>
          <input
            className="input"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="เช่น ห้องส่วนตัว 1"
            maxLength={60}
            {...v.bind('name')}
          />
          {fe('name')}
        </label>

        <label>
          <span>โซน *</span>
          <input
            className="input"
            value={form.zone}
            onChange={(e) => set('zone', e.target.value)}
            placeholder="เช่น Main, VIP, Outdoor"
            maxLength={40}
            required
            list="zone-suggestions"
            {...v.bind('zone')}
          />
          {fe('zone')}
        </label>

        <label>
          <span>จำนวนที่นั่ง *</span>
          <input
            className="input"
            type="number"
            min={1}
            max={30}
            step={1}
            inputMode="numeric"
            value={form.capacity}
            onChange={(e) => set('capacity', e.target.value)}
            required
            {...v.bind('capacity')}
          />
          {fe('capacity')}
        </label>

        <label>
          <span>สถานะ</span>
          <select
            className="input"
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
          >
            <option value="active">เปิดใช้งาน</option>
            <option value="closed">ปิดใช้งาน</option>
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
          <span>ค่าโต๊ะเพิ่ม (฿/ชม.)</span>
          <input
            className="input"
            type="number"
            min={0}
            max={10000}
            step={10}
            inputMode="decimal"
            value={form.extraPerHour}
            onChange={(e) => set('extraPerHour', e.target.value)}
            {...v.bind('extraPerHour')}
          />
          {fe('extraPerHour')}
        </label>

        <label className="tbl-span-2">
          <span>หมายเหตุ</span>
          <input
            className="input"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            maxLength={300}
            placeholder="เช่น ใกล้หน้าต่าง, มีปลั๊ก"
            {...v.bind('notes')}
          />
          {fe('notes')}
        </label>
      </div>

      <details className="tbl-pos" ref={posRef}>
        <summary>ตำแหน่งบนผังโต๊ะ (ไม่บังคับ)</summary>
        <div className="tbl-form-grid tbl-pos-grid">
          {POS_KEYS.map((k) => (
            <label key={k}>
              <span>{POS_LABEL[k]} (%)</span>
              <input
                className="input"
                type="number"
                min={0}
                max={100}
                inputMode="decimal"
                value={form.position?.[k] ?? ''}
                onChange={(e) => setPos(k, e.target.value)}
                {...v.bind(`position.${k}`)}
              />
              {fe(`position.${k}`)}
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
    const label = next === 'closed' ? 'ปิดใช้งาน' : 'เปิดใช้งาน';
    if (!window.confirm(`${label}โต๊ะ ${t.code}?`)) return;
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
    if (!window.confirm(`ลบโต๊ะ ${t.code}?\nถ้ายังมีคิวจองค้างอยู่จะลบไม่ได้ ให้ปิดใช้งานแทน`)) {
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
          <p className="muted">เพิ่ม แก้ไข ปิดใช้งาน และลบโต๊ะในร้าน</p>
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
          <span className="muted">ปิดใช้งาน</span>
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
          placeholder="ค้นหารหัส ชื่อ หรือโซน"
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
          <option value="closed">ปิดใช้งาน</option>
        </select>
      </div>

      {error && <div className="form-error">{error}</div>}

      <section className="panel tbl-panel">
        {loading && <p className="muted">กำลังโหลด...</p>}
        {!loading && filtered.length === 0 && (
          <p className="muted">ยังไม่มีโต๊ะ กด “+ เพิ่มโต๊ะ” เพื่อเริ่ม</p>
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
                          {t.status === 'active' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
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
          title="เพิ่มโต๊ะ"
          subtitle="รหัสโต๊ะต้องไม่ซ้ำกับโต๊ะอื่น"
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
