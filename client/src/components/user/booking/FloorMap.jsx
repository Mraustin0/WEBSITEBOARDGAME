// ผังโต๊ะ (สร้างจากโต๊ะจริงใน GET /tables/floor) แยกตามโซน + คำอธิบายสี
import { timeTH } from '../../../lib/date.js';

const CLOSED_STRIPES = {
  backgroundImage: 'repeating-linear-gradient(135deg, #f3f0e1 0 8px, #e6e0c8 8px 16px)',
};

// สถานะโต๊ะ: ว่าง = teal · จองแล้ว = มัสตาร์ด · กำลังเล่น = แดงอิฐ · ปิด = เทาอุ่นลายทาง (มีป้ายข้อความเสมอ)
export const STATE_META = {
  available: {
    label: 'ว่าง',
    badge: 'bg-teal-light text-teal-dark border-teal/40',
    tile: 'bg-white border-teal/40 hover:border-teal hover:shadow-card cursor-pointer',
    swatch: 'bg-white border-2 border-teal',
  },
  reserved: {
    label: 'จองแล้ว',
    badge: 'bg-mustard text-ink border-mustard-dark/50',
    tile: 'bg-mustard-light/50 border-mustard/60 text-slate-600 cursor-not-allowed',
    swatch: 'bg-mustard-light border border-mustard-dark',
  },
  occupied: {
    label: 'กำลังเล่น',
    badge: 'bg-brick-dark text-white border-brick-dark',
    tile: 'bg-brick-light/50 border-brick/50 cursor-not-allowed',
    swatch: 'bg-brick-light border border-brick-dark',
  },
  closed: {
    label: 'ปิดใช้งาน',
    badge: 'bg-slate-200 text-slate-700 border-slate-300',
    tile: 'border-slate-300 text-slate-500 cursor-not-allowed',
    swatch: 'border border-slate-400',
  },
  too_small: {
    label: 'ที่นั่งไม่พอ',
    badge: 'bg-white text-brick-dark border-brick/40',
    tile: 'bg-white border-dashed border-slate-300 opacity-70 cursor-not-allowed',
    swatch: 'bg-white border border-dashed border-brick',
  },
};

/** เหตุที่เลือกโต๊ะนี้ไม่ได้ (null = เลือกได้) */
export function tableBlock(t, players) {
  if (!t) return 'closed';
  if (t.state && t.state !== 'available') return t.state in STATE_META ? t.state : 'closed';
  if (players > (t.capacity ?? 0)) return 'too_small';
  return null;
}

const byCode = (a, b) =>
  String(a.code).localeCompare(String(b.code), undefined, { numeric: true, sensitivity: 'base' });

export function FloorLegend() {
  return (
    <ul
      aria-label="ความหมายสีโต๊ะ"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold text-slate-700 bg-cream-light px-4 py-2.5 rounded-2xl border border-ink/10"
    >
      <li className="flex items-center gap-1.5">
        <span className="w-4 h-4 rounded bg-forest border-2 border-forest flex items-center justify-center">
          <i className="fa-solid fa-check text-[8px] text-white" aria-hidden="true"></i>
        </span>
        <span className="text-forest">เลือกแล้ว</span>
      </li>
      {['available', 'reserved', 'occupied', 'closed', 'too_small'].map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`w-4 h-4 rounded ${STATE_META[k].swatch}`}
            style={k === 'closed' ? CLOSED_STRIPES : undefined}
          ></span>
          <span>{STATE_META[k].label}</span>
        </li>
      ))}
    </ul>
  );
}

function stateNote(t) {
  if (t.state === 'occupied' && t.current?.endAt) return `เล่นถึง ${timeTH(t.current.endAt)}`;
  if (t.state === 'reserved' && t.reservations?.length) {
    const r = t.reservations[0];
    return `จอง ${timeTH(r.startAt)}–${timeTH(r.endAt)}`;
  }
  return null;
}

