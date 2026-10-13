// เรียก GM / พนักงานมาที่โต๊ะ — เลือกเรื่อง + ข้อความ (ไม่บังคับ) → POST /assist
import { useState } from 'react';
import Modal from './Modal.jsx';
import { ResSummary } from './ui.jsx';
import { ASSIST_TOPICS, BTN, errText } from './utils.js';
import { callGM } from '../../../services/api.js';

export default function CallGMModal({ r, pendingTopics = [], onClose, onDone }) {
  const [topic, setTopic] = useState(
    () => ASSIST_TOPICS.find((t) => !pendingTopics.includes(t.key))?.key ?? null,
  );
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (busy || !topic) return;
    setBusy(true);
    setError('');
    try {
      await callGM(r._id, topic, note.trim());
      onDone(ASSIST_TOPICS.find((t) => t.key === topic)?.label ?? '');
    } catch (err) {
      setError(errText(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      eyebrow="เรียกพนักงาน"
      title="เรียก GM มาที่โต๊ะ"
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
            {busy ? 'กำลังเรียก...' : 'เรียก GM'}
          </button>
        </>
      }
    >
      <ResSummary r={r} />
      <p className="mb-2 mt-4 text-xs font-bold text-slate-700">ต้องการให้ช่วยเรื่อง</p>
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
              className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-semibold transition ${
                pending
                  ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
                  : on
                    ? 'border-[#064e3b] bg-[#064e3b] text-white'
                    : 'border-slate-200 text-slate-700 hover:border-emerald-400'
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
      <label htmlFor="gm-note" className="mb-1 mt-4 block text-xs font-bold text-slate-700">
        รายละเอียด (ไม่บังคับ)
      </label>
      <textarea
        id="gm-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="เช่น ขอคนสอนกติการอบแรก"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      {error && (
        <p role="alert" className="mt-3 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
    </Modal>
  );
}
