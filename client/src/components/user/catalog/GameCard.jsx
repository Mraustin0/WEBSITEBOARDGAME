// การ์ดเกมในคลัง — คลิกส่วนบน (ปุ่ม) เพื่อเปิดรายละเอียด, ปุ่มล่างพาไปหน้าจอง
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GameBoxIcon } from '../../brand/BrandIcons.jsx';
import { TONE, bookingHref, playersLabel, playtimeLabel } from './catalogUtils.js';

export default function GameCard({ game, status, slot, onOpen }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = game.cover || game.thumbnail;
  const dim = !status.ok;
  const maintenance = status.tone === 'repair';

  return (
    <article
      className={`bg-white rounded-2xl border border-ink/10 shadow-card p-3.5 flex flex-col justify-between gap-3 group transition-all duration-300 hover:-translate-y-1 hover:border-forest/30 min-w-0 ${dim ? 'opacity-90' : ''}`}
    >
      <button
        type="button"
        onClick={() => onOpen(game)}
        aria-label={`ดูรายละเอียด ${game.name}`}
        className="flex flex-col gap-3 text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2"
      >
        <div className="relative w-full h-44 rounded-xl overflow-hidden bg-cream border border-ink/10">
          {src && !imgFailed ? (
            <img
              src={src}
              alt=""
              loading="lazy"
              onError={() => setImgFailed(true)}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${dim ? 'grayscale-[40%]' : ''}`}
            />
          ) : (
            <div className="paper w-full h-full flex items-center justify-center">
              <GameBoxIcon size={64} />
            </div>
          )}

          {game.rating && (
            <span
              className="absolute top-2 right-2 bg-mustard text-ink border border-ink/20 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm"
              title="คะแนน BGG (เฉลี่ยจาก BoardGameGeek)"
            >
              <span aria-hidden="true">★</span> {game.rating}
            </span>
          )}
          <span
            className={`absolute bottom-2 left-2 max-w-[calc(100%-16px)] text-xs px-2.5 py-1 rounded-full font-semibold shadow-sm flex items-center gap-1.5 ${TONE[status.tone]}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 shrink-0"></span>
            <span className="truncate">{status.label}</span>
          </span>
        </div>

        <div className="min-w-0">
          {game.yearPublished && (
            <span className="text-[10px] font-bold text-brick-dark uppercase tracking-wider block truncate">
              {game.yearPublished}
              {game.designers?.[0] ? ` · ${game.designers[0]}` : ''}
            </span>
          )}
          <h3 className="font-heading text-lg leading-snug text-forest line-clamp-1 group-hover:text-brick-dark transition-colors">
            {game.name}
          </h3>
        </div>

        {game.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {game.categories.slice(0, 3).map((c) => (
              <span
                key={c}
                className={`border text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  dim
                    ? 'bg-cream-light border-ink/10 text-slate-600'
                    : 'bg-forest-50 border-forest-200 text-forest-800'
                }`}
              >
                {c}
              </span>
            ))}
          </div>
        )}

        <div className="w-full bg-cream-light border border-ink/10 rounded-xl p-2.5 grid grid-cols-3 text-center">
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              ผู้เล่น
            </span>
            <span className="text-xs font-bold text-ink">{playersLabel(game)}</span>
          </div>
          <div className="min-w-0 border-x border-ink/10">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">เวลา</span>
            <span className="text-xs font-bold text-ink">{playtimeLabel(game)}</span>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              ความยาก
            </span>
            <span className="text-xs font-bold text-ink">
              {game.weight ? `${game.weight} / 5` : '-'}
            </span>
          </div>
        </div>
      </button>

      {maintenance || (slot && !status.ok) ? (
        <button
          type="button"
          disabled
          className="w-full bg-cream-light text-slate-500 border border-ink/10 font-medium py-2.5 px-4 rounded-full flex items-center justify-center gap-1.5 cursor-not-allowed text-xs"
        >
          <i className={`fa-solid ${maintenance ? 'fa-screwdriver-wrench' : 'fa-ban'}`}></i>
          {maintenance ? 'ส่งซ่อม — ยังจองไม่ได้' : 'ช่วงเวลานี้ไม่ว่าง'}
        </button>
      ) : (
        <Link
          to={bookingHref(game._id, slot)}
          className="w-full bg-forest hover:bg-forest-dark text-white font-semibold py-2.5 px-4 rounded-full flex items-center justify-center gap-1.5 transition-all text-xs shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2"
        >
          <span>จองโต๊ะเล่นเกมนี้</span> <i className="fa-solid fa-arrow-right"></i>
        </Link>
      )}
    </article>
  );
}
