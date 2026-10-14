// "เล่นเสร็จแล้ว / คืนเกม": ดูยอดก่อนคืน (GET /checkout) → เลือกสภาพเกม → PATCH /return
import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { ResSummary, Row } from './ui.jsx';
import { BTN, baht, errText, minutesText } from './utils.js';
import { hoursLabel } from '../../../lib/booking.js';
import { timeTH } from '../../../lib/date.js';
import { checkoutPreview, returnGame } from '../../../services/api.js';
import FieldError from '../../FieldError.jsx';
import { useFieldErrors } from '../../../lib/useFieldErrors.js';
import { vText } from '../../../lib/validate.js';

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
  // เกมเสียหาย → ต้องบอกว่าเสียตรงไหน (≤ 500 ตัว ตาม returnBody.damageNote)
  const v = useFieldErrors({ note }, (f) => ({
    note: damaged
      ? vText(f.note, { required: true, max: 500, label: 'รายละเอียดความเสียหาย' })
      : '',
  }));

  async function submit() {
    if (busy) return;
    if (!v.submit()) return;
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
      if (!(err.status === 400 && v.server(err, { map: { damageNote: 'note' } }))) {
        setError(errText(err));
      }
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
            className={BTN.cta}
            onClick={submit}
            disabled={busy || loading || Boolean(loadError)}
          >
            <i className="fa-solid fa-box-archive" aria-hidden="true"></i>
            {busy ? 'กำลังบันทึก...' : hasGame ? 'คืนเกม' : 'เช็คบิล'}
          </button>
        </>
      }
    >
      <ResSummary r={r} />

      <div className="mt-4 rounded-2xl border border-ink/10 bg-cream-light p-4">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
          ค่าใช้จ่ายถึงตอนนี้
        </p>
        {loading ? (
          <div className="space-y-2 py-1" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-cream-dark" />
            ))}
          </div>
        ) : loadError ? (
          <p className="text-xs text-brick-dark">
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
                tone="text-brick-dark"
              />
            ) : (
              <Row label="เกินเวลา" value="ไม่มี" tone="text-forest" />
            )}
            <div className="my-1 border-t border-dashed border-ink/20" />
            <Row label="ยอดรวม" value={baht(bill.total)} strong />
            {bill.deposit ? (
              <>
                <Row label="หักมัดจำที่จ่ายแล้ว" value={`−${baht(bill.deposit)}`} />
                <Row
                  label="จ่ายที่เคาน์เตอร์"
                  value={baht(bill.balanceDue)}
                  strong
                  tone="text-forest"
                />
              </>
            ) : (
              <p className="mt-1 text-[11px] text-slate-600">จ่ายที่เคาน์เตอร์หลังคืนเกม</p>
            )}
          </>
        ) : null}
      </div>

      {hasGame && (
        <fieldset className="mt-4">
          <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            สภาพเกมตอนคืน
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                key: 'good',
                label: 'สภาพดี',
                icon: 'fa-circle-check',
                on: 'border-forest bg-forest-50 text-forest ring-2 ring-forest/20',
              },
              {
                key: 'damaged',
                label: 'เสียหาย / ของหาย',
                icon: 'fa-triangle-exclamation',
                on: 'border-mustard-dark bg-mustard-light text-ink ring-2 ring-mustard/30',
              },
            ].map((c) => (
              <label
                key={c.key}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-forest focus-within:ring-offset-2 ${
                  condition === c.key
                    ? c.on
                    : 'border-ink/15 bg-white text-slate-700 hover:border-forest/40'
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
                เสียหายตรงไหน <span className="text-brick-dark">*</span>
              </label>
              <textarea
                id="damage-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={2}
                required
                aria-required="true"
                placeholder="เช่น การ์ดหาย 2 ใบ, กล่องฉีก"
                {...v.bind('note')}
                className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-mustard-dark focus:outline-none focus:ring-2 focus:ring-mustard/40"
              />
              <FieldError id={v.errId('note')} msg={v.errors.note} />
              <p className="mt-1 text-[11px] text-slate-600">พนักงานจะตรวจสภาพเกมและส่งซ่อมให้</p>
            </div>
          )}
        </fieldset>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs font-semibold text-brick-dark">
          {error}
        </p>
      )}
    </Modal>
  );
}
