// การ์ดการจองล่วงหน้า (status = booked): แก้เวลา / เปลี่ยนเกม / ยกเลิก / ชวนเพื่อน
import { GameCover, StatusBadge, TableLabel } from './ui.jsx';
import {
  BTN,
  baht,
  canSelfCancel,
  countdownLabel,
  cutoffText,
  dateLabel,
  resCode,
  timeRange,
} from './utils.js';
import { hoursLabel } from '../../../lib/booking.js';

export default function UpcomingCard({ r, now, rules, onEdit, onChangeGame, onCancel, onShare }) {
  const cancellable = canSelfCancel(r, rules, now);
  const startsSoon = new Date(r.startAt).getTime() - now < 3_600_000;

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-card transition hover:border-forest/40 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base text-forest">
              <TableLabel table={r.table} />
            </h3>
            {r.confirmedAt ? (
              <span className="whitespace-nowrap rounded-full bg-teal px-2.5 py-0.5 text-[10px] font-bold text-white">
                ร้านยืนยันแล้ว
              </span>
            ) : (
              <StatusBadge status="booked" />
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-600">
            {r.table?.zone ? `โซน ${r.table.zone} • ` : ''}รหัส {resCode(r._id)}
          </p>
        </div>
        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${
            startsSoon
              ? 'border border-mustard/60 bg-mustard-light text-ink'
              : 'border border-ink/10 bg-cream-light text-slate-600'
          }`}
        >
          {countdownLabel(r.startAt, now)}
        </span>
      </div>

      <div className="flex gap-3 rounded-xl border border-ink/10 bg-cream-light p-3">
        <GameCover game={r.game} className="h-14 w-14" />
        <div className="min-w-0 flex-1 space-y-1 text-[12px] text-slate-700">
          <p className="flex items-center gap-2">
            <i className="fa-regular fa-calendar w-3.5 text-brick-dark" aria-hidden="true"></i>
            <strong>{dateLabel(r.startAt)}</strong>
          </p>
          <p className="flex items-center gap-2">
            <i className="fa-regular fa-clock w-3.5 text-brick-dark" aria-hidden="true"></i>
            {timeRange(r)} ({hoursLabel(r.durationHours)})
          </p>
          <p className="flex min-w-0 items-center gap-2">
            <i className="fa-solid fa-dice w-3.5 text-brick-dark" aria-hidden="true"></i>
            <span className="truncate">
              {r.game?.name ?? 'ยังไม่เลือกเกม'} • {r.players} คน
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
        <span className="text-slate-500">
          ราคา{' '}
          <strong className="font-heading text-base text-forest">{baht(r.price?.total)}</strong>
        </span>
        <span className="text-slate-600">จ่ายที่ร้านหลังเล่น</span>
      </div>
      {r.note && <p className="-mt-2 truncate text-[11px] text-slate-500">หมายเหตุ: {r.note}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3">
        <button
          type="button"
          onClick={() => onShare(r)}
          aria-label="ชวนเพื่อน แชร์รายละเอียดการจอง"
          className="mr-auto inline-flex items-center gap-1.5 rounded-full px-1 text-xs font-semibold text-teal-dark hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
        >
          <i className="fa-solid fa-share-nodes" aria-hidden="true"></i>
          ชวนเพื่อน
        </button>
        <button type="button" onClick={() => onEdit(r)} className={BTN.secondary}>
          แก้เวลา/ผู้เล่น
        </button>
        <button type="button" onClick={() => onChangeGame(r)} className={BTN.secondary}>
          {r.game ? 'เปลี่ยนเกม' : 'เลือกเกม'}
        </button>
        <button
          type="button"
          onClick={() => onCancel(r)}
          disabled={!cancellable}
          title={cancellable ? undefined : cutoffText(rules)}
          className={BTN.dangerSoft}
        >
          ยกเลิกการจอง
        </button>
      </div>
      {!cancellable && (
        <p className="-mt-2 text-[11px] text-slate-700">
          <i className="fa-solid fa-circle-info mr-1 text-mustard-dark" aria-hidden="true"></i>
          {cutoffText(rules)}
        </p>
      )}
    </article>
  );
}
