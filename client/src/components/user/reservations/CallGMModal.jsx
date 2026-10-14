// เรียก GM / พนักงานมาที่โต๊ะ — เลือกเรื่อง + ข้อความ (ไม่บังคับ) → POST /assist
import { useState } from 'react';
import Modal from './Modal.jsx';
import { ResSummary } from './ui.jsx';
import { ASSIST_TOPICS, BTN, errText } from './utils.js';
import { callGM } from '../../../services/api.js';
import FieldError from '../../FieldError.jsx';
import { useFieldErrors } from '../../../lib/useFieldErrors.js';
import { vText } from '../../../lib/validate.js';

export default function CallGMModal({ r, pendingTopics = [], onClose, onDone }) {
  const [topic, setTopic] = useState(
    () => ASSIST_TOPICS.find((t) => !pendingTopics.includes(t.key))?.key ?? null,
  );
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const v = useFieldErrors({ note }, (f) => ({
    note: vText(f.note, { max: 500, label: 'รายละเอียด' }),
  }));

  async function submit() {
    if (busy || !topic) return;
    if (!v.submit()) return;
    setBusy(true);
    setError('');
    try {
      await callGM(r._id, topic, note.trim());
      onDone(ASSIST_TOPICS.find((t) => t.key === topic)?.label ?? '');
    } catch (err) {
      if (!(err.status === 400 && v.server(err))) setError(errText(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      eyebrow="เรียกพนักงาน"
      title="เรียกพนักงานมาที่โต๊ะ"
      onClose={onClose}
      busy={busy}
      size="max-w-md"
      footer={
        <>
          <button type="button" className={BTN.ghost} onClick={onClose} disabled={busy}>
            ยกเลิก
          </button>
          <button type="button" className={BTN.primary} onClick={submit} disabled={busy || !topic}>
            <i className="fa-solid fa-bell-concierge" aria-hidden="true"></i>
            {busy ? 'กำลังเรียก...' : 'เรียกพนักงาน'}
          </button>
        </>
      }
    >
      <ResSummary r={r} />
      <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-600">
        ให้ช่วยเรื่องอะไร
      </p>
      <div
        className="grid grid-cols-2 gap-2"
        role="radiogroup"
        aria-label="เรื่องที่ต้องการให้ช่วย"
      >
        {ASSIST_TOPICS.map((t) => {
          const pending = pendingTopics.includes(t.key);
          const on = topic === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={pending}
              onClick={() => setTopic(t.key)}
              className={`flex items-center gap-2 rounded-2xl border p-3 text-left text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 ${
                pending
                  ? 'cursor-not-allowed border-ink/5 bg-cream-light text-slate-400'
                  : on
                    ? 'border-forest bg-forest text-white shadow-sm'
                    : 'border-ink/15 bg-cream-light text-slate-700 hover:border-forest/50 hover:bg-cream'
              }`}
            >
              <i className={`fa-solid ${t.icon} w-4 text-center`} aria-hidden="true"></i>
              <span className="min-w-0">
                {t.label}
                {pending && <span className="block text-[10px] font-normal">เรียกไปแล้ว</span>}
              </span>
            </button>
          );
        })}
      </div>
      <label
        htmlFor="gm-note"
        className="mb-1 mt-4 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
      >
        รายละเอียด (ไม่บังคับ)
      </label>
      <textarea
        id="gm-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="เช่น ช่วยสอนกติกาตาแรกหน่อย"
        {...v.bind('note')}
        className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
      />
      <div className="flex items-start justify-between gap-2">
        <FieldError id={v.errId('note')} msg={v.errors.note} className="mt-0.5" />
        <span className="ml-auto text-[10px] text-slate-500">{note.length}/500</span>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-xs font-semibold text-brick-dark">
          {error}
        </p>
      )}
    </Modal>
  );
}
