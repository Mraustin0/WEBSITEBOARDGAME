// การ์ดโต๊ะที่กำลังเล่น: เวลาที่เหลือ (อัปเดตทุก 30 วิ), ยอดตอนนี้, คืนเกม / ต่อเวลา / เปลี่ยนเกม / เรียก GM
import { useEffect, useState } from 'react';
import CallGMModal from './CallGMModal.jsx';
import { GameCover, TableLabel } from './ui.jsx';
import {
  ASSIST_STATUS,
  ASSIST_TOPICS,
  BTN,
  asList,
  baht,
  errText,
  minutesText,
  overtimeEstimate,
  resCode,
  sessionProgress,
} from './utils.js';
import { timeTH } from '../../../lib/date.js';
import { cancelAssist, fetchMyAssist } from '../../../services/api.js';

const ACTIVE_CALL = ['open', 'acknowledged'];
const topicLabel = (key) => ASSIST_TOPICS.find((t) => t.key === key)?.label ?? 'อื่น ๆ';

export default function ActiveSessionCard({
  r,
  now,
  rules,
  onReturn,
  onExtend,
  onChangeGame,
  showToast,
}) {
  const [calls, setCalls] = useState([]);
  const [callsTick, setCallsTick] = useState(0);
  const [gmOpen, setGmOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const id = r._id;

  // สถานะคำขอเรียก GM — โหลดซ้ำทุก 30 วิ (พนักงานกดรับเรื่อง/เสร็จแล้วจากฝั่ง admin)
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchMyAssist(id)
        .then((data) => alive && setCalls(asList(data)))
        .catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id, callsTick]);

  const pending = calls.filter((c) => ACTIVE_CALL.includes(c.status));

  async function onCancelCall(callId) {
    if (cancellingId) return;
    setCancellingId(callId);
    try {
      await cancelAssist(callId);
      showToast('ยกเลิกคำขอแล้ว');
      setCallsTick((n) => n + 1);
    } catch (err) {
      showToast(errText(err), false);
    } finally {
      setCancellingId(null);
    }
  }

  const { pct, remainingMin, overtime } = sessionProgress(r, now);
  const overCharge = overtimeEstimate(r, now, rules);
  const game = r.game;

  return (
    <article className="space-y-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      {/* หัวการ์ด: โต๊ะ + เวลาที่เหลือ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
            <i className="fa-solid fa-chess-board text-xl" aria-hidden="true"></i>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
                </span>
                กำลังเล่น
              </span>
              <span className="font-mono text-[10px] text-slate-400">{resCode(r._id)}</span>
            </div>
            <h3 className="mt-1 text-xl font-bold leading-tight">
              <TableLabel table={r.table} />
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {r.table?.zone ? `โซน ${r.table.zone} • ` : ''}
              {r.players} คน • {timeTH(r.startAt)}–{timeTH(r.endAt)} น.
            </p>
          </div>
        </div>

        <div
          className={`rounded-2xl border px-4 py-3 sm:min-w-[200px] ${
            overtime ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <p className={`text-[10px] ${overtime ? 'text-red-600' : 'text-slate-500'}`}>
            {overtime ? 'เกินเวลาแล้ว' : 'เวลาคงเหลือ'}
          </p>
          <p
            className={`text-lg font-bold leading-tight ${overtime ? 'text-red-600' : 'text-emerald-950'}`}
            aria-live="polite"
          >
            {overtime ? `+${minutesText(-remainingMin)}` : minutesText(remainingMin)}
          </p>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-label="เวลาที่เล่นไปแล้ว"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
          >
            <div
              className={`h-full rounded-full transition-all ${
                overtime ? 'bg-red-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-600'
              }`}
              style={{ width: `${overtime ? 100 : pct}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-slate-400">จบ {timeTH(r.endAt)} น.</p>
        </div>
      </div>

      {/* เกมที่เล่นอยู่ + ยอดตอนนี้ */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 p-3">
          <GameCover game={game} className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase text-emerald-700">บอร์ดเกมบนโต๊ะ</p>
            <p className="truncate text-base font-bold">{game?.name ?? 'ยังไม่ได้เลือกเกม'}</p>
            {game ? (
              <p className="truncate text-[11px] text-slate-500">
                {game.minPlayers}–{game.maxPlayers} คน
                {game.playtimeMin ? ` • ~${game.playtimeMin} นาที` : ''}
                {game.bggAverage ? ` • BGG ${Number(game.bggAverage).toFixed(1)}` : ''}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">เลือกเกมจากคลังได้ระหว่างเล่น</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChangeGame(r)}
            className={`${BTN.secondary} shrink-0`}
          >
            <i className="fa-solid fa-right-left text-emerald-700" aria-hidden="true"></i>
            {game ? 'เปลี่ยน' : 'เลือกเกม'}
          </button>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-3 md:flex-col md:items-end md:justify-center">
          <p className="text-[11px] text-slate-500">ยอดตอนนี้</p>
          <div className="text-right">
            <p className="text-xl font-bold">{baht((r.price?.total ?? 0) + overCharge)}</p>
            {overCharge > 0 && (
              <p className="text-[11px] font-semibold text-red-600">
                รวมค่าเกินเวลา ~{baht(overCharge)}
              </p>
            )}
            {r.price?.deposit ? (
              <p className="text-[11px] text-slate-500">มัดจำแล้ว {baht(r.price.deposit)}</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* คำขอ GM ที่ยังรอ */}
      {pending.length > 0 && (
        <ul className="space-y-2">
          {pending.map((c) => (
            <li
              key={c._id}
              className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs"
            >
              <i className="fa-solid fa-bell-concierge text-amber-600" aria-hidden="true"></i>
              <span className="min-w-0 flex-1">
                <strong>เรียก GM: {topicLabel(c.topic)}</strong> —{' '}
                <span
                  className={c.status === 'acknowledged' ? 'text-emerald-700' : 'text-amber-700'}
                >
                  {ASSIST_STATUS[c.status]}
                </span>
                {c.createdAt && <span className="text-slate-400"> • {timeTH(c.createdAt)} น.</span>}
              </span>
              <button
                type="button"
                onClick={() => onCancelCall(c._id)}
                disabled={Boolean(cancellingId)}
                className="shrink-0 rounded-lg px-2 py-1 font-semibold text-slate-600 hover:bg-white disabled:opacity-50"
              >
                {cancellingId === c._id ? 'กำลังยกเลิก...' : 'ยกเลิกคำขอ'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ปุ่มหลัก */}
      <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-200 text-emerald-900">
            <i className="fa-solid fa-clipboard-check" aria-hidden="true"></i>
          </div>
          <div>
            <p className="text-sm font-bold">เล่นเสร็จแล้ว?</p>
            <p className="text-[11px] text-slate-600">
              กดคืนเกมเพื่อดูยอดและให้สมาชิกคนอื่นจองต่อได้ทันที
            </p>
          </div>
        </div>
        <button type="button" onClick={() => onReturn(r)} className={`${BTN.primary} py-3`}>
          <i className="fa-solid fa-box-archive" aria-hidden="true"></i>
          เล่นเสร็จแล้ว / คืนเกม
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <span className="mr-auto text-[11px] text-slate-400">ระหว่างเล่น:</span>
        <button type="button" onClick={() => onExtend(r)} className={BTN.secondary}>
          <i className="fa-solid fa-clock-rotate-left text-emerald-700" aria-hidden="true"></i>
          ขอต่อเวลา
        </button>
        <button type="button" onClick={() => setGmOpen(true)} className={BTN.secondary}>
          <i className="fa-solid fa-headset text-emerald-700" aria-hidden="true"></i>
          เรียก GM
        </button>
      </div>

      {gmOpen && (
        <CallGMModal
          r={r}
          pendingTopics={pending.map((c) => c.topic)}
          onClose={() => setGmOpen(false)}
          onDone={(label) => {
            setGmOpen(false);
            showToast(`เรียก GM แล้ว (${label}) — พนักงานกำลังมา`);
            setCallsTick((n) => n + 1);
          }}
        />
      )}
    </article>
  );
}
