import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';
import { timeTH } from '../../../lib/date.js';
import { customerName, gameName, tableCode } from '../../../lib/reservationStatus.js';
import './CheckoutModal.css';

const money = (n) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 });
const PAY = [
  { key: 'qr', label: 'PROMPTPAY' },
  { key: 'cash', label: 'CASH' },
];

// ชั่วโมง/นาทีที่เล่นจริง เช่น 135 -> "2 ชม. 15 น."
function duration(min) {
  const m = Math.round(Number(min) || 0);
  return `${Math.floor(m / 60)} ชม. ${m % 60} น.`;
}

// Modal หน้า 15: GET /reservations/:id/checkout (ดูบิล) -> PATCH /reservations/:id/return (คืนเกม+รับเงิน)
export default function CheckoutModal({ isOpen, reservation, onClose, onSuccess }) {
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [stale, setStale] = useState(false); // true เมื่อชน 409 (สถานะเปลี่ยนไปแล้ว)
  const [condition, setCondition] = useState('good'); // 'good' | 'damaged'
  const [damageNote, setDamageNote] = useState('');
  const [method, setMethod] = useState('qr');

  const id = reservation?._id;

  // จัดการ error ตามเอกสาร: 400 = ข้อมูลผิด, 401 = token, 409 = สถานะชนกัน
  function handleError(err) {
    if (err.status === 401) setError('เซสชันหมดอายุ หรือยังไม่ได้เข้าสู่ระบบ');
    else if (err.status === 400) {
      setError(err.message);
      setFieldErrors(err.details ?? {});
    } else if (err.status === 409) {
      setError(`ทำรายการไม่ได้เพราะสถานะเปลี่ยนไปแล้ว: ${err.message}`);
      setStale(true);
      onSuccess(); // รีเฟรชรายการด้านหลัง
    } else setError(err.message);
  }

  // โหลดบิลทุกครั้งที่เปิด modal ของรายการใหม่ + รีเซ็ตฟอร์ม
  useEffect(() => {
    if (!isOpen || !id) return;
    let alive = true;
    setBill(null);
    setLoading(true);
    setError('');
    setFieldErrors({});
    setStale(false);
    setCondition('good');
    setDamageNote('');
    setMethod('qr');
    api(`/reservations/${id}/checkout`)
      .then((d) => alive && setBill(d?.bill ?? null))
      .catch((err) => alive && handleError(err))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // ล็อกการเลื่อนหน้าด้านหลังตอนป็อปอัพเปิด
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  async function submit() {
    setBusy(true);
    setError('');
    setFieldErrors({});
    try {
      const body = { condition, paymentMethod: method };
      if (condition === 'damaged') body.damageNote = damageNote.trim(); // ชำรุด -> ระบบเปิดใบแจ้งซ่อมให้เอง
      await api(`/reservations/${id}/return`, { method: 'PATCH', body });
      onSuccess();
      onClose();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen || !reservation) return null;
  const game = gameName(reservation);
  const zone = typeof reservation.table === 'object' ? reservation.table?.zone : '';

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal checkout" role="dialog" aria-modal="true" aria-labelledby="co-title">
        <div className="co-head">
          <div className="co-title">
            <span className="co-icon" aria-hidden="true">
              🪑
            </span>
            <div>
              <h2 id="co-title">
                คืนโต๊ะ / เช็คบิล <small>(Table Checkout & Game Return)</small>
              </h2>
              <div className="co-badges">
                <span className="chip tone-available">
                  โต๊ะ {tableCode(reservation)}
                  {zone ? ` โซน${zone}` : ''}
                </span>
                <span className="chip tone-maintenance">Session #{id.slice(-6).toUpperCase()}</span>
                <span className="chip tone-reserved">พร้อมตรวจสอบ</span>
              </div>
            </div>
          </div>
          <button type="button" className="walkin-x" onClick={onClose} aria-label="ปิด">
            ✕
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="co-body">
          {/* ซ้าย: ตรวจสอบและคืนอุปกรณ์ */}
          <section className="co-col">
            <h3>การตรวจสอบและคืนอุปกรณ์</h3>
            <div className="co-game">
              <span className="co-cover" aria-hidden="true">
                🎲
              </span>
              <div>
                <small>BOARD GAME VAULT</small>
                <strong>{game || 'ลูกค้าไม่ได้เลือกเกม'}</strong>
                <small>ผู้เล่น {reservation.players} ท่าน</small>
              </div>
            </div>

            <div className="field">
              <span>สภาพโดยรวมของอุปกรณ์</span>
              <div className="co-toggle">
                <button
                  type="button"
                  className={condition === 'good' ? 'on' : ''}
                  onClick={() => setCondition('good')}
                >
                  ✓ ปกติสมบูรณ์ (Good)
                </button>
                <button
                  type="button"
                  className={condition === 'damaged' ? 'on bad' : ''}
                  onClick={() => setCondition('damaged')}
                >
                  ⚠ มีชำรุด / สูญหาย
                </button>
              </div>
            </div>

            {condition === 'damaged' && (
              <label className="field">
                <span>รายละเอียดชิ้นส่วนที่ชำรุด/สูญหาย</span>
                <textarea
                  className="input co-note"
                  rows={3}
                  placeholder="เช่น การ์ดหาย 2 ใบ (ระบบจะเปิดใบแจ้งซ่อมและปิดเกมนี้ให้อัตโนมัติ)"
                  value={damageNote}
                  onChange={(e) => setDamageNote(e.target.value)}
                />
                {fieldErrors.damageNote && (
                  <small className="field-error">{fieldErrors.damageNote[0]}</small>
                )}
              </label>
            )}
          </section>

          {/* ขวา: สรุปยอด */}
          <section className="co-col co-bill">
            <h3>สรุปยอดค่าบริการและการเงิน</h3>
            {loading && <p className="muted">กำลังคำนวณยอด...</p>}
            {!loading && !bill && <p className="muted">ไม่มีข้อมูลบิล</p>}
            {bill && (
              <>
                <div className="co-times">
                  <div>
                    <small>เริ่มเล่น (Start)</small>
                    <strong>{timeTH(bill.startedAt)} น.</strong>
                  </div>
                  <div>
                    <small>เวลาคืน (End)</small>
                    <strong>{timeTH(bill.endedAt)} น.</strong>
                    {bill.bookedHours != null && (
                      <span className="chip tone-available">{bill.bookedHours} ชม.</span>
                    )}
                  </div>
                </div>
                <div className="co-row">
                  <span>จำนวนผู้เล่น</span>
                  <b>{reservation.players} ท่าน</b>
                </div>
                <div className="co-row">
                  <span>เล่นจริง</span>
                  <b>{duration(bill.actualMinutes)}</b>
                </div>
                <div className="co-row">
                  <span>ค่าบริการตามที่จอง</span>
                  <b>฿{money(bill.bookedTotal)}</b>
                </div>
                {bill.overtimeCharge > 0 && (
                  <div className="co-row warn">
                    <span>ค่าล่วงเวลา ({bill.overtimeHours} ชม.)</span>
                    <b>+ ฿{money(bill.overtimeCharge)}</b>
                  </div>
                )}
                <div className="co-total">
                  <div className="co-total-top">
                    <span>รวมยอดสุทธิทั้งหมด</span>
                    <div className="co-pay">
                      {PAY.map((p) => (
                        <button
                          type="button"
                          key={p.key}
                          className={method === p.key ? 'on' : ''}
                          onClick={() => setMethod(p.key)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <strong>฿{money(bill.total)}</strong>
                </div>
                <p className="muted">ลูกค้า: {customerName(reservation)}</p>
              </>
            )}
          </section>
        </div>

        <div className="co-foot">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {stale ? 'ปิด' : 'ยกเลิก'}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={loading || busy || !bill || stale}
            onClick={submit}
          >
            {busy ? 'กำลังบันทึก...' : '✓ รับเงินและเคลียร์โต๊ะว่าง →'}
          </button>
        </div>
      </div>
    </div>
  );
}
