// การ์ดเกมในคลัง — คลิกส่วนบน (ปุ่ม) เพื่อเปิดรายละเอียด, ปุ่มล่างพาไปหน้าจอง
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TONE, bookingHref, playersLabel, playtimeLabel } from './catalogUtils.js';

export default function GameCard({ game, status, slot, onOpen }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = game.cover || game.thumbnail;
  const dim = !status.ok;
  const maintenance = status.tone === 'repair';

  return (
    <article
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between gap-3 group transition-all duration-300 hover:-translate-y-1 hover:shadow-md min-w-0 ${dim ? 'opacity-90' : ''}`}
    >
      <button
        type="button"
        onClick={() => onOpen(game)}
        aria-label={`ดูรายละเอียด ${game.name}`}
        className="flex flex-col gap-3 text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
      >
        <div className="relative w-full h-44 rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
          {src && !imgFailed ? (
            <img
              src={src}
              alt=""
              loading="lazy"
              onError={() => setImgFailed(true)}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${dim ? 'grayscale-[40%]' : ''}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">
              <i className="fa-solid fa-chess-knight"></i>
            </div>
          )}

          {game.rating && (
            <span
              className="absolute top-2 right-2 bg-slate-900/90 text-amber-300 border border-slate-700 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm"
              title="คะแนน BGG (เฉลี่ยจาก BoardGameGeek)"
            >
              <span className="text-amber-400">★</span> {game.rating}
            </span>
          )}
          <span
            className={`absolute bottom-2 left-2 max-w-[calc(100%-16px)] text-xs px-2.5 py-1 rounded-full font-semibold shadow-sm flex items-center gap-1.5 ${TONE[status.tone]}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0"></span>
            <span className="truncate">{status.label}</span>
          </span>
        </div>

        <div className="min-w-0">
          {game.yearPublished && (
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              {game.yearPublished}
              {game.designers?.[0] ? ` · ${game.designers[0]}` : ''}
            </span>
          )}
          <h3 className="font-heading font-bold text-base text-slate-900 line-clamp-1 group-hover:text-emerald-800">
            {game.name}
          </h3>
        </div>

        {game.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {game.categories.slice(0, 3).map((c) => (
              <span
                key={c}
                className={`border text-[11px] px-2 py-0.5 rounded-md font-medium ${
                  dim
                    ? 'bg-slate-100 border-slate-200 text-slate-700'
                    : 'bg-emerald-50 border-emerald-200/60 text-emerald-800'
                }`}
              >
                {c}
              </span>
            ))}
          </div>
        )}

        <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 grid grid-cols-3 text-center">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              ผู้เล่น
            </span>
            <span className="text-xs font-bold text-slate-900">{playersLabel(game)}</span>
          </div>
          <div className="border-x border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">เวลา</span>
            <span className="text-xs font-bold text-slate-900">{playtimeLabel(game)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              ความยาก
            </span>
            <span className="text-xs font-bold text-slate-900">
              {game.weight ? `${game.weight} / 5` : '-'}
            </span>
          </div>
        </div>
      </button>

      {maintenance || (slot && !status.ok) ? (
        <button
          type="button"
          disabled
          className="w-full bg-slate-100 text-slate-500 border border-slate-200 font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed text-xs"
        >
          <i className={`fa-solid ${maintenance ? 'fa-screwdriver-wrench' : 'fa-ban'}`}></i>
          {maintenance ? 'ส่งซ่อม — ยังจองไม่ได้' : 'ช่วงเวลานี้ไม่ว่าง'}
        </button>
      ) : (
        <Link
          to={bookingHref(game._id, slot)}
          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          <span>จองโต๊ะเล่นเกมนี้</span> <i className="fa-solid fa-arrow-right"></i>
        </Link>
      )}
    </article>
  );
}
