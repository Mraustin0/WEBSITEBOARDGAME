import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import './settings.css';

const NAV = [
  { id: 'store', label: 'ข้อมูลร้าน', en: 'General Info' },
  { id: 'pricing', label: 'อัตราค่าบริการ', en: 'Pricing & Rates' },
  { id: 'booking', label: 'นโยบายการจอง', en: 'Booking Policy' },
  { id: 'operatingHours', label: 'เวลาทำการ', en: 'Operating Hours' },
  { id: 'noShow', label: 'นโยบาย No-show', en: 'No-Show & Deposit' },
];

const DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const DAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const TIME_RE = /^([01]\d|2[0-4]):[0-5]\d$/;
const clone = (o) => JSON.parse(JSON.stringify(o));

function normalize(s) {
  const out = clone(s ?? {});
  for (const g of NAV.map((n) => n.id)) out[g] = out[g] ?? {};
  const days = out.operatingHours.days ?? [];
  out.operatingHours.days = [0, 1, 2, 3, 4, 5, 6].map(
    (d) =>
      days.find((x) => x.day === d) ?? { day: d, open: '10:00', close: '22:00', closed: false },
  );
  return out;
}

function fmtDetails(d) {
  if (!d || typeof d !== 'object') return '';
  return Object.entries(d)
    .map(
      ([k, v]) =>
        `${k}: ${typeof v === 'object' && !Array.isArray(v) ? JSON.stringify(v) : [].concat(v).join(', ')}`,
    )
    .join(' • ');
}

function Field({ label, hint, children }) {
  return (
    <label className="st-field">
      <span className="st-label">{label}</span>
      {children}
      {hint && <small className="st-hint">{hint}</small>}
    </label>
  );
}

function NumInput({ value, onChange, unit, step = 1, min = 0 }) {
  return (
    <div className="st-unit">
      <input
        className="input st-input"
        type="number"
        min={min}
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      />
      {unit && <em>{unit}</em>}
    </div>
  );
}

