// แก้วัน/เวลา/ชั่วโมง/จำนวนคน ของการจองที่ยังไม่เริ่ม (status = booked) → PUT /reservations/:id
import { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import { ResSummary, Row } from './ui.jsx';
import { BTN, baht, chip, errText, timeRange, ymdTH } from './utils.js';
import {
  bookingDates,
  durationOptions,
  hoursLabel,
  startISO,
  startTimes,
} from '../../../lib/booking.js';
import { formatThaiDate, timeTH } from '../../../lib/date.js';
import { updateReservation } from '../../../services/api.js';

const HOUR = 3_600_000;

export default function EditModal({ r, rules, onClose, onDone }) {
  const origYmd = ymdTH(r.startAt);
  const origHHMM = timeTH(r.startAt);
  const flat = r.price?.package === 'flat3h';
  const maxPlayers = Math.max(r.table?.capacity ?? r.players, r.players);

  const dates = useMemo(() => bookingDates(rules), [rules]);

  // รอบเวลาเริ่มของวัน d (รวมเวลาเดิมไว้ด้วยถ้าเป็นวันเดิม เผื่อจองไว้ที่ :30)
  const timesFor = (d) => {
    const list = startTimes(rules, d);
    if (d === origYmd && !list.includes(origHHMM)) return [...list, origHHMM].sort();
    return list;
  };
  const durationsFor = (d, t) => (flat ? [3] : t ? durationOptions(rules, d, t) : []);
  const fitDuration = (d, t, cur) => {
    const opts = durationsFor(d, t);
    if (opts.includes(cur)) return cur;
    return opts.filter((h) => h <= cur).pop() ?? opts[0] ?? cur;
  };

  const [ymd, setYmd] = useState(origYmd);
  const [hhmm, setHhmm] = useState(origHHMM);
  const [duration, setDuration] = useState(r.durationHours);
  const [players, setPlayers] = useState(r.players);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const times = timesFor(ymd);
  const durations = durationsFor(ymd, hhmm);

  function pickDate(d) {
    const ts = timesFor(d);
    const t = ts.includes(hhmm) ? hhmm : (ts[0] ?? '');
    setYmd(d);
    setHhmm(t);
    setDuration((cur) => fitDuration(d, t, cur));
  }

  function pickTime(t) {
    setHhmm(t);
    setDuration((cur) => fitDuration(ymd, t, cur));
  }

  const newStart = hhmm ? startISO(ymd, hhmm) : null;
  const startChanged = newStart && new Date(newStart).getTime() !== new Date(r.startAt).getTime();
  const changed = startChanged || duration !== r.durationHours || players !== r.players;
  const valid = Boolean(newStart) && durations.includes(duration);

  async function submit() {
    if (busy || !changed || !valid) return;
    const patch = {};
    if (startChanged) patch.startAt = newStart;
    if (duration !== r.durationHours) patch.durationHours = duration;
    if (players !== r.players) patch.players = players;
    setBusy(true);
    setError('');
    try {
      const updated = await updateReservation(r._id, patch);
      setResult(updated);
      onDone(updated);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  const gameRange = r.game ? [r.game.minPlayers, r.game.maxPlayers] : null;
  const outOfGameRange =
    gameRange && gameRange[0] != null && (players < gameRange[0] || players > gameRange[1]);

  return (
    <Modal
      eyebrow="แก้ไขการจอง"
      title={result ? 'บันทึกการแก้ไขแล้ว' : 'เปลี่ยนเวลา / จำนวนผู้เล่น'}
      onClose={onClose}
      busy={busy}
      footer={
        result ? (
          <button type="button" className={BTN.primary} onClick={onClose}>
            เรียบร้อย
          </button>
        ) : (
          <>
            <button type="button" className={BTN.ghost} onClick={onClose} disabled={busy}>
              ยกเลิก
            </button>
            <button
              type="button"
              className={BTN.primary}
              onClick={submit}
              disabled={busy || !changed || !valid}
            >
              {busy ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
            </button>
          </>
        )
      }
    >
      <ResSummary r={r} extra={`เดิม ${formatThaiDate(origYmd)} • ${timeRange(r)}`} />

      {result ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <Row label="วันที่" value={formatThaiDate(ymdTH(result.startAt))} />
          <Row label="เวลา" value={timeRange(result)} />
          <Row label="ผู้เล่น" value={`${result.players} คน`} />
          <Row label="ราคาเดิม" value={baht(r.price?.total)} tone="text-slate-400 line-through" />
          <Row label="ราคาใหม่" value={baht(result.price?.total)} strong />
          {result.price?.dueAtCounter != null && (
            <Row label="ชำระที่ร้าน" value={baht(result.price.dueAtCounter)} />
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <fieldset>
            <legend className="mb-1.5 text-xs font-bold text-slate-700">วันที่</legend>
            <div className="flex flex-wrap gap-2">
              {dates.map((d) => (
                <button
                  key={d.ymd}
                  type="button"
                  aria-pressed={ymd === d.ymd}
                  disabled={d.closed}
                  onClick={() => pickDate(d.ymd)}
                  className={chip(ymd === d.ymd, d.closed)}
                >
                  {d.label} <span className="font-normal opacity-80">{d.display}</span>
                  {d.closed && ' (ปิด)'}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-xs font-bold text-slate-700">เวลาเริ่ม</legend>
            {times.length ? (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {times.map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={hhmm === t}
                    onClick={() => pickTime(t)}
                    className={chip(hhmm === t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">ไม่มีรอบที่จองได้ในวันนี้</p>
            )}
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-xs font-bold text-slate-700">ระยะเวลา</legend>
            {durations.length ? (
              <div className="flex flex-wrap gap-2">
                {durations.map((h) => (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={duration === h}
                    onClick={() => setDuration(h)}
                    className={chip(duration === h)}
                  >
                    {hoursLabel(h)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">เลือกเวลาเริ่มก่อน</p>
            )}
            {flat && (
              <p className="mt-1.5 text-[11px] text-slate-500">
                แพ็กเกจเหมา 3 ชม. — เปลี่ยนชั่วโมงไม่ได้
              </p>
            )}
          </fieldset>

          <div>
            <p className="mb-1.5 text-xs font-bold text-slate-700" id="edit-players-label">
              จำนวนผู้เล่น
            </p>
            <div
              className="flex flex-wrap items-center gap-3"
              role="group"
              aria-labelledby="edit-players-label"
            >
              <button
                type="button"
                aria-label="ลดจำนวนผู้เล่น"
                disabled={players <= 1}
                onClick={() => setPlayers((p) => Math.max(1, p - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:border-emerald-400 disabled:opacity-40"
              >
                <i className="fa-solid fa-minus" aria-hidden="true"></i>
              </button>
              <span className="w-14 text-center text-base font-bold" aria-live="polite">
                {players} คน
              </span>
              <button
                type="button"
                aria-label="เพิ่มจำนวนผู้เล่น"
                disabled={players >= maxPlayers}
                onClick={() => setPlayers((p) => Math.min(maxPlayers, p + 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:border-emerald-400 disabled:opacity-40"
              >
                <i className="fa-solid fa-plus" aria-hidden="true"></i>
              </button>
              <span className="text-[11px] text-slate-500">โต๊ะนี้นั่งได้ {maxPlayers} คน</span>
            </div>
            {outOfGameRange && (
              <p className="mt-1.5 text-[11px] font-semibold text-amber-700">
                {r.game.name} เล่นได้ {gameRange[0]}–{gameRange[1]} คน — เปลี่ยนเกมก่อนถ้าต้องการ
              </p>
            )}
          </div>

          {newStart && valid && (
            <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              ใหม่: <strong>{formatThaiDate(ymd)}</strong> {hhmm}–
              {timeTH(new Date(new Date(newStart).getTime() + duration * HOUR).toISOString())} น. •{' '}
              {players} คน — ราคาใหม่จะคำนวณหลังบันทึก
            </p>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
    </Modal>
  );
}
