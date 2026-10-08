import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';
import './WalkInModal.css';

// ---------- ค่าเริ่มต้น (ใช้เมื่อ GET /api/settings ยังโหลดไม่เสร็จ/ไม่มีค่า) ----------
const DEFAULTS = {
  perPersonHour: 60,
  flat3hPerPerson: 150,
  extraSeats: 2,
  minHours: 1,
  maxHours: 6,
};
const PHONE_RE = /^[0-9+\-\s()]+$/;

// แปลงข้อความในช่องเดียว -> { name } หรือ { phone } ตามที่ API ต้องการ
// TODO(ถามทีม): design ให้เว้นว่างได้ แต่ API ต้องมี customer หรือ user -> ตอนนี้ใส่ชื่อ default ให้
function buildCustomer(text) {
  const v = text.trim();
  if (!v) return { name: 'ลูกค้า Walk-in' };
  return PHONE_RE.test(v) ? { phone: v } : { name: v };
}

// รายการชั่วโมงให้เลือก ทีละ 0.5 (กฎจาก API: 1–6 ชม.)
function hourOptions(min, max) {
  const out = [];
  for (let h = min; h <= max; h += 0.5) out.push(h);
  return out;
}

// Walk-In modal (หน้า 14) -> POST /api/reservations/admin  (ไม่ส่ง startAt = เริ่มเล่นทันที)
export default function WalkInModal({ onClose, onCreated }) {
  const [step, setStep] = useState('form'); // 'form' -> 'game'
  const [tables, setTables] = useState([]);
  const [cfg, setCfg] = useState(DEFAULTS);
  const [form, setForm] = useState({ table: '', pax: 4, pkg: 'flat3h', hours: 2, contact: '' });
  const [games, setGames] = useState([]);
  const [gameQuery, setGameQuery] = useState('');
  const [gameNote, setGameNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const fe = (k) => fieldErrors[k]?.[0];
  const table = tables.find((t) => t._id === form.table);
  const maxPax = table ? table.capacity + cfg.extraSeats : 1;
  const hours = form.pkg === 'flat3h' ? 3 : Number(form.hours);

  // โหลดโต๊ะว่าง (จาก floor plan) + ราคา/กฎ (จาก settings) — ใช้ซ้ำตอนชน 409
  async function loadData() {
    const [floor, s] = await Promise.all([api('/tables/floor'), api('/settings')]);
    const free = (floor?.tables ?? []).filter((t) => t.state === 'available');
    setTables(free);
    setCfg({
      perPersonHour: s?.pricing?.perPersonHour ?? DEFAULTS.perPersonHour,
      flat3hPerPerson: s?.pricing?.flat3hPerPerson ?? DEFAULTS.flat3hPerPerson,
      extraSeats: s?.booking?.extraSeats ?? DEFAULTS.extraSeats,
      minHours: s?.booking?.minHours ?? DEFAULTS.minHours,
      maxHours: s?.booking?.maxHours ?? DEFAULTS.maxHours,
    });
    setForm((f) => (free.some((t) => t._id === f.table) ? f : { ...f, table: free[0]?._id ?? '' }));
  }

  useEffect(() => {
    loadData().catch(handleError);
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // จัดการ error ตามเอกสาร: 400 = input ผิด, 401 = token, 409 = ชนกัน
  function handleError(err) {
    if (err.status === 401) {
      setError('เซสชันหมดอายุ หรือยังไม่ได้เข้าสู่ระบบ');
    } else if (err.status === 400) {
      setError(err.message);
      setFieldErrors(err.details ?? {});
      setStep('form'); // กลับไปหน้าฟอร์มเพื่อให้เห็นข้อความใต้ช่อง
    } else if (err.status === 409) {
      setError(`โต๊ะหรือเกมไม่ว่างแล้ว: ${err.message}`);
      setStep('form');
      loadData().catch(() => {}); // โหลดโต๊ะว่างใหม่
    } else {
      setError(err.message);
    }
  }

  const setPax = (n) => setForm((f) => ({ ...f, pax: Math.min(Math.max(1, n), maxPax) }));
  const onTableChange = (e) => {
    const t = tables.find((x) => x._id === e.target.value);
    const cap = t ? t.capacity + cfg.extraSeats : 1;
    setForm((f) => ({ ...f, table: e.target.value, pax: Math.min(f.pax, cap) }));
  };

  // ปุ่มลัดจำนวนคน: 2 / เท่าที่นั่ง / ที่นั่ง+เก้าอี้เสริม
  const chips = table
    ? [...new Set([2, table.capacity, maxPax])].filter((n) => n <= maxPax).sort((a, b) => a - b)
    : [];
  const chipNote = (n) =>
    n === table.capacity ? ' (พอดีโต๊ะ)' : n > table.capacity ? ' (+เก้าอี้เสริม)' : '';

  function validate() {
    if (!form.table) {
      setFieldErrors({ table: ['เลือกโต๊ะ'] });
      return false;
    }
    setFieldErrors({});
    setError('');
    return true;
  }

  // ขั้นที่ 2: โหลดรายการเกมที่ว่างตอนนี้ (availability ต้องมี startAt -> ใช้เวลาปัจจุบัน)
  // TODO(ถามทีม/ดู design): ยังไม่มีภาพหน้าเลือกเกมของ flow walk-in
  async function goToGames() {
    if (!validate()) return;
    setBusy(true);
    try {
      const avail = await api('/reservations/availability', {
        query: { startAt: new Date().toISOString(), durationHours: hours, players: form.pax },
      });
      setGames((avail?.games ?? []).filter((g) => g.available));
      setGameNote(avail?.bookable === false ? avail.reason : '');
      setStep('game');
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  // ส่งจริง: game = null (เริ่มโดยไม่เลือกเกม) หรือ id ของเกม
  async function submit(game) {
    if (!validate()) return;
    setBusy(true);
    try {
      await api('/reservations/admin', {
        method: 'POST',
        body: {
          table: form.table,
          players: form.pax,
          durationHours: hours,
          package: form.pkg,
          customer: buildCustomer(form.contact),
          game: game?._id ?? null,
        },
      });
      onCreated();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  const shownGames = games.filter((g) =>
    g.name?.toLowerCase().includes(gameQuery.trim().toLowerCase()),
  );

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal walkin" role="dialog" aria-modal="true" aria-labelledby="wi-title">
        <div className="walkin-head">
          <div>
            <h2 id="wi-title">{step === 'form' ? 'เปิดโต๊ะ Walk-In ด่วน' : 'เลือกบอร์ดเกม'}</h2>
            <p className="muted">
              {step === 'form'
                ? 'เปิดโต๊ะและเริ่มเซสชันการเล่นให้ลูกค้าที่เดินเข้าร้านโดยไม่ได้จองล่วงหน้า'
                : `โต๊ะ ${table?.code ?? ''} • ${form.pax} คน • ${hours} ชม.`}
            </p>
          </div>
          <button type="button" className="walkin-x" onClick={onClose} aria-label="ปิด">
            ✕
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        {step === 'form' && (
          <>
            <label className="field">
              <span>โต๊ะ</span>
              <select className="input" value={form.table} onChange={onTableChange}>
                {tables.length === 0 && <option value="">ไม่มีโต๊ะว่างตอนนี้</option>}
                {tables.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.code} • {t.zone ?? t.name ?? ''} ({t.capacity} ที่นั่ง)
                  </option>
                ))}
              </select>
              {fe('table') && <small className="field-error">{fe('table')}</small>}
            </label>

            <label className="field">
              <span>ชื่อผู้ติดต่อ / เบอร์โทรศัพท์</span>
              <input
                className="input"
                placeholder="ระบุชื่อหรือเบอร์โทรศัพท์สำหรับเปิดโต๊ะ (ไม่บังคับ)"
                value={form.contact}
                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              />
              {fe('customer') && <small className="field-error">{fe('customer')}</small>}
            </label>

            <div className="field">
              <span>จำนวนผู้เล่นจริง</span>
              <div className="pax-row">
                <div className="stepper">
                  <button type="button" onClick={() => setPax(form.pax - 1)} aria-label="ลดจำนวนคน">
                    −
                  </button>
                  <strong>{form.pax} ท่าน</strong>
                  <button
                    type="button"
                    onClick={() => setPax(form.pax + 1)}
                    aria-label="เพิ่มจำนวนคน"
                  >
                    +
                  </button>
                </div>
                {chips.map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={'chip-btn' + (form.pax === n ? ' on' : '')}
                    onClick={() => setPax(n)}
                  >
                    {n} ท่าน{chipNote(n)}
                  </button>
                ))}
              </div>
              {table && (
                <small className="muted">
                  รองรับสูงสุด {table.capacity}–{maxPax} ที่นั่ง สำหรับ {table.code}
                </small>
              )}
              {fe('players') && <small className="field-error">{fe('players')}</small>}
            </div>

            <div className="field">
              <span>แพ็กเกจค่าบริการ</span>
              <div className="pkg-row">
                <label className={'pkg' + (form.pkg === 'hourly' ? ' on' : '')}>
                  <input
                    type="radio"
                    name="pkg"
                    checked={form.pkg === 'hourly'}
                    onChange={() => setForm((f) => ({ ...f, pkg: 'hourly' }))}
                  />
                  <strong>รายชั่วโมง (Hourly)</strong>
                  <em>฿{cfg.perPersonHour} / ชม. / คน</em>
                  <small>เกินเวลาที่เลือก คิดเพิ่มทีละครึ่งชั่วโมง</small>
                </label>
                <label className={'pkg' + (form.pkg === 'flat3h' ? ' on' : '')}>
                  <input
                    type="radio"
                    name="pkg"
                    checked={form.pkg === 'flat3h'}
                    onChange={() => setForm((f) => ({ ...f, pkg: 'flat3h' }))}
                  />
                  <strong>
                    แพ็กเกจ 3 ชม. เหมาจ่าย <span className="pill-hot">ยอดนิยม</span>
                  </strong>
                  <em>฿{cfg.flat3hPerPerson} / คน</em>
                  <small>ประหยัดกว่าสำหรับบอร์ดเกมยาว</small>
                </label>
              </div>
              {fe('package') && <small className="field-error">{fe('package')}</small>}
            </div>

            {/* TODO(ถามทีม): design ไม่มีช่องเลือกเวลาของโหมดรายชั่วโมง แต่ API บังคับ durationHours */}
            {form.pkg === 'hourly' && (
              <label className="field">
                <span>ระยะเวลา (ชม.)</span>
                <select
                  className="input"
                  value={form.hours}
                  onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                >
                  {hourOptions(cfg.minHours, cfg.maxHours).map((h) => (
                    <option key={h} value={h}>
                      {h} ชั่วโมง
                    </option>
                  ))}
                </select>
                {fe('durationHours') && (
                  <small className="field-error">{fe('durationHours')}</small>
                )}
              </label>
            )}

            <div className="walkin-actions">
              <button type="button" className="btn-ghost" onClick={onClose}>
                ยกเลิก
              </button>
              <span className="grow" />
              <button
                type="button"
                className="btn-link"
                disabled={busy || !form.table}
                onClick={() => submit(null)}
              >
                ⏱ เริ่มทันทีโดยไม่เลือกเกม
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={busy || !form.table}
                onClick={goToGames}
              >
                ดำเนินการต่อ: เลือกบอร์ดเกม →
              </button>
            </div>
          </>
        )}

        {step === 'game' && (
          <>
            {gameNote && <div className="form-note">{gameNote}</div>}
            <input
              className="input"
              placeholder="ค้นหาชื่อเกม"
              value={gameQuery}
              onChange={(e) => setGameQuery(e.target.value)}
            />
            <div className="game-list">
              {shownGames.length === 0 && (
                <p className="muted">ไม่พบเกมที่ว่างและเหมาะกับจำนวนผู้เล่นนี้</p>
              )}
              {shownGames.map((g) => (
                <button
                  type="button"
                  key={g._id}
                  className="game-item"
                  disabled={busy}
                  onClick={() => submit(g)}
                >
                  {g.name}
                </button>
              ))}
            </div>
            <div className="walkin-actions">
              <button type="button" className="btn-ghost" onClick={() => setStep('form')}>
                ← ย้อนกลับ
              </button>
              <span className="grow" />
              <button
                type="button"
                className="btn-link"
                disabled={busy}
                onClick={() => submit(null)}
              >
                เริ่มโดยไม่เลือกเกม
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
