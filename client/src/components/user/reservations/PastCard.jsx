// แถวประวัติ: เล่นจบ (รีวิว / จองเกมนี้อีก) หรือ ยกเลิก / ไม่มาตามนัด (+เหตุผล)
import { GameCover, StatusBadge, TableLabel } from './ui.jsx';
import { BTN, baht, dateLabel, minutesText, resCode, timeRange } from './utils.js';

export default function PastCard({ r, review, onReview, onRebook }) {
  const done = r.status === 'completed';
  const total = r.checkout?.total ?? r.price?.total;
  const reason = r.cancelReason;

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-card sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 gap-3">
        <GameCover game={r.game} className={`h-14 w-14 ${done ? '' : 'opacity-60 grayscale'}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 truncate font-heading text-base text-ink">
              {r.game?.name ?? 'ไม่ได้เลือกเกม'}
            </p>
            <StatusBadge status={r.status} />
          </div>
          <p className="truncate text-[11px] text-slate-600">
            <TableLabel table={r.table} /> • {r.players} คน • {resCode(r._id)}
          </p>
          <p className="text-[11px] text-slate-600">
            {dateLabel(r.startAt)} • {timeRange(r)}
          </p>
          {done && (
            <p className="text-[11px] text-slate-600">
              {r.checkout?.actualMinutes != null &&
                `เล่นจริง ${minutesText(r.checkout.actualMinutes)} • `}
              ยอด <strong>{baht(total)}</strong>
              {r.checkout?.overtimeCharge > 0 && (
                <span className="text-brick-dark">
                  {' '}
                  (เกินเวลา +{baht(r.checkout.overtimeCharge)})
                </span>
              )}
              {r.payment?.status === 'paid' && (
                <span className="font-semibold text-forest"> • จ่ายแล้ว</span>
              )}
            </p>
          )}
          {!done && (
            <p className="text-[11px] text-slate-600">
              {r.status === 'cancelled' ? 'เหตุผล: ' : ''}
              {reason || (r.status === 'no_show' ? 'ไม่ได้มาตามเวลาที่จอง' : 'ไม่ระบุเหตุผล')}
            </p>
          )}
          {review && (
            <p className="mt-1 inline-flex items-center rounded-full border border-mustard/60 bg-mustard-light px-2 py-0.5 text-[11px] font-semibold text-ink">
              <i className="fa-solid fa-star mr-1 text-mustard-dark" aria-hidden="true"></i>
              รีวิวของคุณ {review.rating}/10
            </p>
          )}
        </div>
      </div>
      {r.game && (
        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch">
          {done && (
            <button
              type="button"
              onClick={() => onReview(r.game, review)}
              className={BTN.secondary}
            >
              <i className="fa-solid fa-star text-mustard-dark" aria-hidden="true"></i>
              {review ? 'แก้รีวิว' : 'รีวิวเกมนี้'}
            </button>
          )}
          <button type="button" onClick={() => onRebook(r.game)} className={BTN.secondary}>
            <i className="fa-solid fa-rotate-right" aria-hidden="true"></i>
            จองเกมนี้อีกครั้ง
          </button>
        </div>
      )}
    </article>
  );
}
