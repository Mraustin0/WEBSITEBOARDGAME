// ยืนยันยกเลิกการจอง (แทน window.confirm) + เหตุผล (ไม่บังคับ)
import { useState } from 'react';
import Modal from './Modal.jsx';
import { ResSummary } from './ui.jsx';
import { BTN, canSelfCancel, chip, cutoffText, dateLabel, errText, timeRange } from './utils.js';
import { cancelReservation } from '../../../services/api.js';
import FieldError from '../../FieldError.jsx';
import { useFieldErrors } from '../../../lib/useFieldErrors.js';
import { vText } from '../../../lib/validate.js';

const QUICK_REASONS = ['ติดธุระ', 'เปลี่ยนวันเล่น', 'เพื่อนมาไม่ครบ'];

export default function CancelModal({ r, rules, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // เช็คตอนเปิด modal (ถ้าเลยเวลาระหว่างเปิด server จะตอบ 409 และแสดงข้อความแทน)
  const [allowed] = useState(() => canSelfCancel(r, rules, Date.now()));
  const v = useFieldErrors({ reason }, (f) => ({
    reason: vText(f.reason, { max: 300, label: 'เหตุผล' }),
  }));

  async function submit() {
    if (busy || !allowed) return;
    if (!v.submit()) return;
    setBusy(true);
    setError('');
    try {
      await cancelReservation(r._id, reason.trim() || undefined);
      onDone();
    } catch (err) {
      if (!(err.status === 400 && v.server(err))) setError(errText(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      eyebrow="ยกเลิกการจอง"
      title="ยกเลิกการจองนี้?"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className={BTN.ghost} onClick={onClose} disabled={busy}>
            เก็บการจองไว้
          </button>
          <button type="button" className={BTN.danger} onClick={submit} disabled={busy || !allowed}>
            {busy ? 'กำลังยกเลิก...' : 'ยกเลิกการจอง'}
          </button>
        </>
      }
    >
      <ResSummary r={r} extra={`${dateLabel(r.startAt)} • ${timeRange(r)}`} />

      {allowed ? (
        <div className="mt-4">
          <label
            htmlFor="cancel-reason"
            className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
          >
            เหตุผล (ไม่บังคับ)
          </label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK_REASONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setReason(q)}
                className={chip(reason === q)}
              >
                {q}
              </button>
            ))}
          </div>
          <textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="บอกเหตุผลให้ร้านทราบ"
            {...v.bind('reason')}
            className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
          <div className="flex items-start justify-between gap-2">
            <FieldError id={v.errId('reason')} msg={v.errors.reason} className="mt-0.5" />
            <span className="ml-auto text-[10px] text-slate-500">{reason.length}/300</span>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-mustard/50 bg-mustard-light/60 p-3 text-xs font-semibold text-slate-800">
          <i
            className="fa-solid fa-triangle-exclamation mr-1.5 text-mustard-dark"
            aria-hidden="true"
          ></i>
          {cutoffText(rules)}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-xs font-semibold text-brick-dark">
          {error}
        </p>
      )}
    </Modal>
  );
}
