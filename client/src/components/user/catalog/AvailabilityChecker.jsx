// เช็กเกมว่างตามช่วงเวลา: วันที่ + เวลาเริ่ม + ระยะเวลา + จำนวนผู้เล่น (ค่าจากกฎร้านจริง)
import { useMemo } from 'react';
import {
  bookingDates,
  durationOptions,
  hoursLabel,
  startTimes,
  thaiError,
} from '../../../lib/booking.js';
import { ClockIcon } from '../../brand/BrandIcons.jsx';

const selectCls =
  'w-full bg-white border border-ink/15 text-ink rounded-xl py-2.5 pl-3.5 pr-8 text-xs font-semibold focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 appearance-none transition disabled:opacity-50 disabled:cursor-not-allowed';
const labelCls = 'text-[11px] font-bold text-slate-600 uppercase tracking-wider';

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
        <span className="w-2 h-2 rounded-full bg-teal animate-pulse shrink-0"></span>
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
        <i className="fa-solid fa-spinner fa-spin text-forest"></i>
        <span>กำลังเช็คเกมว่าง...</span>
      </>
    );
  } else if (status === 'error') {
    summary = (
      <>
        <i className="fa-solid fa-circle-exclamation text-brick-dark"></i>
        <span className="text-brick-dark">{error}</span>
        <button
          type="button"
          onClick={retry}
          className="ml-1 underline font-bold text-brick-dark hover:text-brick-dark"
        >
          ลองใหม่
        </button>
      </>
    );
  } else if (data && !data.bookable) {
    summary = (
      <>
        <i className="fa-solid fa-ban text-mustard-dark"></i>
        <span className="text-slate-800">จองช่วงนี้ไม่ได้: {thaiReason(data.reason)}</span>
      </>
    );
  } else if (data) {
    const games = data.games ?? [];
    const free = games.filter((g) => g.available).length;
    summary = (
      <>
        <span className="w-2 h-2 rounded-full bg-teal shrink-0"></span>
        <span>
          ช่วงนี้มีเกมว่าง <strong className="font-heading text-sm text-forest">{free}</strong> จาก{' '}
          {games.length || totalGames} เกม
        </span>
      </>
    );
  }

  return (
    <section
      aria-labelledby="checker-title"
      className="bg-white rounded-2xl border border-ink/10 shadow-card overflow-hidden min-w-0"
    >
      <div aria-hidden="true" className="board-border h-1.5 w-full" />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-ink/10">
          <h2
            id="checker-title"
            className="font-heading text-xl sm:text-2xl text-forest flex items-center gap-2.5"
          >
            <ClockIcon size={32} />
            เช็คเกมว่างตามวันและเวลา
          </h2>
          <div
            aria-live="polite"
            className="self-start md:self-auto bg-cream-light border border-ink/10 px-4 py-2 rounded-2xl flex flex-wrap items-center gap-2 text-xs font-medium text-slate-800"
          >
            {summary}
          </div>
        </div>

        {rulesError && (
          <p className="text-xs text-slate-800 bg-mustard-light/60 border border-mustard/50 rounded-xl px-3 py-2">
            โหลดเงื่อนไขการจองไม่สำเร็จ ({rulesError}) — ใช้ค่ามาตรฐานไปก่อน
          </p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <fieldset className="col-span-2 lg:col-span-5 flex flex-col gap-1.5 min-w-0">
            <legend className={`${labelCls} mb-1.5`}>วันที่มาร้าน</legend>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {dates.map((d) => {
                const on = slot.ymd === d.ymd;
                return (
                  <button
                    key={d.ymd}
                    type="button"
                    disabled={d.closed}
                    aria-pressed={on}
                    onClick={() => pickDate(d.ymd)}
                    className={`min-w-0 py-2 px-1 rounded-2xl border font-semibold text-xs text-center transition-all flex flex-col items-center leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed ${
                      on
                        ? 'bg-forest text-white border-forest shadow-sm'
                        : 'bg-cream-light border-ink/15 text-slate-700 hover:border-forest/50 hover:bg-cream'
                    }`}
                  >
                    <span className="max-w-full truncate">{d.label}</span>
                    <span
                      className={`max-w-full truncate text-[10px] font-medium ${on ? 'text-forest-100' : 'text-slate-500'}`}
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
              <i className="fa-solid fa-clock absolute right-3 top-1/2 -translate-y-1/2 text-forest/60 text-[10px] pointer-events-none"></i>
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
              <i className="fa-solid fa-hourglass-half absolute right-3 top-1/2 -translate-y-1/2 text-forest/60 text-[10px] pointer-events-none"></i>
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
              <i className="fa-solid fa-users absolute right-3 top-1/2 -translate-y-1/2 text-forest/60 text-[10px] pointer-events-none"></i>
            </div>
          </div>

          <div className="lg:col-span-1">
            <button
              type="button"
              onClick={onClear}
              disabled={!active}
              className="w-full h-[38px] bg-cream-light border border-ink/15 text-forest hover:bg-cream hover:border-forest/40 rounded-full px-3 font-semibold text-xs transition flex items-center justify-center gap-1.5 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-forest disabled:opacity-40"
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
