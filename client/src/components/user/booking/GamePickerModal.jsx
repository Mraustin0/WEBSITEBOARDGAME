// Modal เลือกเกมที่จะให้ร้านเตรียมไว้ที่โต๊ะ — ข้อมูลจาก GET /reservations/availability (ช่วงเวลา + จำนวนคนที่เลือก)
import { useEffect, useMemo, useRef, useState } from 'react';
import { GAME_REASON } from '../../../lib/booking.js';
import { timeTH } from '../../../lib/date.js';

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
      className={`${className} rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200`}
    />
  ) : (
    <div
      className={`${className} rounded-xl bg-[#064e3b] text-emerald-300 flex items-center justify-center shrink-0`}
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
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-picker-title"
        className="relative bg-white w-full sm:max-w-2xl max-h-[88vh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/70">
          <div className="min-w-0">
            <h3
              id="game-picker-title"
              className="text-base font-heading font-bold text-[#064e3b] flex items-center gap-2"
            >
              <i className="fa-solid fa-dice text-emerald-600"></i> เลือกเกมให้ร้านเตรียมไว้ที่โต๊ะ
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {slotText} · {players} คน
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition shrink-0"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <div className="p-4 border-b border-slate-100">
          <label className="relative block">
            <span className="sr-only">ค้นหาชื่อเกม</span>
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              ref={inputRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาชื่อเกม เช่น Catan, Wingspan..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm text-slate-800 bg-slate-50 placeholder-slate-400 outline-none"
            />
          </label>
          {games && (
            <p className="text-[11px] text-slate-500 mt-2">
              ว่าง {availableCount} จาก {list.length} เกม
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition ${
              !selectedId
                ? 'border-[#064e3b] bg-emerald-50/60 ring-2 ring-[#064e3b]/15'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
              <i className="fa-solid fa-box-open"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-700">ไม่เลือกเกม</p>
              <p className="text-[11px] text-slate-500">มาเลือกที่ร้านก็ได้</p>
            </div>
            {!selectedId && <i className="fa-solid fa-circle-check text-[#064e3b]"></i>}
          </button>

          {loading && !games && (
            <div className="flex items-center justify-center py-10 text-slate-400 text-sm">
              <i className="fa-solid fa-spinner fa-spin mr-2"></i> กำลังโหลดรายชื่อเกม...
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm p-3 flex items-center justify-between gap-3">
              <span>
                <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
                {error}
              </span>
              <button
                type="button"
                onClick={onRetry}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-red-200 hover:bg-red-100 shrink-0"
              >
                ลองใหม่
              </button>
            </div>
          )}

          {games && list.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">ไม่พบเกมที่ชื่อตรงกับ “{q}”</p>
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
                className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition ${
                  selected
                    ? 'border-[#064e3b] bg-emerald-50/60 ring-2 ring-[#064e3b]/15'
                    : blocked
                      ? 'border-slate-200 bg-slate-50 opacity-70 cursor-not-allowed'
                      : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                }`}
              >
                <GameCover game={g} className={`w-12 h-12 ${blocked ? 'grayscale' : ''}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{g.name}</p>
                  <p className="text-[11px] text-slate-500 flex flex-wrap gap-x-2">
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
                      <span className="text-emerald-700 font-semibold">
                        ว่าง {g.copiesLeft} กล่อง
                      </span>
                    )}
                  </p>
                  {blocked && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-0.5">{blocked}</p>
                  )}
                  {uses.map((line, i) => (
                    <p key={i} className="text-[11px] text-slate-500">
                      {line}
                    </p>
                  ))}
                </div>
                {selected && <i className="fa-solid fa-circle-check text-[#064e3b] shrink-0"></i>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
