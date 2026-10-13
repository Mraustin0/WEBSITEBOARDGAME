// การ์ดโต๊ะที่กำลังเล่น: เวลาที่เหลือ (อัปเดตทุก 30 วิ), ยอดตอนนี้, คืนเกม / ต่อเวลา / เปลี่ยนเกม / เรียก GM
import { useEffect, useState } from 'react';
import CallGMModal from './CallGMModal.jsx';
import { ClockIcon, GameBoxIcon, TableIcon } from '../../brand/BrandIcons.jsx';
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
    <article className="overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-card">
      <div aria-hidden="true" className="board-border h-1.5 w-full" />
      <div className="space-y-5 p-4 sm:p-6">
        {/* หัวการ์ด: โต๊ะ + เวลาที่เหลือ */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-ink/10 bg-cream">
              <TableIcon size={40} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-brick-dark px-2.5 py-0.5 text-[10px] font-bold text-white">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  กำลังเล่น
                </span>
                <span className="font-mono text-[10px] text-slate-500">{resCode(r._id)}</span>
              </div>
              <h3 className="mt-1 font-heading text-xl leading-tight text-forest">
                <TableLabel table={r.table} />
              </h3>
              <p className="mt-0.5 text-xs text-slate-600">
                {r.table?.zone ? `โซน ${r.table.zone} • ` : ''}
                {r.players} คน • {timeTH(r.startAt)}–{timeTH(r.endAt)} น.
              </p>
            </div>
          </div>

          <div
            className={`rounded-2xl border px-4 py-3 sm:min-w-[200px] ${
              overtime ? 'border-brick/40 bg-brick-light/60' : 'border-ink/10 bg-cream-light'
            }`}
          >
            <p
              className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${overtime ? 'text-brick-dark' : 'text-slate-500'}`}
            >
              <ClockIcon size={16} />
              {overtime ? 'เกินเวลาแล้ว' : 'เหลือเวลา'}
            </p>
            <p
              className={`font-heading text-2xl leading-tight ${overtime ? 'text-brick-dark' : 'text-forest'}`}
              aria-live="polite"
            >
              {overtime ? `+${minutesText(-remainingMin)}` : minutesText(remainingMin)}
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full border border-ink/10 bg-cream"
              role="progressbar"
              aria-label="เวลาที่เล่นไปแล้ว"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct)}
            >
              <div
                className={`h-full rounded-full transition-all ${
                  overtime ? 'bg-brick' : pct > 85 ? 'bg-mustard' : 'bg-forest'
                }`}
                style={{ width: `${overtime ? 100 : pct}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-500">จบ {timeTH(r.endAt)} น.</p>
          </div>
        </div>

        {/* เกมที่เล่นอยู่ + ยอดตอนนี้ */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border border-ink/10 bg-cream-light p-3">
            <GameCover game={game} className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />
            <div className="min-w-0 flex-1 basis-40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brick-dark">
                เกมที่เล่นอยู่
              </p>
              <p className="break-words font-heading text-base leading-snug text-ink">
                {game?.name ?? 'ยังไม่เลือกเกม'}
              </p>
              {game ? (
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-600">
                  <span className="whitespace-nowrap">
                    {game.minPlayers}–{game.maxPlayers} คน
                  </span>
                  {game.playtimeMin ? (
                    <span className="whitespace-nowrap">• ~{game.playtimeMin} นาที</span>
                  ) : null}
                  {game.bggAverage ? (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-ink/20 bg-mustard px-2 py-0.5 text-[10px] font-bold text-ink">
                      ★ BGG {Number(game.bggAverage).toFixed(1)}
                    </span>
                  ) : null}
                </p>
              ) : (
                <p className="text-[11px] text-slate-600">เลือกเกมจากคลังบอร์ดเกมได้ระหว่างเล่น</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onChangeGame(r)}
              className={`${BTN.secondary} w-full shrink-0 bg-white sm:w-auto`}
            >
              <i className="fa-solid fa-right-left" aria-hidden="true"></i>
              {game ? 'เปลี่ยนเกม' : 'เลือกเกม'}
            </button>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-cream-light p-3 md:flex-col md:items-end md:justify-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              ยอดตอนนี้
            </p>
            <div className="text-right">
              <p className="font-heading text-2xl text-forest">
                {baht((r.price?.total ?? 0) + overCharge)}
              </p>
              {overCharge > 0 && (
                <p className="text-[11px] font-semibold text-brick-dark">
                  รวมค่าเกินเวลา ~{baht(overCharge)}
                </p>
              )}
              {r.price?.deposit ? (
                <p className="text-[11px] text-slate-600">มัดจำแล้ว {baht(r.price.deposit)}</p>
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
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-mustard/50 bg-mustard-light/60 px-3 py-2 text-xs"
              >
                <i className="fa-solid fa-bell-concierge text-mustard-dark" aria-hidden="true"></i>
                <span className="min-w-0 flex-1">
                  <strong>เรียกพนักงาน: {topicLabel(c.topic)}</strong> —{' '}
                  <span
                    className={
                      c.status === 'acknowledged' ? 'font-semibold text-forest' : 'text-slate-800'
                    }
                  >
                    {ASSIST_STATUS[c.status]}
                  </span>
                  {c.createdAt && (
                    <span className="text-slate-500"> • {timeTH(c.createdAt)} น.</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => onCancelCall(c._id)}
                  disabled={Boolean(cancellingId)}
                  className="shrink-0 rounded-full px-2.5 py-1 font-semibold text-slate-700 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-forest disabled:opacity-50"
                >
                  {cancellingId === c._id ? 'กำลังยกเลิก...' : 'ยกเลิกคำขอ'}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* ปุ่มหลัก */}
        <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-forest-200 bg-forest-50 p-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-white">
              <GameBoxIcon size={28} />
            </div>
            <div>
              <p className="font-heading text-base text-forest">เล่นเสร็จแล้ว?</p>
              <p className="text-[11px] text-slate-600">
                กดคืนเกมเพื่อดูยอดที่ต้องจ่าย แล้วเกมจะว่างให้คนอื่นเล่นต่อทันที
              </p>
            </div>
          </div>
          <button type="button" onClick={() => onReturn(r)} className={`${BTN.cta} py-3`}>
            <i className="fa-solid fa-box-archive" aria-hidden="true"></i>
            คืนเกม
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3">
          <span className="mr-auto text-[11px] text-slate-500">ระหว่างเล่น:</span>
          <button type="button" onClick={() => onExtend(r)} className={BTN.secondary}>
            <i className="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>
            ต่อเวลา
          </button>
          <button type="button" onClick={() => setGmOpen(true)} className={BTN.secondary}>
            <i className="fa-solid fa-headset" aria-hidden="true"></i>
            เรียกพนักงาน
          </button>
        </div>
      </div>

      {gmOpen && (
        <CallGMModal
          r={r}
          pendingTopics={pending.map((c) => c.topic)}
          onClose={() => setGmOpen(false)}
          onDone={(label) => {
            setGmOpen(false);
            showToast(`เรียกพนักงานแล้ว (${label}) — กำลังไปที่โต๊ะ`);
            setCallsTick((n) => n + 1);
          }}
        />
      )}
    </article>
  );
}
