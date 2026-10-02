import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import './settings.css';

const GROUPS = {
  store: 'ข้อมูลร้าน',
  pricing: 'อัตราค่าบริการ',
  booking: 'กติกาการจอง',
  operatingHours: 'เวลาทำการ',
  noShow: 'นโยบาย No-show',
};
const DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const ORDER = [1, 2, 3, 4, 5, 6, 0]; // แสดงจันทร์ -> อาทิตย์ (API: 0 = อาทิตย์)
const TIME_RE = /^([01]\d|2[0-4]):[0-5]\d$/; // รับ 24:00 ด้วย เพราะข้อมูลจริงใช้ปิด 24:00
const clone = (o) => JSON.parse(JSON.stringify(o));

// เติมค่าที่ขาด เพื่อให้ช่องกรอกทุกช่องมีค่าเสมอ และเวลาทำการครบ 7 วัน
function normalize(s) {
  const out = clone(s ?? {});
  for (const g of Object.keys(GROUPS)) out[g] = out[g] ?? {};
  const days = out.operatingHours.days ?? [];
  out.operatingHours.days = [0, 1, 2, 3, 4, 5, 6].map(
    (d) =>
      days.find((x) => x.day === d) ?? { day: d, open: '10:00', close: '22:00', closed: false },
  );
  return out;
}

// แปลง err.details (โครงสร้างไม่ตายตัว) ให้เป็นข้อความอ่านง่าย
function fmtDetails(d) {
  if (!d || typeof d !== 'object') return '';
  return Object.entries(d)
    .map(
      ([k, v]) =>
        `${k}: ${typeof v === 'object' && !Array.isArray(v) ? JSON.stringify(v) : [].concat(v).join(', ')}`,
    )
    .join(' • ');
}

