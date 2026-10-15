// การ์ด "เกมพร้อมเล่นเมื่อมาถึง" — เกมที่เลือก (หรือยังไม่เลือก) + คำเตือนถ้าเกมไม่ว่างในช่วงเวลานั้น
import { GameCover, gameBlockText, inUseLines } from './GamePickerModal.jsx';
import { BTN } from '../brandUi.js';
import { GameBoxIcon } from '../../brand/BrandIcons.jsx';

export default function GamePanel({ game, loading, missing, onChange, onClear }) {
  const blocked = gameBlockText(game);
  const uses = inUseLines(game);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl border border-ink/10 bg-cream-light">
        {game ? (
          <>
            <GameCover game={game} className="w-14 h-14" />
            <div className="flex-1 min-w-0 basis-32">
              <h5 className="font-heading text-base text-forest truncate">
                {game.name || (loading ? 'กำลังโหลด...' : 'เกมที่เลือก')}
              </h5>
              <p className="text-[11px] text-slate-600 flex flex-wrap gap-x-2">
                {game.minPlayers != null && (
                  <span>
                    <i className="fa-solid fa-users mr-1"></i>
                    {game.minPlayers}–{game.maxPlayers} คน
                  </span>
                )}
                {game.copiesLeft != null && (
                  <span className={game.copiesLeft > 0 ? 'text-teal-dark font-semibold' : ''}>
                    ช่วงนี้ว่าง {game.copiesLeft} กล่อง
                  </span>
                )}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-xl border-2 border-dashed border-ink/20 bg-white flex items-center justify-center shrink-0">
              <GameBoxIcon size={34} />
            </div>
            <div className="flex-1 min-w-0 basis-32">
              <h5 className="font-heading text-base text-slate-700">ยังไม่เลือกเกม</h5>
              <p className="text-[11px] text-slate-600">
                เลือกไว้ก่อนได้ ร้านจะเตรียมเกมไว้ให้ที่โต๊ะ
              </p>
            </div>
          </>
        )}
        <div className="flex flex-col items-stretch gap-1.5 shrink-0">
          <button type="button" onClick={onChange} className={`${BTN.secondary} bg-white`}>
            {game ? 'เปลี่ยนเกม' : 'เลือกเกม'}
          </button>
          {game && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] font-semibold px-3 py-1 rounded-full text-slate-600 hover:text-brick-dark hover:bg-brick-light/60 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
            >
              เอาออก
            </button>
          )}
        </div>
      </div>

      {game && missing && (
        <div className="rounded-xl bg-brick-light/60 border border-brick/30 text-brick-dark text-xs p-3">
          <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
          ไม่พบเกมนี้ในคลังบอร์ดเกม — กด “เปลี่ยนเกม” เพื่อเลือกเกมอื่น
        </div>
      )}

      {game && blocked && (
        <div
          role="alert"
          className="rounded-xl bg-mustard-light/60 border border-mustard/50 text-slate-800 text-xs p-3 flex flex-col gap-0.5"
        >
          <p className="font-bold">
            <i className="fa-solid fa-triangle-exclamation mr-1.5 text-mustard-dark"></i>
            เกมนี้ไม่ว่างช่วงเวลาที่เลือก: {blocked}
          </p>
          {uses.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
          <p className="text-slate-600 mt-0.5">ลองเปลี่ยนเวลา/จำนวนผู้เล่น หรือเลือกเกมอื่น</p>
        </div>
      )}
    </div>
  );
}
