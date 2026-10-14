import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import FieldError from '../../components/FieldError.jsx';
import { useFieldErrors } from '../../lib/useFieldErrors.js';
import { normalizePhone, vEmail, vNumber, vPhone, vText } from '../../lib/validate.js';
import './settings.css';

const NAV = [
  { id: 'store', label: 'ข้อมูลร้าน', en: 'ชื่อร้าน ที่อยู่ ช่องทางติดต่อ' },
  { id: 'pricing', label: 'ค่าบริการ', en: 'ราคารายชั่วโมงและแพ็กเกจ' },
  { id: 'booking', label: 'กติกาการจอง', en: 'เวลาเล่นและการยกเลิก' },
  { id: 'operatingHours', label: 'เวลาทำการ', en: 'เวลาเปิด–ปิดแต่ละวัน' },
  { id: 'noShow', label: 'ไม่มาตามนัดและมัดจำ', en: 'มัดจำและการระงับบัญชี' },
];

const DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const TIME_RE = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/; // เหมือน settings.schema.js (00:00–24:00)
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

const money = (label) => (v) => vNumber(v, { min: 0, max: 100000, label });
const int = (min, max, label) => (v) => vNumber(v, { min, max, integer: true, label });
const num = (min, max, label) => (v) => vNumber(v, { min, max, label });

// กฎตาม settings.schema.js — key = path ในฟอร์ม (กลุ่ม.ช่อง)
const RULES = {
  store: {
    name: (v) => vText(v, { required: true, max: 100, label: 'ชื่อร้าน' }),
    phone: (v) => vPhone(v),
    email: (v) => vEmail(v, { required: false }),
    address: (v) => vText(v, { max: 300, label: 'ที่อยู่' }),
  },
  pricing: {
    perPersonHour: money('ค่าบริการรายชั่วโมง'),
    flat3hPerPerson: money('ราคาเหมา 3 ชม.'),
    revenueTargetPerDay: money('เป้าหมายรายได้'),
  },
  booking: {
    maxAdvanceDays: int(0, 60, 'จำนวนวันจองล่วงหน้า'),
    minHours: num(0.5, 12, 'เวลาเล่นขั้นต่ำ'),
    maxHours: num(0.5, 12, 'เวลาเล่นสูงสุด'),
    overtimeGraceMin: int(0, 120, 'เวลาผ่อนผัน'),
    extraSeats: int(0, 10, 'เก้าอี้เสริม'),
    cancelCutoffHours: num(0, 72, 'ชั่วโมงก่อนยกเลิก'),
  },
  noShow: {
    graceMin: int(0, 240, 'เวลาผ่อนผันมาสาย'),
    depositPerPerson: money('มัดจำต่อคน'),
    suspendAfter: int(0, 100, 'จำนวนครั้ง'),
  },
};

/** ตรวจเฉพาะหมวดที่แก้ (server รับเฉพาะหมวดที่ส่งไป) */
function settingsRules(form, changed) {
  const out = {};
  for (const [g, fields] of Object.entries(RULES)) {
    for (const [k, fn] of Object.entries(fields)) {
      out[`${g}.${k}`] = changed.includes(g) ? fn(form[g]?.[k]) : '';
    }
  }
  if (changed.includes('booking') && !out['booking.minHours'] && !out['booking.maxHours']) {
    if (Number(form.booking.minHours) > Number(form.booking.maxHours))
      out['booking.maxHours'] = 'เวลาเล่นสูงสุดต้องไม่น้อยกว่าเวลาเล่นขั้นต่ำ';
  }
  form.operatingHours.days.forEach((d, i) => {
    const check = (t, msg) =>
      changed.includes('operatingHours') && !d.closed && !TIME_RE.test(t ?? '') ? msg : '';
    out[`operatingHours.days.${i}.open`] = check(d.open, 'เวลาเปิดใช้รูปแบบ HH:MM เช่น 10:00');
    out[`operatingHours.days.${i}.close`] = check(d.close, 'เวลาปิดใช้รูปแบบ HH:MM เช่น 22:00');
  });
  return out;
}

