import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';
import { toISO } from '../../../lib/date.js';

// ฟอร์ม "+ เพิ่มการจองใหม่" -> POST /api/reservations/admin (ส่ง startAt = จองล่วงหน้าแทนลูกค้า)
export default function NewBookingModal({ date, onClose, onCreated }) {
  const [tables, setTables] = useState([]);
  const [form, setForm] = useState({
    table: '',
    date,
    time: '13:00',
    players: 4,
    durationHours: 2,
    package: 'hourly',
    name: '',
    phone: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    api('/tables')
      .then((d) => setTables(Array.isArray(d) ? d : (d?.items ?? d?.tables ?? [])))
      .catch(() => setError('โหลดรายชื่อโต๊ะไม่สำเร็จ'));
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const fe = (key) => fieldErrors[key]?.[0];

  async function submit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!form.table) return setFieldErrors({ table: ['เลือกโต๊ะ'] });
    if (!form.name.trim() && !form.phone.trim()) {
      return setFieldErrors({ customer: ['กรอกชื่อหรือเบอร์โทรลูกค้าอย่างน้อยหนึ่งอย่าง'] });
    }

    const body = {
      table: form.table,
      players: Number(form.players),
      durationHours: form.package === 'flat3h' ? 3 : Number(form.durationHours),
      package: form.package,
      startAt: toISO(form.date, form.time),
      game: null,
      customer: { name: form.name.trim() || undefined, phone: form.phone.trim() || undefined },
    };

    setSaving(true);
    try {
      await api('/reservations/admin', { method: 'POST', body });
      onCreated();
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.details ?? {});
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nb-title"
        onSubmit={submit}
      >
        <h2 id="nb-title">เพิ่มการจองใหม่</h2>

        {error && <div className="form-error">{error}</div>}

        <label className="field">
          <span>โต๊ะ</span>
          <select className="input" value={form.table} onChange={set('table')}>
            <option value="">เลือกโต๊ะ</option>
            {tables.map((t) => (
              <option key={t._id} value={t._id}>
                {t.code} {t.name ? `– ${t.name}` : ''} ({t.capacity} ที่นั่ง)
              </option>
            ))}
          </select>
          {fe('table') && <small className="field-error">{fe('table')}</small>}
        </label>

        <div className="field-row">
          <label className="field">
            <span>วันที่</span>
            <input className="input" type="date" value={form.date} onChange={set('date')} />
          </label>
          <label className="field">
            <span>เวลาเริ่ม</span>
            <input className="input" type="time" value={form.time} onChange={set('time')} />
          </label>
        </div>
        {fe('startAt') && <small className="field-error">{fe('startAt')}</small>}

        <div className="field-row">
          <label className="field">
            <span>จำนวนผู้เล่น</span>
            <input
              className="input"
              type="number"
              min="1"
              value={form.players}
              onChange={set('players')}
            />
            {fe('players') && <small className="field-error">{fe('players')}</small>}
          </label>
          <label className="field">
            <span>ระยะเวลา (ชม.)</span>
            <input
              className="input"
              type="number"
              min="1"
              max="6"
              step="0.5"
              disabled={form.package === 'flat3h'}
              value={form.package === 'flat3h' ? 3 : form.durationHours}
              onChange={set('durationHours')}
            />
            {fe('durationHours') && <small className="field-error">{fe('durationHours')}</small>}
          </label>
        </div>

        <label className="field">
          <span>แพ็กเกจ</span>
          <select className="input" value={form.package} onChange={set('package')}>
            <option value="hourly">รายชั่วโมง</option>
            <option value="flat3h">เหมา 3 ชั่วโมง</option>
          </select>
        </label>

        <div className="field-row">
          <label className="field">
            <span>ชื่อลูกค้า</span>
            <input className="input" value={form.name} onChange={set('name')} />
          </label>
          <label className="field">
            <span>เบอร์โทร</span>
            <input className="input" value={form.phone} onChange={set('phone')} />
          </label>
        </div>
        {fe('customer') && <small className="field-error">{fe('customer')}</small>}

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            ปิด
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึกการจอง'}
          </button>
        </div>
      </form>
    </div>
  );
}
