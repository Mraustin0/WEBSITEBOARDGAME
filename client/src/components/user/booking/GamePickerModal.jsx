// Modal เลือกเกมที่จะให้ร้านเตรียมไว้ที่โต๊ะ — ข้อมูลจาก GET /reservations/availability (ช่วงเวลา + จำนวนคนที่เลือก)
import { useEffect, useMemo, useRef, useState } from 'react';
import { GAME_REASON } from '../../../lib/booking.js';
import { timeTH } from '../../../lib/date.js';
import { DiceIcon, GameBoxIcon } from '../../brand/BrandIcons.jsx';

/** ข้อความว่าทำไมเลือกเกมนี้ไม่ได้ (null = เลือกได้ / ยังไม่รู้สถานะ) */
export function gameBlockText(g) {
  if (!g || g.available !== false) return null;
  if (g.reason === 'player_count') {
    return `${GAME_REASON.player_count} (เล่นได้ ${g.minPlayers}–${g.maxPlayers} คน)`;
  }
  return GAME_REASON[g.reason] || 'ช่วงเวลานี้จองไม่ได้';
}

/** "ใช้อยู่ที่โต๊ะ A1" / "จองไว้ที่โต๊ะ A1" จาก inUseAt (เฉพาะกรณีกล่องถูกจองครบ) */
export function inUseLines(g) {
  if (g?.reason !== 'booked') return [];
  return (g.inUseAt || []).map(
    (u) =>
      `${u.status === 'playing' ? 'ใช้อยู่ที่โต๊ะ' : 'จองไว้ที่โต๊ะ'} ${u.table ?? '-'}` +
      (u.startAt && u.endAt ? ` (${timeTH(u.startAt)}–${timeTH(u.endAt)})` : ''),
  );
}

export const gameCover = (g) => g?.image || g?.thumbnail || g?.cover || '';

export function GameCover({ game, className = 'w-12 h-12' }) {
  const src = gameCover(game);
  return src ? (
    <img
      src={src}
      alt=""
      loading="lazy"
      className={`${className} rounded-xl object-cover bg-cream shrink-0 border border-ink/10`}
    />
  ) : (
    <div
      className={`${className} rounded-xl bg-forest text-mustard border border-ink/20 flex items-center justify-center shrink-0`}
      aria-hidden="true"
    >
      <i className="fa-solid fa-chess-knight"></i>
    </div>
  );
}

