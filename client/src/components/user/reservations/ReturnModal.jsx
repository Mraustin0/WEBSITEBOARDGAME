// "เล่นเสร็จแล้ว / คืนเกม": ดูยอดก่อนคืน (GET /checkout) → เลือกสภาพเกม → PATCH /return
import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { ResSummary, Row } from './ui.jsx';
import { BTN, baht, errText, minutesText } from './utils.js';
import { hoursLabel } from '../../../lib/booking.js';
import { timeTH } from '../../../lib/date.js';
import { checkoutPreview, returnGame } from '../../../services/api.js';

export default function ReturnModal({ r, onClose, onDone }) {
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [condition, setCondition] = useState('good');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const id = r._id;
  const hasGame = Boolean(r.game);

  useEffect(() => {
    let alive = true;
    checkoutPreview(id)
      .then((res) => {
        if (!alive) return;
        setBill(res?.bill ?? null);
        setLoadError('');
      })
      .catch((err) => alive && setLoadError(errText(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, retry]);

  const damaged = hasGame && condition === 'damaged';
  const noteMissing = damaged && !note.trim();

  async function submit() {
    if (busy) return;
    if (noteMissing) {
      setError('ระบุหน่อยว่าเสียหายตรงไหน');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const updated = await returnGame(
        id,
        hasGame ? condition : 'good',
        damaged ? note.trim() : '',
      );
      onDone(updated, { damaged });
    } catch (err) {
      setError(errText(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      eyebrow="เช็คบิล"
      title={hasGame ? 'คืนเกมและเช็คบิล' : 'เช็คบิล'}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className={BTN.ghost} onClick={onClose} disabled={busy}>
            ยังเล่นต่อ
          </button>
          <button
            type="button"
            className={BTN.primary}
            onClick={submit}
            disabled={busy || loading || Boolean(loadError) || noteMissing}
          >
            <i className="fa-solid fa-box-archive" aria-hidden="true"></i>
            {busy ? 'กำลังบันทึก...' : hasGame ? 'คืนเกม' : 'เช็คบิล'}
          </button>
        </>
      }
    >
      <ResSummary r={r} />

      <div className="mt-4 rounded-2xl border border-slate-200 p-4">
        <p className="mb-1 text-xs font-bold text-slate-700">ค่าใช้จ่ายถึงตอนนี้</p>
        {loading ? (
          <div className="space-y-2 py-1" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : loadError ? (
          <p className="text-xs text-red-600">
            {loadError}{' '}
            <button
              type="button"
              className="font-bold underline"
              onClick={() => {
                setLoading(true);
                setRetry((n) => n + 1);
              }}
            >
              ลองใหม่
            </button>
          </p>
        ) : bill ? (
          <>
            <Row
              label="เวลาเล่น"
              value={`${timeTH(bill.startedAt)}–${timeTH(bill.endedAt)} น. (${minutesText(bill.actualMinutes)})`}
            />
            <Row label="เวลาที่จอง" value={hoursLabel(bill.bookedHours)} />
            <Row label="ค่าเล่นตามเวลาที่จอง" value={baht(bill.bookedTotal)} />
            {bill.overtimeHours > 0 ? (
              <Row
                label={`เกินเวลา ${hoursLabel(bill.overtimeHours)}`}
                value={`+${baht(bill.overtimeCharge)}`}
                tone="text-red-600"
              />
            ) : (
              <Row label="เกินเวลา" value="ไม่มี" tone="text-emerald-700" />
            )}
            <div className="my-1 border-t border-dashed border-slate-200" />
            <Row label="ยอดรวม" value={baht(bill.total)} strong />
            {bill.deposit ? (
              <>
                <Row label="หักมัดจำที่จ่ายแล้ว" value={`−${baht(bill.deposit)}`} />
                <Row
                  label="จ่ายที่เคาน์เตอร์"
                  value={baht(bill.balanceDue)}
                  strong
                  tone="text-emerald-800"
                />
              </>
            ) : (
              <p className="mt-1 text-[11px] text-slate-500">จ่ายที่เคาน์เตอร์หลังคืนเกม</p>
            )}
          </>
        ) : null}
      </div>

      {hasGame && (
        <fieldset className="mt-4">
          <legend className="mb-1.5 text-xs font-bold text-slate-700">สภาพเกมตอนคืน</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                key: 'good',
                label: 'สภาพดี',
                icon: 'fa-circle-check',
                on: 'border-emerald-600 bg-emerald-50 text-emerald-900',
              },
              {
                key: 'damaged',
                label: 'เสียหาย / ของหาย',
                icon: 'fa-triangle-exclamation',
                on: 'border-amber-500 bg-amber-50 text-amber-900',
              },
            ].map((c) => (
              <label
                key={c.key}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-emerald-500 ${
                  condition === c.key
                    ? c.on
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="return-condition"
                  value={c.key}
                  checked={condition === c.key}
                  onChange={() => {
                    setCondition(c.key);
                    setError('');
                  }}
                  className="sr-only"
                />
                <i className={`fa-solid ${c.icon}`} aria-hidden="true"></i>
                {c.label}
              </label>
            ))}
          </div>
          {damaged && (
            <div className="mt-2">
              <label
                htmlFor="damage-note"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                เสียหายตรงไหน <span className="text-red-600">*</span>
              </label>
              <textarea
                id="damage-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={2}
                required
                placeholder="เช่น การ์ดหาย 2 ใบ, กล่องฉีก"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">พนักงานจะตรวจสภาพเกมและส่งซ่อมให้</p>
            </div>
          )}
        </fieldset>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
    </Modal>
  );
}