function Num({ label, unit, value, onChange, step = 1, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="st-unit">
        <input
          className="input"
          type="number"
          min="0"
          step={step}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
        {unit && <em>{unit}</em>}
      </div>
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}

// หน้า 6 ตั้งค่าร้าน: GET /settings (โหลด) / PUT /settings (บันทึก เฉพาะหมวดที่แก้)
export default function Settings() {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const s = normalize(await api('/settings'));
      setSaved(s);
      setForm(clone(s));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!form)
    return (
      <div className="panel">
        {error ? <div className="form-error">{error}</div> : 'กำลังโหลดการตั้งค่า...'}
      </div>
    );

  const set = (g, k) => (v) => setForm((f) => ({ ...f, [g]: { ...f[g], [k]: v } }));
  const setDay = (day, patch) =>
    setForm((f) => ({
      ...f,
      operatingHours: {
        ...f.operatingHours,
        days: f.operatingHours.days.map((d) => (d.day === day ? { ...d, ...patch } : d)),
      },
    }));
  const copyMonday = () =>
    setForm((f) => {
      const m = f.operatingHours.days.find((d) => d.day === 1);
      return {
        ...f,
        operatingHours: {
          ...f.operatingHours,
          days: f.operatingHours.days.map((d) => ({
            ...d,
            open: m.open,
            close: m.close,
            closed: m.closed,
          })),
        },
      };
    });

  const changed = Object.keys(GROUPS).filter(
    (g) => JSON.stringify(form[g]) !== JSON.stringify(saved[g]),
  );

  function validate() {
    const nums = [
      ...Object.values(form.pricing),
      ...Object.values(form.booking).filter((v) => typeof v !== 'string'),
      ...Object.values(form.noShow),
    ];
    if (nums.some((v) => v === '' || Number(v) < 0)) return 'กรุณากรอกตัวเลขให้ครบ และต้องไม่ติดลบ';
    if (form.booking.minHours > form.booking.maxHours)
      return 'จำนวนชั่วโมงขั้นต่ำต้องไม่มากกว่าขั้นสูงสุด';
    const badDay = form.operatingHours.days.find(
      (d) => !d.closed && !(TIME_RE.test(d.open) && TIME_RE.test(d.close)),
    );
    if (badDay) return `เวลาของวัน${DAY_NAMES[badDay.day]}ต้องอยู่ในรูปแบบ HH:MM (เช่น 10:00)`;
    return '';
  }

  async function save() {
    const msg = validate();
    if (msg) return setError(msg);
    setBusy(true);
    setError('');
    setOk(false);
    try {
      const body = Object.fromEntries(changed.map((g) => [g, form[g]])); // ส่งเฉพาะหมวดที่แก้
      await api('/settings', { method: 'PUT', body });
      await load(); // โหลดค่าจริงจาก server กลับมาแสดง
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch (err) {
      if (err.status === 403) setError('บัญชีนี้ไม่มีสิทธิ์แก้ไขการตั้งค่า (ต้องเป็น admin)');
      else if (err.status === 400)
        setError(`ข้อมูลไม่ถูกต้อง: ${fmtDetails(err.details) || err.message}`);
      else if (err.status !== 401) setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const { store, pricing, booking, operatingHours: oh, noShow } = form;

  return (
    <div className="st">
      <div className="page-head">
        <div>
          <h1>
            ตั้งค่าร้านค้าและระบบ <small className="muted">(Store Settings)</small>
          </h1>
          <p className="muted">จัดการข้อมูลทั่วไป อัตราค่าบริการ กติกาการจอง และเวลาทำการของร้าน</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
      {ok && <div className="st-ok">บันทึกการตั้งค่าเรียบร้อยแล้ว</div>}

      <section className="panel">
        <div className="panel-head">
          <h2>ข้อมูลร้าน</h2>
        </div>
        <div className="st-grid">
          <label className="field">
            <span>ชื่อร้าน</span>
            <input
              className="input"
              value={store.name ?? ''}
              onChange={(e) => set('store', 'name')(e.target.value)}
            />
          </label>
          <label className="field">
            <span>เบอร์โทรร้าน</span>
            <input
              className="input"
              value={store.phone ?? ''}
              onChange={(e) => set('store', 'phone')(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>อัตราค่าบริการ (Pricing & Rates)</h2>
        </div>
        <div className="st-grid">
          <Num
            label="ค่าบริการรายชั่วโมง"
            unit="฿ / คน / ชม."
            value={pricing.perPersonHour}
            onChange={set('pricing', 'perPersonHour')}
          />
          <Num
            label="แพ็กเกจ 3 ชม. เหมาจ่าย"
            unit="฿ / คน"
            value={pricing.flat3hPerPerson}
            onChange={set('pricing', 'flat3hPerPerson')}
          />
          <Num
            label="เป้ารายได้ต่อวัน"
            unit="฿"
            value={pricing.revenueTargetPerDay}
            onChange={set('pricing', 'revenueTargetPerDay')}
            hint="ใช้คำนวณแถบเป้าหมายในหน้าภาพรวม"
          />
        </div>
        <p className="muted">ราคาใหม่มีผลกับการจองใหม่เท่านั้น (การจองเดิมเก็บราคาตอนจองไว้)</p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>กติกาการจอง (Booking Policy)</h2>
        </div>
        <div className="st-grid">
          <Num
            label="จองล่วงหน้าได้สูงสุด"
            unit="วัน"
            value={booking.maxAdvanceDays}
            onChange={set('booking', 'maxAdvanceDays')}
          />
          <Num
            label="เล่นขั้นต่ำ"
            unit="ชม."
            step={0.5}
            value={booking.minHours}
            onChange={set('booking', 'minHours')}
          />
          <Num
            label="เล่นสูงสุด"
            unit="ชม."
            step={0.5}
            value={booking.maxHours}
            onChange={set('booking', 'maxHours')}
          />
          <Num
            label="ผ่อนผันเวลาเกิน"
            unit="นาที"
            value={booking.overtimeGraceMin}
            onChange={set('booking', 'overtimeGraceMin')}
            hint="เกินจากนี้ถึงคิดค่าล่วงเวลา"
          />
          <Num
            label="เก้าอี้เสริมต่อโต๊ะ"
            unit="ที่นั่ง"
            value={booking.extraSeats}
            onChange={set('booking', 'extraSeats')}
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>นโยบาย No-show และเงินมัดจำ</h2>
        </div>
        <div className="st-grid">
          <Num
            label="รอลูกค้าที่ไม่มา"
            unit="นาที"
            value={noShow.graceMin}
            onChange={set('noShow', 'graceMin')}
          />
          <Num
            label="เงินมัดจำ"
            unit="฿ / คน"
            value={noShow.depositPerPerson}
            onChange={set('noShow', 'depositPerPerson')}
          />
          <Num
            label="ระงับบัญชีเมื่อไม่มาครบ"
            unit="ครั้ง"
            value={noShow.suspendAfter}
            onChange={set('noShow', 'suspendAfter')}
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>เวลาทำการของร้าน (Operating Hours)</h2>
          <button type="button" className="btn-ghost" onClick={copyMonday}>
            คัดลอกเวลาวันจันทร์ไปทุกวัน
          </button>
        </div>
        <label className="st-check">
          <input
            type="checkbox"
            checked={!!oh.enforce}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                operatingHours: { ...f.operatingHours, enforce: e.target.checked },
              }))
            }
          />
          ไม่ให้สมาชิกจองนอกเวลาทำการ (admin เปิดโต๊ะนอกเวลาได้)
        </label>
        {ORDER.map((n) => {
          const d = oh.days.find((x) => x.day === n);
          return (
            <div key={n} className={'st-day' + (d.closed ? ' off' : '')}>
              <label className="st-check">
                <input
                  type="checkbox"
                  checked={!d.closed}
                  onChange={(e) => setDay(n, { closed: !e.target.checked })}
                />
                <b>{DAY_NAMES[n]}</b>
              </label>
              <input
                className="input"
                aria-label={`เวลาเปิดวัน${DAY_NAMES[n]}`}
                placeholder="10:00"
                maxLength={5}
                disabled={d.closed}
                value={d.open}
                onChange={(e) => setDay(n, { open: e.target.value })}
              />
              <span>–</span>
              <input
                className="input"
                aria-label={`เวลาปิดวัน${DAY_NAMES[n]}`}
                placeholder="22:00"
                maxLength={5}
                disabled={d.closed}
                value={d.close}
                onChange={(e) => setDay(n, { close: e.target.value })}
              />
              <small className="muted">
                {d.closed
                  ? 'ปิดทำการ'
                  : TIME_RE.test(d.close) && TIME_RE.test(d.open) && d.close < d.open
                    ? 'ปิดหลังเที่ยงคืน'
                    : ''}
              </small>
            </div>
          );
        })}
      </section>

      <div className="st-bar">
        <span>
          {changed.length > 0
            ? `มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ${changed.length} หมวด (${changed.map((g) => GROUPS[g]).join(', ')})`
            : 'ยังไม่มีการเปลี่ยนแปลง'}
        </span>
        <div className="head-actions">
          <button
            type="button"
            className="btn-ghost"
            disabled={busy || changed.length === 0}
            onClick={() => {
              setForm(clone(saved));
              setError('');
            }}
          >
            ยกเลิก (Discard Changes)
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={busy || changed.length === 0}
            onClick={save}
          >
            {busy ? 'กำลังบันทึก...' : '✓ บันทึกการเปลี่ยนแปลง (Save Changes)'}
          </button>
        </div>
      </div>
    </div>
  );
}
