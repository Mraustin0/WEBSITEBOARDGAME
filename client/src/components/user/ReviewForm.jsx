// ฟอร์มให้คะแนนเกม (1–10) + ความเห็น — ใช้ทั้งหน้าคลังเกม และหลังเล่นเสร็จในหน้าการจองของฉัน
// POST /api/reviews (1 คน 1 รีวิวต่อเกม — ส่งซ้ำ = แก้รีวิวเดิม)
import { useState } from 'react';
import { submitReview } from '../../services/api.js';
import { thaiError } from '../../lib/booking.js';
import { BTN } from './brandUi.js';

export default function ReviewForm({ gameId, gameName, initial, onSaved, onCancel }) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    if (!rating) return setError('เลือกคะแนน 1–10 ก่อนส่ง');
    setBusy(true);
    setError('');
    try {
      const saved = await submitReview({ game: gameId, rating, comment: comment.trim() });
      onSaved?.(saved);
    } catch (err) {
      setError(err.status === 401 ? 'เข้าสู่ระบบก่อนเขียนรีวิว' : thaiError(err));
    } finally {
      setBusy(false);
    }
  }

  const shown = hover || rating;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {gameName && (
        <p className="text-sm text-slate-700">
          ให้คะแนน <strong className="font-heading font-normal text-forest">{gameName}</strong>
        </p>
      )}
      <div
        className="flex flex-wrap items-center gap-1"
        role="radiogroup"
        aria-label="คะแนน 1 ถึง 10"
        onMouseLeave={() => setHover(0)}
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} คะแนน`}
            onMouseEnter={() => setHover(n)}
            onClick={() => setRating(n)}
            className={`w-8 h-8 rounded-lg text-xs font-bold border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-1 ${
              n <= shown
                ? 'bg-mustard border-mustard-dark text-ink'
                : 'bg-cream-light border-ink/15 text-slate-500 hover:border-mustard'
            }`}
          >
            {n}
          </button>
        ))}
        <span className="ml-2 font-heading text-base text-forest">
          {shown ? `${shown}/10` : ''}
        </span>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="เล่นแล้วเป็นยังไงบ้าง (ไม่บังคับ)"
        className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
      />
      {error && <p className="text-xs text-brick-dark font-semibold">{error}</p>}
      <div className="flex flex-wrap gap-2 justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} className={BTN.ghost}>
            ยกเลิก
          </button>
        )}
        <button type="submit" disabled={busy} className={BTN.primary}>
          {busy ? 'กำลังบันทึก...' : initial ? 'แก้รีวิว' : 'ส่งรีวิว'}
        </button>
      </div>
    </form>
  );
}