function TableTile({ table: t, players, selected, onSelect }) {
  const block = tableBlock(t, players);
  const key = selected ? null : block || 'available';
  const meta = key ? STATE_META[key] : null;
  const round = t.shape === 'round';
  const seats = Math.min(t.capacity ?? 0, 8);
  const note = stateNote(t);

  return (
    <button
      type="button"
      disabled={Boolean(block)}
      aria-pressed={selected}
      aria-label={`โต๊ะ ${t.code} ${t.name || ''} นั่งได้ ${t.capacity} คน — ${
        selected ? 'เลือกแล้ว' : STATE_META[block || 'available'].label
      }`}
      onClick={() => onSelect(t._id)}
      style={block === 'closed' ? CLOSED_STRIPES : undefined}
      className={`group relative w-full min-w-0 text-left border-2 rounded-2xl p-3 sm:p-4 flex flex-col gap-2 transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-forest/40 ${
        selected ? 'bg-forest-50 border-forest ring-4 ring-forest/20 shadow-card' : meta.tile
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-1.5">
        <span
          className={`min-w-9 h-9 px-1.5 rounded-full font-heading font-bold text-sm flex items-center justify-center shrink-0 ${
            selected
              ? 'bg-forest text-white'
              : block
                ? 'bg-white/80 border border-ink/10 text-slate-500'
                : 'bg-cream border border-ink/15 text-forest'
          }`}
        >
          {t.code}
        </span>
        <span
          className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border whitespace-nowrap ${
            selected ? 'bg-forest text-white border-forest' : meta.badge
          }`}
        >
          {selected ? 'เลือกแล้ว' : meta.label}
        </span>
      </div>

      <div className="flex items-center justify-center py-1.5">
        <div
          className={`relative flex flex-wrap items-center justify-center gap-1.5 p-2 border border-dashed ${
            round ? 'rounded-full w-16 h-16' : 'rounded-lg w-24 h-12'
          } ${
            block === 'occupied'
              ? 'bg-brick-light border-brick/50'
              : block === 'reserved'
                ? 'bg-mustard-light border-mustard/60'
                : selected
                  ? 'bg-white border-forest-300'
                  : 'bg-[#e9d3b8]/60 border-[#c2763f]/50'
          }`}
          aria-hidden="true"
        >
          {Array.from({ length: seats }, (_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${
                block === 'occupied'
                  ? 'bg-brick'
                  : block === 'reserved'
                    ? 'bg-mustard-dark'
                    : selected
                      ? 'bg-forest'
                      : block
                        ? 'bg-slate-300'
                        : 'bg-forest-400'
              }`}
            ></span>
          ))}
        </div>
      </div>

      <div className="min-w-0">
        <h4
          className={`font-bold text-sm truncate ${
            selected ? 'text-forest' : block ? '' : 'text-ink group-hover:text-forest'
          }`}
        >
          {t.name || `โต๊ะ ${t.code}`}
          {selected && <i className="fa-solid fa-circle-check text-forest ml-1"></i>}
        </h4>
        <p className="text-[11px] text-slate-600 flex flex-wrap gap-x-2">
          <span>
            <i className="fa-solid fa-user-group mr-1"></i>
            {t.capacity} ที่นั่ง
          </span>
          {t.extraPerHour > 0 && (
            <span className="text-mustard-dark font-semibold">+฿{t.extraPerHour}/ชม.</span>
          )}
        </p>
        {note && <p className="text-[10px] font-semibold text-slate-600 mt-0.5 truncate">{note}</p>}
      </div>
    </button>
  );
}

export default function FloorMap({ tables, zones, players, selectedId, onSelect }) {
  const zoneNames = [...new Set([...(zones || []), ...tables.map((t) => t.zone || 'ทั่วไป')])];
  return (
    <div className="flex flex-col gap-6">
      {zoneNames.map((zone) => {
        const list = tables.filter((t) => (t.zone || 'ทั่วไป') === zone).sort(byCode);
        if (!list.length) return null;
        const free = list.filter((t) => !tableBlock(t, players)).length;
        return (
          <section key={zone} aria-label={`โซน ${zone}`}>
            <div className="flex items-baseline justify-between gap-2 mb-2.5">
              <h3 className="text-base font-heading text-forest flex items-center gap-2">
                <i className="fa-solid fa-location-dot text-brick-dark" aria-hidden="true"></i>
                โซน {zone}
              </h3>
              <span className="text-[11px] font-semibold text-teal-dark">
                ว่าง {free}/{list.length} โต๊ะ
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {list.map((t) => (
                <TableTile
                  key={t._id}
                  table={t}
                  players={players}
                  selected={selectedId === t._id}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
