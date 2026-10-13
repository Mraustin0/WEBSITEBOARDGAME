// การ์ด "เกมพร้อมเล่นเมื่อมาถึง" — เกมที่เลือก (หรือยังไม่เลือก) + คำเตือนถ้าเกมไม่ว่างในช่วงเวลานั้น
import { GameCover, gameBlockText, inUseLines } from './GamePickerModal.jsx';

export default function GamePanel({ game, loading, missing, onChange, onClear }) {
  const blocked = gameBlockText(game);
  const uses = inUseLines(game);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {game ? (
          <>
            <GameCover game={game} className="w-14 h-14" />
            <div className="flex-1 min-w-0">
              <h5 className="text-sm font-bold text-slate-900 truncate">
                {game.name || (loading ? 'กำลังโหลด...' : 'เกมที่เลือก')}
              </h5>
              <p className="text-[11px] text-slate-500 flex flex-wrap gap-x-2">
                {game.minPlayers != null && (
                  <span>
                    <i className="fa-solid fa-users mr-1"></i>
                    {game.minPlayers}–{game.maxPlayers} คน
                  </span>
                )}
                {game.copiesLeft != null && (
                  <span className={game.copiesLeft > 0 ? 'text-emerald-700 font-semibold' : ''}>
                    ช่วงนี้ว่าง {game.copiesLeft} กล่อง
                  </span>
                )}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
              <i className="fa-solid fa-box-open"></i>
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-sm font-bold text-slate-600">ยังไม่เลือกเกม</h5>
              <p className="text-[11px] text-slate-500">
                เลือกไว้ก่อนได้ ร้านจะเตรียมเกมไว้ให้ที่โต๊ะ
              </p>
            </div>
          </>
        )}
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onChange}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[#064e3b] hover:bg-emerald-50 active:scale-95 transition shadow-xs"
          >
            {game ? 'เปลี่ยนเกม' : 'เลือกเกม'}
          </button>
          {game && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
            >
              เอาออก
            </button>
          )}
        </div>
      </div>

      {game && missing && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3">
          <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
          ไม่พบเกมนี้ในคลังบอร์ดเกม — กด “เปลี่ยนเกม” เพื่อเลือกเกมอื่น
        </div>
      )}

      {game && blocked && (
        <div
          role="alert"
          className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 flex flex-col gap-0.5"
        >
          <p className="font-bold">
            <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
            เกมนี้ไม่ว่างช่วงเวลาที่เลือก: {blocked}
          </p>
          {uses.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
          <p className="text-amber-700/80 mt-0.5">ลองเปลี่ยนเวลา/จำนวนผู้เล่น หรือเลือกเกมอื่น</p>
        </div>
      )}
    </div>
  );
}
