// ยืนยันยกเลิกการจอง (แทน window.confirm) + เหตุผล (ไม่บังคับ)
import { useState } from 'react';
import Modal from './Modal.jsx';
import { ResSummary } from './ui.jsx';
import { BTN, canSelfCancel, cutoffText, dateLabel, errText, timeRange } from './utils.js';
import { cancelReservation } from '../../../services/api.js';

const QUICK_REASONS = ['ติดธุระ', 'เปลี่ยนวันเล่น', 'เพื่อนมาไม่ครบ'];

export default function CancelModal({ r, rules, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // เช็คตอนเปิด modal (ถ้าเลยเวลาระหว่างเปิด server จะตอบ 409 และแสดงข้อความแทน)
  const [allowed] = useState(() => canSelfCancel(r, rules, Date.now()));

  async function submit() {
    if (busy || !allowed) return;
    setBusy(true);
    setError('');
    try {
      await cancelReservation(r._id, reason.trim() || undefined);
      onDone();
    } catch (err) {
      setError(errText(err));
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
          <label htmlFor="cancel-reason" className="mb-1.5 block text-xs font-bold text-slate-700">
            เหตุผล (ไม่บังคับ)
          </label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK_REASONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setReason(q)}
                className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:border-emerald-400"
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
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
          <i className="fa-solid fa-triangle-exclamation mr-1.5" aria-hidden="true"></i>
          {cutoffText(rules)}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
    </Modal>
  );
}
