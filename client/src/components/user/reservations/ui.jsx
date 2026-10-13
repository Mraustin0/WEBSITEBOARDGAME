// ชิ้นส่วน UI เล็ก ๆ ที่ใช้ร่วมกันในหน้าการจองของฉัน
import { coverOf, STATUS } from './utils.js';

/** ปกเกม (image || thumbnail) หรือไอคอนแทนถ้าไม่มีรูป / ไม่ได้เลือกเกม */
export function GameCover({ game, className = 'w-16 h-16' }) {
  const src = coverOf(game);
  return (
    <div
      className={`${className} shrink-0 overflow-hidden rounded-xl border border-ink/10 bg-cream text-forest flex items-center justify-center`}
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
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold ${s.cls}`}
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
          className="animate-pulse rounded-2xl border border-ink/10 bg-white p-5 shadow-card"
        >
          <div className="flex gap-4">
            <div className="h-16 w-16 rounded-xl bg-cream" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 rounded bg-cream-dark" />
              <div className="h-3 w-3/4 rounded bg-cream" />
              <div className="h-3 w-1/3 rounded bg-cream" />
            </div>
          </div>
          <div className="mt-4 h-9 rounded-full bg-cream" />
        </div>
      ))}
    </div>
  );
}

/** art = ไอคอนแบรนด์ (เช่น <CalendarIcon />) — ไม่ส่งมาจะใช้ไอคอน Font Awesome */
export function EmptyState({ icon = 'fa-calendar-xmark', art, title, text, action }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-ink/15 bg-cream-light px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-ink/10 bg-white text-3xl text-forest shadow-card">
        {art ?? <i className={`fa-solid ${icon}`} aria-hidden="true"></i>}
      </div>
      <p className="font-heading text-lg text-forest">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">{text}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** แถว label : value ในใบสรุป */
export function Row({ label, value, strong = false, tone = '' }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="min-w-0 text-slate-600">{label}</span>
      <span
        className={`shrink-0 text-right ${strong ? 'font-heading text-base text-forest' : 'font-semibold'} ${tone}`}
      >
        {value}
      </span>
    </div>
  );
}

/** สรุปการจองสั้น ๆ ที่หัว modal */
export function ResSummary({ r, extra }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-cream-light p-3">
      <GameCover game={r.game} className="h-12 w-12" />
      <div className="min-w-0 flex-1 text-xs">
        <p className="truncate font-heading text-sm text-forest">
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
