// เปลี่ยน / เลือกเกม ให้การจอง (booked: ช่วง startAt..endAt, playing: ตอนนี้..endAt)
// ใช้ GET /reservations/availability ดูว่าเกมไหนว่างตลอดช่วงที่เหลือ แล้ว PATCH /reservations/:id/game
import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { GameCover, ResSummary } from './ui.jsx';
import { BTN, errText } from './utils.js';
import { GAME_REASON, thaiError } from '../../../lib/booking.js';
import { timeTH } from '../../../lib/date.js';
import { changeGame, fetchAvailability } from '../../../services/api.js';

const NONE = '__none__';

/** ช่วงเวลาที่ต้องเช็คความว่างของเกม */
function windowOf(r) {
  if (r.status === 'playing') {
    const now = Date.now();
    const remainingH = (new Date(r.endAt).getTime() - now) / 3_600_000;
    return {
      startAt: new Date(now).toISOString(),
      durationHours: Math.max(0.5, Math.ceil(remainingH * 2) / 2),
    };
  }
  return { startAt: r.startAt, durationHours: r.durationHours };
}

function reasonText(g, players) {
  if (g.reason === 'player_count')
    return `เล่นได้ ${g.minPlayers}–${g.maxPlayers} คน (มี ${players})`;
  if (g.reason === 'booked') {
    const at = (g.inUseAt ?? []).map((u) => u.table).filter(Boolean);
    return at.length ? `ใช้อยู่ที่โต๊ะ ${[...new Set(at)].join(', ')}` : GAME_REASON.booked;
  }
  return GAME_REASON[g.reason] ?? 'ไม่ว่างช่วงนี้';
}