export default function Settings() {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [section, setSection] = useState('pricing');
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

  if (!form) {
    return (
      <div className="st">
        <div className="panel st-loading">
          {error ? <div className="form-error">{error}</div> : 'กำลังโหลดการตั้งค่า...'}
        </div>
      </div>
    );
  }

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

  const changed = NAV.map((n) => n.id).filter(
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
      const body = Object.fromEntries(changed.map((g) => [g, form[g]]));
      await api('/settings', { method: 'PUT', body });
      await load();
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

  const st = form.store;
  const pr = form.pricing;
  const bk = form.booking;
  const oh = form.operatingHours;
  const ns = form.noShow;
  const navItem = NAV.find((n) => n.id === section);

  return (
    <div className="st">
      <div className="page-head">
        <div>
          <p className="st-crumb">ภาพรวมระบบ / ตั้งค่า</p>
          <h1>
            ตั้งค่าร้านค้าและระบบ
            <span className="st-title-en">Store Settings</span>
          </h1>
          <p className="st-lead">
            จัดการข้อมูลทั่วไป อัตราค่าบริการ กติกาการจอง และเวลาทำการของร้าน
          </p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
      {ok && <div className="st-ok">บันทึกการตั้งค่าเรียบร้อยแล้ว</div>}

      <div className="st-layout">
        {/* Sidebar ตามดีไซน์ */}
        <aside className="st-nav panel">
          <p className="st-nav-title">การตั้งค่าหลัก</p>
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              className={'st-nav-item' + (section === n.id ? ' active' : '')}
              onClick={() => setSection(n.id)}
            >
              <span>{n.label}</span>
              <small>{n.en}</small>
              {changed.includes(n.id) && <i className="st-dot" title="มีการแก้ไข" />}
            </button>
          ))}
        </aside>

        {/* Content */}
        <div className="st-content">
          <section className="panel st-section">
            <div className="st-section-head">
              <h2>
                {navItem?.label}
                <span className="st-title-en">{navItem?.en}</span>
              </h2>
            </div>

            {section === 'store' && (
              <div className="st-grid-2">
                <Field label="ชื่อร้าน">
                  <input
                    className="input st-input"
                    value={st.name ?? ''}
                    onChange={(e) => set('store', 'name')(e.target.value)}
                  />
                </Field>
                <Field label="เบอร์โทรร้าน">
                  <input
                    className="input st-input"
                    value={st.phone ?? ''}
                    onChange={(e) => set('store', 'phone')(e.target.value)}
                  />
                </Field>
                <Field label="อีเมล">
                  <input
                    className="input st-input"
                    type="email"
                    value={st.email ?? ''}
                    onChange={(e) => set('store', 'email')(e.target.value)}
                  />
                </Field>
                <Field label="ที่อยู่">
                  <input
                    className="input st-input"
                    value={st.address ?? ''}
                    onChange={(e) => set('store', 'address')(e.target.value)}
                  />
                </Field>
              </div>
            )}

            {section === 'pricing' && (
              <div className="st-stack">
                <div className="st-grid-3">
                  <Field label="ค่าบริการรายชั่วโมง" hint="คิดตามจำนวนคน × ชั่วโมง">
                    <NumInput
                      value={pr.perPersonHour}
                      onChange={set('pricing', 'perPersonHour')}
                      unit="฿ / คน / ชม."
                    />
                  </Field>
                  <Field label="แพ็กเกจ 3 ชม. เหมาจ่าย" hint="ต่อคน">
                    <NumInput
                      value={pr.flat3hPerPerson}
                      onChange={set('pricing', 'flat3hPerPerson')}
                      unit="฿ / คน"
                    />
                  </Field>
                  <Field label="เป้าหมายรายได้ต่อวัน" hint="ใช้คำนวณ % เป้าหมายในหน้าภาพรวม">
                    <NumInput
                      value={pr.revenueTargetPerDay}
                      onChange={set('pricing', 'revenueTargetPerDay')}
                      unit="฿"
                    />
                  </Field>
                </div>
                <p className="st-note">
                  ราคาใหม่มีผลกับการจองใหม่เท่านั้น (การจองเดิมเก็บราคาตอนจองไว้)
                </p>
              </div>
            )}

            {section === 'booking' && (
              <div className="st-grid-3">
                <Field label="จองล่วงหน้าได้สูงสุด" hint="สมาชิกจองล่วงหน้าได้กี่วัน">
                  <NumInput
                    value={bk.maxAdvanceDays}
                    onChange={set('booking', 'maxAdvanceDays')}
                    unit="วัน"
                  />
                </Field>
                <Field label="เล่นขั้นต่ำ">
                  <NumInput
                    value={bk.minHours}
                    onChange={set('booking', 'minHours')}
                    unit="ชม."
                    step={0.5}
                  />
                </Field>
                <Field label="เล่นสูงสุด">
                  <NumInput
                    value={bk.maxHours}
                    onChange={set('booking', 'maxHours')}
                    unit="ชม."
                    step={0.5}
                  />
                </Field>
                <Field label="ผ่อนผันเวลาเกิน" hint="เกินเวลานี้ค่อยคิด overtime">
                  <NumInput
                    value={bk.overtimeGraceMin}
                    onChange={set('booking', 'overtimeGraceMin')}
                    unit="นาที"
                  />
                </Field>
                <Field label="เก้าอี้เสริมต่อโต๊ะ">
                  <NumInput
                    value={bk.extraSeats}
                    onChange={set('booking', 'extraSeats')}
                    unit="ที่"
                  />
                </Field>
                <Field label="ยกเลิกได้ถึงก่อนเริ่ม" hint="สมาชิกยกเลิกเองได้">
                  <NumInput
                    value={bk.cancelCutoffHours}
                    onChange={set('booking', 'cancelCutoffHours')}
                    unit="ชม."
                  />
                </Field>
              </div>
            )}

            {section === 'operatingHours' && (
              <div className="st-stack">
                <div className="st-hours-toolbar">
                  <label className="st-toggle">
                    <input
                      type="checkbox"
                      checked={!!oh.enforce}
                      onChange={(e) => set('operatingHours', 'enforce')(e.target.checked)}
                    />
                    <span>
                      บังคับเวลาทำการ — ไม่ให้สมาชิกจองนอกเวลา (admin ยังเปิดโต๊ะนอกเวลาได้)
                    </span>
                  </label>
                  <button type="button" className="btn-ghost st-btn" onClick={copyMonday}>
                    คัดลอกวันจันทร์ไปทุกวัน
                  </button>
                </div>

                <div className="st-days">
                  {ORDER.map((n) => {
                    const d = oh.days.find((x) => x.day === n);
                    return (
                      <div key={n} className={'st-day' + (d.closed ? ' off' : '')}>
                        <label className="st-day-check">
                          <input
                            type="checkbox"
                            checked={!d.closed}
                            onChange={(e) => setDay(n, { closed: !e.target.checked })}
                          />
                          <div>
                            <b>{DAY_NAMES[n]}</b>
                            <small>{DAY_EN[n]}</small>
                          </div>
                        </label>
                        <div className="st-day-times">
                          <input
                            className="input st-input st-time"
                            aria-label={`เวลาเปิดวัน${DAY_NAMES[n]}`}
                            placeholder="10:00"
                            maxLength={5}
                            disabled={d.closed}
                            value={d.open}
                            onChange={(e) => setDay(n, { open: e.target.value })}
                          />
                          <span className="st-dash">–</span>
                          <input
                            className="input st-input st-time"
                            aria-label={`เวลาปิดวัน${DAY_NAMES[n]}`}
                            placeholder="22:00"
                            maxLength={5}
                            disabled={d.closed}
                            value={d.close}
                            onChange={(e) => setDay(n, { close: e.target.value })}
                          />
                        </div>
                        <span className="st-day-note">
                          {d.closed
                            ? 'ปิดทำการ'
                            : TIME_RE.test(d.close) && TIME_RE.test(d.open) && d.close < d.open
                              ? 'ปิดหลังเที่ยงคืน'
                              : 'ปกติ'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {section === 'noShow' && (
              <div className="st-grid-3">
                <Field label="ผ่อนผันมาสาย" hint="เกินเวลานี้ถือว่า no-show">
                  <NumInput value={ns.graceMin} onChange={set('noShow', 'graceMin')} unit="นาที" />
                </Field>
                <Field label="เงินมัดจำต่อคน" hint="แสดงในระบบ — ยังไม่ตัดบัตรจริง">
                  <NumInput
                    value={ns.depositPerPerson}
                    onChange={set('noShow', 'depositPerPerson')}
                    unit="฿ / คน"
                  />
                </Field>
                <Field label="ระงับบัญชีหลัง no-show" hint="ครบจำนวนครั้งนี้ควรระงับ">
                  <NumInput
                    value={ns.suspendAfter}
                    onChange={set('noShow', 'suspendAfter')}
                    unit="ครั้ง"
                  />
                </Field>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="st-bar">
        <span className="st-bar-msg">
          {changed.length > 0
            ? `มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ${changed.length} หมวด (${changed
                .map((g) => NAV.find((n) => n.id === g)?.label)
                .join(', ')})`
            : 'ยังไม่มีการเปลี่ยนแปลง'}
        </span>
        <div className="st-bar-actions">
          <button
            type="button"
            className="btn-ghost st-btn"
            disabled={busy || changed.length === 0}
            onClick={() => {
              setForm(clone(saved));
              setError('');
            }}
          >
            ยกเลิก (Discard)
          </button>
          <button
            type="button"
            className="btn-primary st-btn"
            disabled={busy || changed.length === 0}
            onClick={save}
          >
            {busy ? 'กำลังบันทึก...' : '✓ บันทึกการเปลี่ยนแปลง'}
          </button>
        </div>
      </div>
    </div>
  );
}
