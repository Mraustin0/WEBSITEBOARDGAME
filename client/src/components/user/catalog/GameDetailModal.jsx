// รายละเอียดเกม: รูปใหญ่, ข้อมูล BGG, คำอธิบาย, สถานะกล่อง, ปุ่มจอง และรีวิวของสมาชิก
// ปิดด้วย Esc / คลิกพื้นหลัง / ปุ่ม × — โฟกัสวนอยู่ใน dialog และคืนโฟกัสเดิมเมื่อปิด
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import GameReviews from './GameReviews.jsx';
import {
  TONE,
  bookingHref,
  nowStatus,
  playersLabel,
  playtimeLabel,
  plainText,
  slotStatus,
} from './catalogUtils.js';

const DESC_LIMIT = 420;
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function Chips({ title, items, tone = 'emerald' }) {
  if (!items?.length) return null;
  const cls =
    tone === 'emerald'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
      : 'bg-slate-100 border-slate-200 text-slate-700';
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</span>
      <div className="flex flex-wrap gap-1">
        {items.map((c) => (
          <span key={c} className={`text-[11px] border px-2 py-0.5 rounded-md font-medium ${cls}`}>
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="min-w-0">
      <span className="text-[10px] text-slate-500 uppercase font-semibold block">{label}</span>
      <span className="text-xs font-bold text-slate-900">{value}</span>
    </div>
  );
}

export default function GameDetailModal({ game, slotEntry, slot, onClose, notify }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const description = useMemo(() => plainText(game.description), [game.description]);
  const longDesc = description.length > DESC_LIMIT;

  // โฟกัสปุ่มปิดเมื่อเปิด, ล็อกการเลื่อนหน้าหลัง, คืนโฟกัสเดิมเมื่อปิด
  useEffect(() => {
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
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

  // วนโฟกัสด้วย Tab ภายใน dialog
  function trapTab(e) {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const nodes = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const now = nowStatus(game);
  const atSlot = slot && slotEntry ? slotStatus(slotEntry) : null;
  const status = atSlot ?? now;
  const canBook = status.tone !== 'repair' && (!atSlot || atSlot.ok);
  const src = game.image || game.thumbnail;
  const copies = game.copies ?? 1;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-detail-title"
        onKeyDown={trapTab}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto overscroll-contain rounded-t-2xl sm:rounded-2xl shadow-2xl"
      >
        <div className="relative h-56 sm:h-72 bg-slate-100">
          {src && !imgFailed ? (
            <img
              src={src}
              alt={game.name}
              onError={() => setImgFailed(true)}
              className="w-full h-full object-contain bg-slate-900/5"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl text-slate-300">
              <i className="fa-solid fa-chess-knight"></i>
            </div>
          )}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="absolute top-3 right-3 w-9 h-9 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          {game.rating && (
            <span className="absolute bottom-3 right-3 bg-slate-900/90 text-amber-300 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
              <span className="text-amber-400">★</span> {game.rating} BGG
            </span>
          )}
        </div>

        <div className="p-5 sm:p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2
              id="game-detail-title"
              className="font-heading font-bold text-xl sm:text-2xl text-slate-900 break-words"
            >
              {game.name}
              {game.yearPublished && (
                <span className="ml-2 text-sm font-semibold text-slate-400">
                  ({game.yearPublished})
                </span>
              )}
            </h2>
            <span
              className={`self-start text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 ${TONE[status.tone]}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              {atSlot ? `ช่วงที่เลือก: ${atSlot.label}` : now.label}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <Stat label="ผู้เล่น" value={playersLabel(game)} />
            <Stat label="เวลาเล่น" value={playtimeLabel(game)} />
            <Stat label="คะแนน BGG" value={game.rating ? `${game.rating} / 10` : '-'} />
            <Stat label="ความยาก" value={game.weight ? `${game.weight} / 5` : '-'} />
          </div>

          <div className="text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2.5 flex flex-wrap gap-x-4 gap-y-1">
            <span className="font-bold text-slate-800">กล่องในร้าน {copies} กล่อง</span>
            <span>
              <i className="fa-solid fa-box-open text-emerald-600 mr-1"></i>บนชั้น{' '}
              {game.copiesInVault ?? 0}
            </span>
            <span>
              <i className="fa-solid fa-dice text-amber-600 mr-1"></i>กำลังเล่น{' '}
              {game.copiesInPlay ?? 0}
            </span>
            <span>
              <i className="fa-solid fa-screwdriver-wrench text-rose-600 mr-1"></i>ส่งซ่อม{' '}
              {game.copiesInRepair ?? 0}
            </span>
          </div>

          {canBook ? (
            <Link
              to={bookingHref(game._id, atSlot ? slot : null)}
              className="w-full bg-[#064e3b] hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition text-sm shadow-sm"
            >
              <i className="fa-solid fa-calendar-check"></i> จองโต๊ะเล่นเกมนี้
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="w-full bg-slate-100 text-slate-500 border border-slate-200 font-semibold py-3 px-4 rounded-xl text-sm cursor-not-allowed"
            >
              {status.tone === 'repair' ? 'เกมนี้ส่งซ่อม — จองไม่ได้' : 'ช่วงเวลาที่เลือกไม่ว่าง'}
            </button>
          )}

          {description && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                เกี่ยวกับเกม
              </span>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line break-words">
                {longDesc && !expanded
                  ? `${description.slice(0, DESC_LIMIT).trimEnd()}…`
                  : description}
              </p>
              {longDesc && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  aria-expanded={expanded}
                  className="self-start text-xs font-bold text-emerald-700 hover:underline"
                >
                  {expanded ? 'ย่อ' : 'อ่านต่อ'}
                </button>
              )}
            </div>
          )}

          <Chips title="หมวดหมู่" items={game.categories} />
          <Chips title="กลไกเกม" items={game.mechanics} tone="slate" />
          <Chips title="ผู้ออกแบบ" items={game.designers} tone="slate" />

          <hr className="border-slate-100" />

          <GameReviews gameId={String(game._id)} gameName={game.name} notify={notify} />
        </div>
      </div>
    </div>
  );
}
