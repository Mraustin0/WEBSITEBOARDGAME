// เช็กเกมว่างตามช่วงเวลา: วันที่ + เวลาเริ่ม + ระยะเวลา + จำนวนผู้เล่น (ค่าจากกฎร้านจริง)
import { useMemo } from 'react';
import {
  bookingDates,
  durationOptions,
  hoursLabel,
  startTimes,
  thaiError,
} from '../../../lib/booking.js';

const selectCls =
  'w-full bg-slate-50/80 border border-slate-200 text-slate-800 rounded-xl py-2.5 pl-3.5 pr-8 text-xs font-semibold focus:outline-none focus:border-emerald-600 focus:bg-white appearance-none transition disabled:opacity-50';
const labelCls = 'text-[11px] font-bold text-slate-500 uppercase tracking-wider';

const PLAYER_CHOICES = Array.from({ length: 12 }, (_, i) => i + 1);

/** เลือกชั่วโมงที่ใกล้ค่าเดิมที่สุดจากตัวเลือกใหม่ */
function clampHours(hours, options) {
  if (!options.length) return hours;
  if (options.includes(hours)) return hours;
  const below = options.filter((h) => h <= hours);
  return below.length ? below[below.length - 1] : options[0];
}

export default function AvailabilityChecker({
  rules,
  rulesError,
  slot,
  onChange,
  onClear,
  result,
  totalGames,
}) {
  const dates = useMemo(() => bookingDates(rules), [rules]);
  const times = useMemo(() => (slot.ymd ? startTimes(rules, slot.ymd) : []), [rules, slot.ymd]);
  const hourOpts = useMemo(
    () => durationOptions(rules, slot.ymd || dates[0]?.ymd, slot.time || null),
    [rules, slot.ymd, slot.time, dates],
  );

  function pickDate(ymd) {
    const nextTimes = startTimes(rules, ymd);
    const time = nextTimes.includes(slot.time) ? slot.time : '';
    const hours = clampHours(slot.hours, durationOptions(rules, ymd, time || null));
    onChange({ ...slot, ymd, time, hours });
  }

  function pickTime(time) {
    const hours = clampHours(slot.hours, durationOptions(rules, slot.ymd, time || null));
    onChange({ ...slot, time, hours });
  }

  const active = Boolean(slot.ymd || slot.time || slot.players);
  const { status, data, error, retry } = result;

  let summary;
  if (status === 'idle') {
    summary = (
      <>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
        <span>
          {slot.ymd
            ? 'เลือกเวลาเริ่มเพื่อดูว่าเกมไหนว่าง'
            : 'ตอนนี้แสดงสถานะล่าสุด — เลือกวันและเวลาเพื่อดูล่วงหน้า'}
        </span>
      </>
    );
  } else if (status === 'loading') {
    summary = (
      <>
        <i className="fa-solid fa-spinner fa-spin text-emerald-600"></i>
        <span>กำลังเช็คเกมว่าง...</span>
      </>
    );
  } else if (status === 'error') {
    summary = (
      <>
        <i className="fa-solid fa-circle-exclamation text-red-500"></i>
        <span className="text-red-700">{error}</span>
        <button
          type="button"
          onClick={retry}
          className="ml-1 underline font-bold text-red-700 hover:text-red-800"
        >
          ลองใหม่
        </button>
      </>
    );
  } else if (data && !data.bookable) {
    summary = (
      <>
        <i className="fa-solid fa-ban text-amber-600"></i>
        <span className="text-amber-800">จองช่วงนี้ไม่ได้: {thaiReason(data.reason)}</span>
      </>
    );
  } else if (data) {
    const games = data.games ?? [];
    const free = games.filter((g) => g.available).length;
    summary = (
      <>
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
        <span>
          ช่วงนี้มีเกมว่าง <strong className="text-emerald-800">{free}</strong> จาก{' '}
          {games.length || totalGames} เกม
        </span>
      </>
    );
  }

  return (
    <section
      aria-labelledby="checker-title"
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <h2
            id="checker-title"
            className="font-heading font-bold text-lg sm:text-2xl text-slate-900"
          >
            เช็คเกมว่างตามวันและเวลา
          </h2>
          <div
            aria-live="polite"
            className="self-start md:self-auto bg-slate-50 border border-slate-200/90 shadow-sm px-4 py-2 rounded-xl flex flex-wrap items-center gap-2 text-xs font-medium text-slate-800"
          >
            {summary}
          </div>
        </div>

        {rulesError && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            โหลดเงื่อนไขการจองไม่สำเร็จ ({rulesError}) — ใช้ค่ามาตรฐานไปก่อน
          </p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <fieldset className="col-span-2 lg:col-span-5 flex flex-col gap-1.5 min-w-0">
            <legend className={`${labelCls} mb-1.5`}>วันที่มาร้าน</legend>
            <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
              {dates.map((d) => {
                const on = slot.ymd === d.ymd;
                return (
                  <button
                    key={d.ymd}
                    type="button"
                    disabled={d.closed}
                    aria-pressed={on}
                    onClick={() => pickDate(d.ymd)}
                    className={`shrink-0 min-w-[72px] py-2 px-3 rounded-xl font-semibold text-xs text-center shadow-sm transition-all flex flex-col leading-tight disabled:opacity-40 disabled:cursor-not-allowed ${
                      on
                        ? 'bg-emerald-700 text-white border border-emerald-600'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{d.label}</span>
                    <span
                      className={`text-[10px] font-medium ${on ? 'text-emerald-100' : 'text-slate-400'}`}
                    >
                      {d.closed ? 'ร้านปิด' : d.display}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="lg:col-span-2 flex flex-col gap-1.5">
            <label htmlFor="slot-time" className={labelCls}>
              เวลาเริ่ม
            </label>
            <div className="relative">
              <select
                id="slot-time"
                value={slot.time}
                disabled={!slot.ymd}
                onChange={(e) => pickTime(e.target.value)}
                className={selectCls}
              >
                <option value="">
                  {!slot.ymd ? 'เลือกวันก่อน' : times.length ? 'เลือกเวลา' : 'ไม่มีรอบว่าง'}
                </option>
                {times.map((t) => (
                  <option key={t} value={t}>
                    {t} น.
                  </option>
                ))}
              </select>
              <i className="fa-solid fa-clock absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-1.5">
            <label htmlFor="slot-hours" className={labelCls}>
              ระยะเวลา
            </label>
            <div className="relative">
              <select
                id="slot-hours"
                value={slot.hours}
                onChange={(e) => onChange({ ...slot, hours: Number(e.target.value) })}
                className={selectCls}
              >
                {hourOpts.map((h) => (
                  <option key={h} value={h}>
                    {hoursLabel(h)}
                  </option>
                ))}
              </select>
              <i className="fa-solid fa-hourglass-half absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-1.5">
            <label htmlFor="slot-players" className={labelCls}>
              จำนวนผู้เล่น
            </label>
            <div className="relative">
              <select
                id="slot-players"
                value={slot.players}
                onChange={(e) => onChange({ ...slot, players: Number(e.target.value) || '' })}
                className={selectCls}
              >
                <option value="">กี่คนก็ได้</option>
                {PLAYER_CHOICES.map((n) => (
                  <option key={n} value={n}>
                    {n} คน
                  </option>
                ))}
              </select>
              <i className="fa-solid fa-users absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
            </div>
          </div>

          <div className="lg:col-span-1">
            <button
              type="button"
              onClick={onClear}
              disabled={!active}
              className="w-full h-[38px] bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl px-3 font-semibold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <i className="fa-solid fa-rotate-left"></i> ล้างค่า
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** reason จาก server (ข้อความอังกฤษ) → ภาษาไทย */
function thaiReason(reason) {
  return reason ? thaiError({ message: reason }) : 'ไม่ตรงเงื่อนไขการจอง';
}
