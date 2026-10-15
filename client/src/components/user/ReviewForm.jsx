// ฟอร์มให้คะแนนเกม (1–10) + ความเห็น — ใช้ทั้งหน้าคลังเกม และหลังเล่นเสร็จในหน้าการจองของฉัน
// POST /api/reviews (1 คน 1 รีวิวต่อเกม — ส่งซ้ำ = แก้รีวิวเดิม)
import { useState } from 'react';
import { submitReview } from '../../services/api.js';
import { thaiError } from '../../lib/booking.js';
import { BTN } from './brandUi.js';
import FieldError from '../FieldError.jsx';
import { useFieldErrors } from '../../lib/useFieldErrors.js';
import { vNumber, vText } from '../../lib/validate.js';

export default function ReviewForm({ gameId, gameName, initial, onSaved, onCancel }) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const v = useFieldErrors({ rating, comment }, (f) => ({
    rating: f.rating
      ? vNumber(f.rating, { min: 1, max: 10, integer: true, label: 'คะแนน' })
      : 'เลือกคะแนน 1–10 ก่อนส่ง',
    comment: vText(f.comment, { max: 2000, label: 'ความเห็น' }),
  }));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!v.submit()) return;
    setBusy(true);
    try {
      const saved = await submitReview({ game: gameId, rating, comment: comment.trim() });
      onSaved?.(saved);
    } catch (err) {
      if (err.status === 400 && v.server(err)) return;
      setError(err.status === 401 ? 'เข้าสู่ระบบก่อนเขียนรีวิว' : thaiError(err));
    } finally {
      setBusy(false);
    }
  }

  const shown = hover || rating;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      {gameName && (
        <p className="text-sm text-slate-700">
          ให้คะแนน <strong className="font-heading font-normal text-forest">{gameName}</strong>
        </p>
      )}
      <div>
        <div
          className={`flex flex-wrap items-center gap-1 rounded-lg focus:outline-none ${
            v.errors.rating ? 'ring-2 ring-brick/60 ring-offset-2 ring-offset-cream-light' : ''
          }`}
          role="radiogroup"
          aria-label="คะแนน 1 ถึง 10"
          aria-required="true"
          tabIndex={-1}
          onMouseLeave={() => setHover(0)}
          {...v.bind('rating')}
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
        <FieldError id={v.errId('rating')} msg={v.errors.rating} />
      </div>
      <div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="เล่นแล้วเป็นยังไงบ้าง (ไม่บังคับ)"
          aria-label="ความเห็น"
          {...v.bind('comment')}
          className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
        />
        <div className="flex items-start justify-between gap-2">
          <FieldError id={v.errId('comment')} msg={v.errors.comment} className="mt-0.5" />
          <span className="ml-auto text-[10px] text-slate-500">{comment.length}/2000</span>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-brick-dark font-semibold">
          {error}
        </p>
      )}
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