export default function GamePickerModal({
  games,
  loading,
  error,
  onRetry,
  selectedId,
  onSelect,
  onClose,
  slotText,
  players,
}) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  // โฟกัสช่องค้นหาตอนเปิด, ล็อกการเลื่อนหน้า, คืนโฟกัสเดิมตอนปิด
  useEffect(() => {
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (games || [])
      .filter(
        (g) =>
          !term ||
          String(g.name || '')
            .toLowerCase()
            .includes(term),
      )
      .sort((a, b) => Number(b.available) - Number(a.available));
  }, [games, q]);
  const availableCount = list.filter((g) => g.available).length;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4">
      <div
        className="absolute inset-0 bg-ink/55 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-picker-title"
        className="relative bg-white w-full sm:max-w-2xl max-h-[88vh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-ink/15 flex flex-col overflow-hidden text-ink"
      >
        <div aria-hidden="true" className="board-border h-1.5 w-full shrink-0" />
        <div className="px-5 py-4 border-b border-ink/10 flex items-start justify-between gap-3 bg-cream">
          <div className="min-w-0">
            <h3
              id="game-picker-title"
              className="text-xl font-heading text-forest flex items-center gap-2"
            >
              <DiceIcon size={28} /> เลือกเกมให้ร้านเตรียมไว้ที่โต๊ะ
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {slotText} · {players} คน
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="w-9 h-9 rounded-full border border-ink/10 bg-cream-light hover:bg-white text-slate-500 hover:text-ink flex items-center justify-center transition shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <div className="p-4 border-b border-ink/10 bg-cream-light">
          <label className="relative block">
            <span className="sr-only">ค้นหาชื่อเกม</span>
            <i
              className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-forest/60 text-xs"
              aria-hidden="true"
            ></i>
            <input
              ref={inputRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาชื่อเกม เช่น Catan, Wingspan..."
              className="w-full pl-9 pr-4 py-2.5 rounded-full border border-ink/15 focus:border-forest focus:ring-2 focus:ring-forest/20 text-sm text-ink bg-white placeholder-slate-400 outline-none"
            />
          </label>
          {games && (
            <p className="text-[11px] text-slate-600 mt-2">
              ว่าง {availableCount} จาก {list.length} เกม
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-forest ${
              !selectedId
                ? 'border-forest bg-forest-50 ring-2 ring-forest/20'
                : 'border-ink/10 hover:border-forest/40 hover:bg-cream-light'
            }`}
          >
            <div className="w-12 h-12 rounded-xl border-2 border-dashed border-ink/20 bg-cream-light flex items-center justify-center shrink-0">
              <GameBoxIcon size={30} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink">ไม่เลือกเกม</p>
              <p className="text-[11px] text-slate-600">มาเลือกที่ร้านก็ได้</p>
            </div>
            {!selectedId && <i className="fa-solid fa-circle-check text-forest"></i>}
          </button>

          {loading && !games && (
            <div className="flex items-center justify-center py-10 text-slate-500 text-sm">
              <i className="fa-solid fa-spinner fa-spin mr-2"></i> กำลังโหลดรายชื่อเกม...
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-brick-light/60 border border-brick/30 text-brick-dark text-sm p-3 flex items-center justify-between gap-3">
              <span>
                <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
                {error}
              </span>
              <button
                type="button"
                onClick={onRetry}
                className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-white border border-brick/30 hover:bg-brick-light shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
              >
                ลองใหม่
              </button>
            </div>
          )}

          {games && list.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-8">ไม่พบเกมที่ชื่อตรงกับ “{q}”</p>
          )}

          {list.map((g) => {
            const blocked = gameBlockText(g);
            const selected = selectedId === g._id;
            const uses = inUseLines(g);
            return (
              <button
                key={g._id}
                type="button"
                disabled={Boolean(blocked)}
                aria-pressed={selected}
                onClick={() => onSelect(g)}
                className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-forest ${
                  selected
                    ? 'border-forest bg-forest-50 ring-2 ring-forest/20'
                    : blocked
                      ? 'border-ink/10 bg-cream-light opacity-70 cursor-not-allowed'
                      : 'border-ink/10 hover:border-forest/40 hover:bg-cream-light'
                }`}
              >
                <GameCover game={g} className={`w-12 h-12 ${blocked ? 'grayscale' : ''}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink truncate">{g.name}</p>
                  <p className="text-[11px] text-slate-600 flex flex-wrap gap-x-2">
                    <span>
                      <i className="fa-solid fa-users mr-1"></i>
                      {g.minPlayers}–{g.maxPlayers} คน
                    </span>
                    {g.playtimeMin ? (
                      <span>
                        <i className="fa-regular fa-clock mr-1"></i>
                        {g.playtimeMin} นาที
                      </span>
                    ) : null}
                    {!blocked && (
                      <span className="text-teal-dark font-semibold">
                        ว่าง {g.copiesLeft} กล่อง
                      </span>
                    )}
                  </p>
                  {blocked && (
                    <p className="text-[11px] font-semibold text-brick-dark mt-0.5">{blocked}</p>
                  )}
                  {uses.map((line, i) => (
                    <p key={i} className="text-[11px] text-slate-600">
                      {line}
                    </p>
                  ))}
                </div>
                {selected && <i className="fa-solid fa-circle-check text-forest shrink-0"></i>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