function Field({ label, hint, v, k, children }) {
  return (
    <label className="st-field">
      <span className="st-label">{label}</span>
      {children}
      {hint && <small className="st-hint">{hint}</small>}
      {v && <FieldError variant="admin" id={v.errId(k)} msg={v.errors[k]} />}
    </label>
  );
}

function NumInput({ value, onChange, unit, step = 1, min = 0, max, ...rest }) {
  return (
    <div className="st-unit">
      <input
        className="input st-input"
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        {...rest}
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

  const changedGroups =
    form && saved
      ? NAV.map((n) => n.id).filter((g) => JSON.stringify(form[g]) !== JSON.stringify(saved[g]))
      : [];
  const v = useFieldErrors(form ?? {}, (f) => (form ? settingsRules(f, changedGroups) : {}));

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
          {error ? <div className="form-error">{error}</div> : 'กำลังโหลด...'}
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

  const changed = changedGroups;

  async function save() {
    setError('');
    setOk(false);
    if (!v.submit()) {
      // ช่องที่ผิดอยู่หมวดอื่น → สลับไปหมวดนั้นแล้วโฟกัสช่องแรกที่ผิด
      const all = settingsRules(form, changed);
      const first = Object.keys(all).find((k) => all[k]);
      const group = first?.split('.')[0];
      if (group && group !== section) {
        setSection(group);
        setTimeout(() => document.querySelector('.st-content [aria-invalid="true"]')?.focus(), 0);
      }
      return;
    }
    setBusy(true);
    try {
      const body = Object.fromEntries(changed.map((g) => [g, form[g]]));
      if (body.store) {
        body.store = {
          ...body.store,
          name: (body.store.name ?? '').trim(),
          phone: normalizePhone(body.store.phone),
          email: (body.store.email ?? '').trim(),
          address: (body.store.address ?? '').trim(),
        };
      }
      await api('/settings', { method: 'PUT', body });
      await load();
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch (err) {
      if (err.status === 403) setError('บัญชีนี้ไม่มีสิทธิ์แก้ไขการตั้งค่าร้าน');
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
          <p className="st-crumb">บริหารร้าน / ตั้งค่าร้าน</p>
          <h1>ตั้งค่าร้าน</h1>
          <p className="st-lead">ข้อมูลร้าน ค่าบริการ กติกาการจอง และเวลาเปิด–ปิดร้าน</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
      {ok && <div className="st-ok">บันทึกการตั้งค่าแล้ว</div>}

      <div className="st-layout">
        {/* Sidebar ตามดีไซน์ */}
        <aside className="st-nav panel">
          <p className="st-nav-title">หมวดการตั้งค่า</p>
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
                <Field label="ชื่อร้าน *" v={v} k="store.name">
                  <input
                    className="input st-input"
                    value={st.name ?? ''}
                    maxLength={100}
                    autoComplete="organization"
                    onChange={(e) => set('store', 'name')(e.target.value)}
                    {...v.bind('store.name')}
                  />
                </Field>
                <Field label="เบอร์โทรร้าน" v={v} k="store.phone">
                  <input
                    className="input st-input"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={15}
                    placeholder="0812345678"
                    value={st.phone ?? ''}
                    onChange={(e) => set('store', 'phone')(e.target.value)}
                    {...v.bind('store.phone')}
                  />
                </Field>
                <Field label="อีเมล" v={v} k="store.email">
                  <input
                    className="input st-input"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={254}
                    value={st.email ?? ''}
                    onChange={(e) => set('store', 'email')(e.target.value)}
                    {...v.bind('store.email')}
                  />
                </Field>
                <Field label="ที่อยู่" v={v} k="store.address">
                  <input
                    className="input st-input"
                    maxLength={300}
                    autoComplete="street-address"
                    value={st.address ?? ''}
                    onChange={(e) => set('store', 'address')(e.target.value)}
                    {...v.bind('store.address')}
                  />
                </Field>
              </div>
            )}

            {section === 'pricing' && (
              <div className="st-stack">
                <div className="st-grid-3">
                  <Field
                    v={v}
                    k="pricing.perPersonHour"
                    label="ค่าบริการรายชั่วโมง"
                    hint="คิดตามจำนวนคน × ชั่วโมง"
                  >
                    <NumInput
                      value={pr.perPersonHour}
                      onChange={set('pricing', 'perPersonHour')}
                      max={100000}
                      {...v.bind('pricing.perPersonHour')}
                      unit="฿ / คน / ชม."
                    />
                  </Field>
                  <Field v={v} k="pricing.flat3hPerPerson" label="เหมา 3 ชม." hint="ต่อคน">
                    <NumInput
                      value={pr.flat3hPerPerson}
                      onChange={set('pricing', 'flat3hPerPerson')}
                      max={100000}
                      {...v.bind('pricing.flat3hPerPerson')}
                      unit="฿ / คน"
                    />
                  </Field>
                  <Field
                    v={v}
                    k="pricing.revenueTargetPerDay"
                    label="เป้าหมายรายได้ต่อวัน"
                    hint="ใช้คำนวณ % เป้าหมายในหน้าภาพรวมร้าน"
                  >
                    <NumInput
                      value={pr.revenueTargetPerDay}
                      onChange={set('pricing', 'revenueTargetPerDay')}
                      max={100000}
                      {...v.bind('pricing.revenueTargetPerDay')}
                      unit="฿"
                    />
                  </Field>
                </div>
                <p className="st-note">ราคาใหม่ใช้กับการจองใหม่เท่านั้น การจองเดิมยังใช้ราคาเดิม</p>
              </div>
            )}

            {section === 'booking' && (
              <div className="st-grid-3">
                <Field
                  v={v}
                  k="booking.maxAdvanceDays"
                  label="จองล่วงหน้าได้สูงสุด"
                  hint="สมาชิกจองล่วงหน้าได้กี่วัน"
                >
                  <NumInput
                    value={bk.maxAdvanceDays}
                    onChange={set('booking', 'maxAdvanceDays')}
                    max={60}
                    {...v.bind('booking.maxAdvanceDays')}
                    unit="วัน"
                  />
                </Field>
                <Field v={v} k="booking.minHours" label="เล่นขั้นต่ำ">
                  <NumInput
                    value={bk.minHours}
                    onChange={set('booking', 'minHours')}
                    max={12}
                    {...v.bind('booking.minHours')}
                    unit="ชม."
                    step={0.5}
                  />
                </Field>
                <Field v={v} k="booking.maxHours" label="เล่นสูงสุด">
                  <NumInput
                    value={bk.maxHours}
                    onChange={set('booking', 'maxHours')}
                    max={12}
                    {...v.bind('booking.maxHours')}
                    unit="ชม."
                    step={0.5}
                  />
                </Field>
                <Field
                  v={v}
                  k="booking.overtimeGraceMin"
                  label="ผ่อนผันเวลาเกิน"
                  hint="เล่นเกินไม่เกินนี้ ยังไม่คิดค่าล่วงเวลา"
                >
                  <NumInput
                    value={bk.overtimeGraceMin}
                    onChange={set('booking', 'overtimeGraceMin')}
                    max={120}
                    {...v.bind('booking.overtimeGraceMin')}
                    unit="นาที"
                  />
                </Field>
                <Field v={v} k="booking.extraSeats" label="เก้าอี้เสริมต่อโต๊ะ">
                  <NumInput
                    value={bk.extraSeats}
                    onChange={set('booking', 'extraSeats')}
                    max={10}
                    {...v.bind('booking.extraSeats')}
                    unit="ที่"
                  />
                </Field>
                <Field
                  v={v}
                  k="booking.cancelCutoffHours"
                  label="ยกเลิกได้ถึงก่อนเริ่ม"
                  hint="สมาชิกยกเลิกเองได้"
                >
                  <NumInput
                    value={bk.cancelCutoffHours}
                    onChange={set('booking', 'cancelCutoffHours')}
                    max={72}
                    {...v.bind('booking.cancelCutoffHours')}
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
                      ใช้เวลาทำการ — สมาชิกจองนอกเวลาไม่ได้ (พนักงานยังเปิดโต๊ะนอกเวลาได้)
                    </span>
                  </label>
                  <button type="button" className="btn-ghost st-btn" onClick={copyMonday}>
                    คัดลอกวันจันทร์ไปทุกวัน
                  </button>
                </div>

                <div className="st-days">
                  {ORDER.map((n) => {
                    const idx = oh.days.findIndex((x) => x.day === n);
                    const d = oh.days[idx];
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
                          </div>
                        </label>
                        <div className="st-day-times">
                          <input
                            className="input st-input st-time"
                            aria-label={`เวลาเปิดวัน${DAY_NAMES[n]}`}
                            placeholder="10:00"
                            maxLength={5}
                            inputMode="numeric"
                            disabled={d.closed}
                            value={d.open}
                            onChange={(e) => setDay(n, { open: e.target.value })}
                            {...v.bind(`operatingHours.days.${idx}.open`)}
                          />
                          <span className="st-dash">–</span>
                          <input
                            className="input st-input st-time"
                            aria-label={`เวลาปิดวัน${DAY_NAMES[n]}`}
                            placeholder="22:00"
                            maxLength={5}
                            inputMode="numeric"
                            disabled={d.closed}
                            value={d.close}
                            onChange={(e) => setDay(n, { close: e.target.value })}
                            {...v.bind(`operatingHours.days.${idx}.close`)}
                          />
                        </div>
                        <FieldError
                          variant="admin"
                          id={v.errId(`operatingHours.days.${idx}.open`)}
                          msg={v.errors[`operatingHours.days.${idx}.open`]}
                        />
                        <FieldError
                          variant="admin"
                          id={v.errId(`operatingHours.days.${idx}.close`)}
                          msg={v.errors[`operatingHours.days.${idx}.close`]}
                        />
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
                <Field
                  v={v}
                  k="noShow.graceMin"
                  label="ผ่อนผันมาสาย"
                  hint="มาสายเกินนี้ถือว่าไม่มาตามนัด"
                >
                  <NumInput
                    value={ns.graceMin}
                    onChange={set('noShow', 'graceMin')}
                    max={240}
                    {...v.bind('noShow.graceMin')}
                    unit="นาที"
                  />
                </Field>
                <Field
                  v={v}
                  k="noShow.depositPerPerson"
                  label="มัดจำต่อคน"
                  hint="ใช้แสดงยอดในระบบ ยังไม่มีการตัดเงินจริง"
                >
                  <NumInput
                    value={ns.depositPerPerson}
                    onChange={set('noShow', 'depositPerPerson')}
                    max={100000}
                    {...v.bind('noShow.depositPerPerson')}
                    unit="฿ / คน"
                  />
                </Field>
                <Field
                  v={v}
                  k="noShow.suspendAfter"
                  label="ระงับบัญชีเมื่อไม่มาตามนัดครบ"
                  hint="ครบจำนวนนี้จะขึ้นเป็นบัญชีที่ควรระงับ"
                >
                  <NumInput
                    value={ns.suspendAfter}
                    onChange={set('noShow', 'suspendAfter')}
                    max={100}
                    {...v.bind('noShow.suspendAfter')}
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
              v.reset();
            }}
          >
            ยกเลิกการแก้ไข
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
