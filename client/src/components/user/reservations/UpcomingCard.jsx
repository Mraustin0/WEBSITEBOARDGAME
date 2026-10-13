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
    <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold">
              <TableLabel table={r.table} />
            </h3>
            {r.confirmedAt ? (
              <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                ร้านยืนยันแล้ว
              </span>
            ) : (
              <StatusBadge status="booked" />
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {r.table?.zone ? `โซน ${r.table.zone} • ` : ''}รหัส {resCode(r._id)}
          </p>
        </div>
        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${
            startsSoon ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {countdownLabel(r.startAt, now)}
        </span>
      </div>

      <div className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
        <GameCover game={r.game} className="h-14 w-14" />
        <div className="min-w-0 flex-1 space-y-1 text-[12px] text-slate-700">
          <p className="flex items-center gap-2">
            <i className="fa-regular fa-calendar w-3.5 text-emerald-700" aria-hidden="true"></i>
            <strong>{dateLabel(r.startAt)}</strong>
          </p>
          <p className="flex items-center gap-2">
            <i className="fa-regular fa-clock w-3.5 text-emerald-700" aria-hidden="true"></i>
            {timeRange(r)} ({hoursLabel(r.durationHours)})
          </p>
          <p className="flex min-w-0 items-center gap-2">
            <i className="fa-solid fa-dice w-3.5 text-emerald-700" aria-hidden="true"></i>
            <span className="truncate">
              {r.game?.name ?? 'ยังไม่เลือกเกม'} • {r.players} คน
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">
          ราคา <strong className="text-sm text-emerald-950">{baht(r.price?.total)}</strong>
        </span>
        {r.price?.deposit ? (
          <span className="text-slate-500">
            มัดจำ {baht(r.price.deposit)} • จ่ายที่ร้าน {baht(r.price.dueAtCounter)}
          </span>
        ) : null}
      </div>
      {r.note && <p className="-mt-2 truncate text-[11px] text-slate-500">หมายเหตุ: {r.note}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => onShare(r)}
          aria-label="ชวนเพื่อน แชร์รายละเอียดการจอง"
          className="mr-auto inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
        >
          <i className="fa-solid fa-share-nodes" aria-hidden="true"></i>
          ชวนเพื่อน
        </button>
        <button type="button" onClick={() => onEdit(r)} className={BTN.secondary}>
          แก้เวลา/คน
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
          ยกเลิก
        </button>
      </div>
      {!cancellable && (
        <p className="-mt-2 text-[11px] text-amber-700">
          <i className="fa-solid fa-circle-info mr-1" aria-hidden="true"></i>
          {cutoffText(rules)}
        </p>
      )}
    </article>
  );
}
