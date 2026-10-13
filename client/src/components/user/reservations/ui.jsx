// ชิ้นส่วน UI เล็ก ๆ ที่ใช้ร่วมกันในหน้าการจองของฉัน
import { coverOf, STATUS } from './utils.js';

/** ปกเกม (image || thumbnail) หรือไอคอนแทนถ้าไม่มีรูป / ไม่ได้เลือกเกม */
export function GameCover({ game, className = 'w-16 h-16' }) {
  const src = coverOf(game);
  return (
    <div
      className={`${className} shrink-0 overflow-hidden rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center`}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <i
          className={`fa-solid ${game ? 'fa-dice' : 'fa-chess-board'} text-xl`}
          aria-hidden="true"
        ></i>
      )}
    </div>
  );
}

export function StatusBadge({ status }) {
  const s = STATUS[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

export function TableLabel({ table }) {
  if (!table) return <span>โต๊ะ —</span>;
  return (
    <span>
      โต๊ะ {table.code}
      {table.name ? ` • ${table.name}` : ''}
    </span>
  );
}

export function ListSkeleton({ rows = 2 }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="กำลังโหลด">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex gap-4">
            <div className="h-16 w-16 rounded-xl bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 rounded bg-slate-200" />
              <div className="h-3 w-3/4 rounded bg-slate-100" />
              <div className="h-3 w-1/3 rounded bg-slate-100" />
            </div>
          </div>
          <div className="mt-4 h-9 rounded-xl bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = 'fa-calendar-xmark', title, text, action }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700">
        <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
      </div>
      <p className="text-base font-bold text-slate-800">{title}</p>
      {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** แถว label : value ในใบสรุป */
export function Row({ label, value, strong = false, tone = '' }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`text-right ${strong ? 'text-base font-bold' : 'font-semibold'} ${tone}`}>
        {value}
      </span>
    </div>
  );
}

/** สรุปการจองสั้น ๆ ที่หัว modal */
export function ResSummary({ r, extra }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <GameCover game={r.game} className="h-12 w-12" />
      <div className="min-w-0 flex-1 text-xs">
        <p className="truncate text-sm font-bold text-emerald-950">
          <TableLabel table={r.table} />
        </p>
        <p className="truncate text-slate-500">
          {r.game?.name ?? 'ยังไม่เลือกเกม'} • {r.players} คน
        </p>
        {extra && <p className="mt-0.5 text-slate-500">{extra}</p>}
      </div>
    </div>
  );
}