export default function ChangeGameModal({ r, onClose, onDone }) {
  const [win] = useState(() => windowOf(r));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null); // gameId | NONE
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const players = r.players;
  const currentId = r.game?._id ?? null;

  useEffect(() => {
    let alive = true;
    fetchAvailability({ ...win, players })
      .then((res) => {
        if (!alive) return;
        setData(res);
        setLoadError('');
      })
      .catch((err) => alive && setLoadError(errText(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [win, players, retry]);

  // ช่วงเวลานอกกฎการจอง (เช่น เหลือน้อยกว่าชั่วโมงขั้นต่ำ) → server ตรวจซ้ำตอนยืนยันอยู่แล้ว
  const bookable = data?.bookable !== false;
  const games = useMemo(() => {
    const list = data?.games ?? [];
    const q = query.trim().toLowerCase();
    return list
      .map((g) => ({
        ...g,
        selectable: String(g._id) !== String(currentId) && (bookable ? g.available : !g.reason),
      }))
      .filter((g) => !q || g.name?.toLowerCase().includes(q))
      .sort((a, b) => Number(b.selectable) - Number(a.selectable));
  }, [data, query, bookable, currentId]);

  const selectedGame = games.find((g) => String(g._id) === selected) ?? null;
  const selectedName = selected === NONE ? 'ไม่เลือกเกม' : selectedGame?.name;

  async function submit() {
    if (busy || !selected) return;
    setBusy(true);
    setError('');
    try {
      const updated = await changeGame(r._id, selected === NONE ? null : selected);
      onDone(updated);
    } catch (err) {
      setError(errText(err));
      setBusy(false);
    }
  }

  const windowText = `${timeTH(win.startAt)}–${timeTH(r.endAt)} น.`;

  return (
    <Modal
      eyebrow={r.status === 'playing' ? 'ระหว่างเล่น' : 'ก่อนเริ่มเล่น'}
      title={currentId ? 'เปลี่ยนเกม' : 'เลือกเกม'}
      subtitle={`แสดงเกมที่ว่างช่วง ${windowText} สำหรับ ${players} คน`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className={BTN.ghost} onClick={onClose} disabled={busy}>
            ยกเลิก
          </button>
          <button
            type="button"
            className={`${BTN.cta} max-w-full`}
            onClick={submit}
            disabled={busy || !selected}
          >
            <span className="truncate">
              {busy ? 'กำลังบันทึก...' : selectedName ? `ยืนยัน: ${selectedName}` : 'เลือกเกมก่อน'}
            </span>
          </button>
        </>
      }
    >
      <ResSummary r={r} extra={`เกมปัจจุบัน: ${r.game?.name ?? 'ยังไม่เลือก'}`} />

      <div className="relative mt-4">
        <i
          className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"
          aria-hidden="true"
        ></i>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาชื่อเกม"
          aria-label="ค้นหาชื่อเกม"
          className="w-full rounded-full border border-ink/15 bg-white py-2 pl-8 pr-3 text-sm placeholder:text-slate-400 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
        />
      </div>

      {!bookable && data?.reason && (
        <p className="mt-2 rounded-xl border border-mustard/50 bg-mustard-light/60 px-3 py-2 text-[11px] text-slate-800">
          หมายเหตุ: {thaiError({ message: data.reason })} — จะเช็คอีกครั้งตอนยืนยัน
        </p>
      )}

      <div className="mt-3 space-y-2" role="radiogroup" aria-label="เลือกเกม">
        <button
          type="button"
          role="radio"
          aria-checked={selected === NONE}
          disabled={!currentId}
          onClick={() => setSelected(NONE)}
          className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-forest ${
            selected === NONE
              ? 'border-forest bg-forest-50 ring-2 ring-forest/20'
              : 'border-ink/10 bg-white hover:border-forest/40 hover:bg-cream-light'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <GameCover game={null} className="h-11 w-11" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">ไม่เลือกเกม</span>
            <span className="block text-[11px] text-slate-500">
              {currentId ? 'คืนเกมเดิม ใช้แค่โต๊ะ' : 'ตอนนี้ยังไม่ได้เลือกเกม'}
            </span>
          </span>
        </button>

        {loading ? (
          Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-cream" />
          ))
        ) : loadError ? (
          <div className="rounded-xl border border-brick/30 bg-brick-light/50 p-3 text-xs text-brick-dark">
            {loadError}{' '}
            <button
              type="button"
              className="ml-1 font-bold underline"
              onClick={() => {
                setLoading(true);
                setRetry((n) => n + 1);
              }}
            >
              ลองใหม่
            </button>
          </div>
        ) : games.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">ไม่พบเกมที่ค้นหา</p>
        ) : (
          games.map((g) => {
            const id = String(g._id);
            const isCurrent = id === String(currentId);
            const on = selected === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!g.selectable}
                onClick={() => setSelected(id)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-forest ${
                  on
                    ? 'border-forest bg-forest-50 ring-2 ring-forest/20'
                    : 'border-ink/10 bg-white hover:border-forest/40 hover:bg-cream-light'
                } disabled:cursor-not-allowed disabled:bg-cream-light disabled:hover:border-ink/10`}
              >
                <GameCover
                  game={g}
                  className={`h-11 w-11 ${g.selectable || isCurrent ? '' : 'opacity-50 grayscale'}`}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm font-bold ${g.selectable || isCurrent ? '' : 'text-slate-400'}`}
                  >
                    {g.name}
                  </span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {g.minPlayers}–{g.maxPlayers} คน
                    {g.playtimeMin ? ` • ~${g.playtimeMin} นาที` : ''}
                    {g.selectable && g.copiesLeft != null ? ` • ว่าง ${g.copiesLeft} กล่อง` : ''}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isCurrent
                      ? 'border border-forest-200 bg-forest-100 text-forest-800'
                      : g.selectable
                        ? 'bg-teal text-white'
                        : 'max-w-[45%] truncate bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCurrent ? 'เกมปัจจุบัน' : g.selectable ? 'ว่าง' : reasonText(g, players)}
                </span>
              </button>
            );
          })
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-xs font-semibold text-brick-dark">
          {error}
        </p>
      )}
    </Modal>
  );
}
