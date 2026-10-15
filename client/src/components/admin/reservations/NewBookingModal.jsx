import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';
import { toISO } from '../../../lib/date.js';
import FieldError from '../../FieldError.jsx';
import { useFieldErrors } from '../../../lib/useFieldErrors.js';
import { normalizePhone, vNumber, vPersonName, vPhone } from '../../../lib/validate.js';

const NEED_CUSTOMER = 'กรอกชื่อหรือเบอร์โทรลูกค้าอย่างน้อย 1 อย่าง';

// กฎตาม adminBookingBody (reservations.schema.js)
const rules = (f) => ({
  table: f.table ? '' : 'เลือกโต๊ะ',
  date: /^\d{4}-\d{2}-\d{2}$/.test(f.date ?? '') ? '' : 'เลือกวันที่',
  time: /^([01]\d|2[0-3]):[0-5]\d$/.test(f.time ?? '') ? '' : 'เลือกเวลาเริ่ม',
  players: vNumber(f.players, { min: 1, max: 30, integer: true, label: 'จำนวนผู้เล่น' }),
  durationHours:
    f.package === 'flat3h'
      ? ''
      : vNumber(f.durationHours, { min: 0.5, max: 12, label: 'ระยะเวลา' }) ||
        (Number.isInteger(Number(f.durationHours) * 2) ? '' : 'ระยะเวลาต้องเพิ่มทีละครึ่งชั่วโมง'),
  name: vPersonName(f.name) || (!f.name.trim() && !normalizePhone(f.phone) ? NEED_CUSTOMER : ''),
  phone: vPhone(f.phone),
});
// field ของ server → ช่องในฟอร์ม
const SERVER_MAP = { customer: 'name', startAt: 'date' };

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
  const v = useFieldErrors(form, rules);

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
  const fe = (key) => <FieldError variant="admin" id={v.errId(key)} msg={v.errors[key]} />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!v.submit()) return;

    const body = {
      table: form.table,
      players: Number(form.players),
      durationHours: form.package === 'flat3h' ? 3 : Number(form.durationHours),
      package: form.package,
      startAt: toISO(form.date, form.time),
      game: null,
      customer: {
        name: form.name.trim() || undefined,
        phone: normalizePhone(form.phone) || undefined,
      },
    };

    setSaving(true);
    try {
      await api('/reservations/admin', { method: 'POST', body });
      onCreated();
    } catch (err) {
      if (!(err.status === 400 && v.server(err, { map: SERVER_MAP }))) setError(err.message);
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
        noValidate
      >
        <h2 id="nb-title">เพิ่มการจอง</h2>

        {error && <div className="form-error">{error}</div>}

        <label className="field">
          <span>โต๊ะ</span>
          <select className="input" value={form.table} onChange={set('table')} {...v.bind('table')}>
            <option value="">เลือกโต๊ะ</option>
            {tables.map((t) => (
              <option key={t._id} value={t._id}>
                {t.code} {t.name ? `– ${t.name}` : ''} ({t.capacity} ที่นั่ง)
              </option>
            ))}
          </select>
          {fe('table')}
        </label>

        <div className="field-row">
          <label className="field">
            <span>วันที่</span>
            <input
              className="input"
              type="date"
              value={form.date}
              onChange={set('date')}
              {...v.bind('date')}
            />
            {fe('date')}
          </label>
          <label className="field">
            <span>เวลาเริ่ม</span>
            <input
              className="input"
              type="time"
              value={form.time}
              onChange={set('time')}
              {...v.bind('time')}
            />
            {fe('time')}
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>จำนวนผู้เล่น</span>
            <input
              className="input"
              type="number"
              min="1"
              max="30"
              inputMode="numeric"
              value={form.players}
              onChange={set('players')}
              {...v.bind('players')}
            />
            {fe('players')}
          </label>
          <label className="field">
            <span>ระยะเวลา (ชม.)</span>
            <input
              className="input"
              type="number"
              min="0.5"
              max="12"
              step="0.5"
              inputMode="decimal"
              disabled={form.package === 'flat3h'}
              value={form.package === 'flat3h' ? 3 : form.durationHours}
              onChange={set('durationHours')}
              {...v.bind('durationHours')}
            />
            {fe('durationHours')}
          </label>
        </div>

        <label className="field">
          <span>แพ็กเกจ</span>
          <select className="input" value={form.package} onChange={set('package')}>
            <option value="hourly">รายชั่วโมง</option>
            <option value="flat3h">เหมา 3 ชม.</option>
          </select>
        </label>

        <div className="field-row">
          <label className="field">
            <span>ชื่อลูกค้า</span>
            <input
              className="input"
              maxLength={80}
              autoComplete="off"
              value={form.name}
              onChange={set('name')}
              {...v.bind('name')}
            />
            {fe('name')}
          </label>
          <label className="field">
            <span>เบอร์โทร</span>
            <input
              className="input"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              maxLength={15}
              placeholder="0812345678"
              value={form.phone}
              onChange={set('phone')}
              {...v.bind('phone')}
            />
            {fe('phone')}
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            ยกเลิก
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึกการจอง'}
          </button>
        </div>
      </form>
    </div>
  );
}
