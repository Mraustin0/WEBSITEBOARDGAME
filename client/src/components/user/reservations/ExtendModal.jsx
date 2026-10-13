// ขอต่อเวลา +0.5 / +1 / +2 ชม. (เฉพาะโต๊ะที่กำลังเล่น) — แสดงเวลาจบใหม่จากผลของ server
import { useState } from 'react';
import Modal from './Modal.jsx';
import { ResSummary, Row } from './ui.jsx';
import { BTN, baht, chip, errText } from './utils.js';
import { hoursLabel } from '../../../lib/booking.js';
import { timeTH } from '../../../lib/date.js';
import { extendReservation } from '../../../services/api.js';

const OPTIONS = [0.5, 1, 2];
const HOUR = 3_600_000;

export default function ExtendModal({ r, rules, onClose, onDone }) {
  const maxHours = rules?.MAX_HOURS ?? 6;
  const fits = (h) => r.durationHours + h <= maxHours;
  const [hours, setHours] = useState(() => OPTIONS.find(fits) ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function submit() {
    if (busy || !hours) return;
    setBusy(true);
    setError('');
    try {
      const updated = await extendReservation(r._id, hours);
      setResult(updated);
      onDone(updated);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  const previewEnd = hours ? new Date(new Date(r.endAt).getTime() + hours * HOUR) : null;
  const lastCharge = result?.extensions?.slice(-1)[0]?.charge;

  return (
    <Modal
      eyebrow="ต่อเวลา"
      title={result ? 'ต่อเวลาเรียบร้อย' : 'ขอต่อเวลาเล่น'}
      onClose={onClose}
      busy={busy}
      size="max-w-md"
      footer={
        result ? (
          <button type="button" className={BTN.primary} onClick={onClose}>
            เรียบร้อย
          </button>
        ) : (
          <>
            <button type="button" className={BTN.ghost} onClick={onClose} disabled={busy}>
              ยกเลิก
            </button>
            <button
              type="button"
              className={BTN.primary}
              onClick={submit}
              disabled={busy || !hours}
            >
              {busy ? 'กำลังต่อเวลา...' : `ต่อเวลา ${hours ? `+${hoursLabel(hours)}` : ''}`}
            </button>
          </>
        )
      }
    >
      <ResSummary r={r} extra={`จบเดิม ${timeTH(r.endAt)} น.`} />

      {result ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <Row label="เล่นได้ถึง" value={`${timeTH(result.endAt)} น.`} strong />
          <Row label="รวมเวลาจอง" value={hoursLabel(result.durationHours)} />
          {lastCharge != null && <Row label="ค่าต่อเวลา" value={`+${baht(lastCharge)}`} />}
          <Row label="ยอดรวมใหม่" value={baht(result.price?.total)} strong />
        </div>
      ) : (
        <>
          <p className="mb-2 mt-4 text-xs font-bold text-slate-700">ต่อเพิ่ม</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="จำนวนชั่วโมงที่ต่อ">
            {OPTIONS.map((h) => (
              <button
                key={h}
                type="button"
                role="radio"
                aria-checked={hours === h}
                disabled={!fits(h)}
                onClick={() => setHours(h)}
                className={chip(hours === h, !fits(h))}
              >
                +{hoursLabel(h)}
              </button>
            ))}
          </div>
          {!OPTIONS.every(fits) && (
            <p className="mt-2 text-[11px] text-slate-500">
              เล่นรวมได้ไม่เกิน {maxHours} ชม. — ต้องการมากกว่านี้ติดต่อพนักงาน
            </p>
          )}
          {previewEnd && (
            <p className="mt-3 text-sm text-slate-600">
              จะเล่นได้ถึงประมาณ{' '}
              <strong className="text-emerald-900">{timeTH(previewEnd.toISOString())} น.</strong>{' '}
              (คิดค่าต่อเวลาตามอัตราเดิม)
            </p>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="mt-3 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
    </Modal>
  );
}
