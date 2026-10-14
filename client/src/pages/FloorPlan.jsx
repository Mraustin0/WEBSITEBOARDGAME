// หน้าจองโต๊ะ (/booking): เลือกวัน-เวลา → เลือกโต๊ะจากผังจริง → เลือกเกมให้ร้านเตรียม → ดูราคา → ยืนยัน
// ข้อมูลทั้งหมดมาจาก server: rules, /tables/floor, /reservations/availability, /reservations/quote
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  createBooking,
  fetchAvailability,
  fetchFloor,
  fetchGame,
  fetchRules,
  quoteBooking,
} from '../services/api.js';
import {
  bookingDates,
  durationOptions,
  hoursLabel,
  startISO,
  startTimes,
  thaiError,
} from '../lib/booking.js';
import { formatThaiDate, timeTH } from '../lib/date.js';
import { useSession } from '../lib/session.js';
import { useToast } from '../components/user/Toast.jsx';
import FloorMap, { FloorLegend, tableBlock } from '../components/user/booking/FloorMap.jsx';
import GamePanel from '../components/user/booking/GamePanel.jsx';
import GamePickerModal from '../components/user/booking/GamePickerModal.jsx';
import PriceBreakdown from '../components/user/booking/PriceBreakdown.jsx';
import { baht, estimatePrice } from '../components/user/booking/pricing.js';
import { BTN } from '../components/user/brandUi.js';
import FieldError from '../components/FieldError.jsx';
import { useFieldErrors } from '../lib/useFieldErrors.js';
import { vText } from '../lib/validate.js';
import { CalendarIcon, DiceIcon, TableIcon, TrophyIcon } from '../components/brand/BrandIcons.jsx';

const REFRESH_MS = 30_000;
const STEP_MIN = 30;
const HOUR_MS = 3600_000;
const DEFAULT_HOURS = 2;
const DEFAULT_PLAYERS = 2;

const card = 'bg-white rounded-2xl border border-ink/10 shadow-card';
const labelCls = 'block text-sm text-forest mb-2 font-heading';
const selectCls =
  'w-full appearance-none bg-cream-light border border-ink/15 rounded-xl text-sm font-bold text-forest pl-4 pr-10 py-2.5 outline-none cursor-pointer focus:border-forest focus:ring-2 focus:ring-forest/20 disabled:opacity-50 disabled:cursor-not-allowed';

function ErrorBanner({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-2xl bg-brick-light/60 border border-brick/30 text-brick-dark text-sm p-3.5 flex flex-wrap items-center justify-between gap-3"
    >
      <span className="min-w-0">
        <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
        {message}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-white border border-brick/30 hover:bg-brick-light shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
        >
          <i className="fa-solid fa-rotate-right mr-1"></i>ลองใหม่
        </button>
      )}
    </div>
  );
}

function SelectBox({ id, label, value, onChange, disabled, children }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <div className="relative">
        <select id={id} value={value} onChange={onChange} disabled={disabled} className={selectCls}>
          {children}
        </select>
        <i className="fa-solid fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-forest text-[10px] pointer-events-none"></i>
      </div>
    </div>
  );
}

function SummaryRow({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="w-8 h-8 rounded-full border border-ink/10 bg-cream text-forest flex items-center justify-center shrink-0">
        <i className={`fa-solid ${icon} text-xs`}></i>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <div className="font-semibold text-ink break-words">{children}</div>
      </div>
    </div>
  );
}

export default function FloorPlan() {
  const user = useSession();
  const loggedIn = Boolean(user);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const gameId = searchParams.get('game') || null;
  const [toastEl, showToast] = useToast();

  // ---------- กฎร้าน ----------
  const [rules, setRules] = useState(null);
  const [rulesError, setRulesError] = useState(null);
  const loadRules = useCallback(() => {
    setRulesError(null);
    fetchRules()
      .then(setRules)
      .catch((err) => setRulesError(thaiError(err)));
  }, []);
  useEffect(loadRules, [loadRules]);

  // นาฬิกาสำหรับตัดรอบเวลาที่ผ่านไปแล้ว (อัปเดตพร้อมการรีเฟรชผัง)
  const [clock, setClock] = useState(() => Date.now());

  // ---------- ค่าที่ผู้ใช้เลือก (raw) → ค่าที่ใช้จริงคำนวณด้านล่าง (clamp ให้ถูกกฎเสมอ) ----------
  // วัน/เวลา/ชม./คน/โต๊ะ/เกม เก็บใน URL (?date=&time=&hours=&players=&table=<code>&game=)
  // → ลิงก์จากหน้าคลังเกม และการกลับมาจาก /signin ได้ค่าที่เลือกไว้ครบ; ค่าผิดกฎจะถูกแทนด้วยค่าเริ่มต้นด้านล่าง
  const rawDate = searchParams.get('date');
  const rawTime = searchParams.get('time');
  const hoursParam = Number(searchParams.get('hours'));
  const rawDuration = hoursParam > 0 ? hoursParam : DEFAULT_HOURS;
  const playersParam = Number(searchParams.get('players'));
  const rawPlayers =
    Number.isInteger(playersParam) && playersParam >= 1 ? playersParam : DEFAULT_PLAYERS;
  const tableCode = searchParams.get('table') || null;

  /** แก้ query หลายค่าในครั้งเดียว (null = ลบ) แบบ replace — เรียกครั้งเดียวต่อ 1 การกระทำ */
  const updateParams = useCallback(
    (patch) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === undefined || v === '') next.delete(k);
            else next.set(k, String(v));
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const [rawPkg, setRawPkg] = useState('hourly');
  const [rawStudent, setRawStudent] = useState(false);
  const [note, setNote] = useState('');
  const nv = useFieldErrors({ note }, (f) => ({
    note: vText(f.note, { max: 300, label: 'หมายเหตุ' }),
  }));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [done, setDone] = useState(null);

  const dates = useMemo(() => {
    if (!rules) return [];
    const now = new Date(clock);
    return bookingDates(rules).map((d) => ({
      ...d,
      times: d.closed ? [] : startTimes(rules, d.ymd, { stepMin: STEP_MIN, now }),
    }));
  }, [rules, clock]);

  const dateInfo =
    dates.find((d) => d.ymd === rawDate && d.times.length) ||
    dates.find((d) => d.times.length) ||
    null;
  const date = dateInfo?.ymd ?? null;
  const times = dateInfo?.times ?? [];
  const time = rawTime && times.includes(rawTime) ? rawTime : (times[0] ?? null);

  const durations = useMemo(
    () => (rules && date && time ? durationOptions(rules, date, time) : []),
    [rules, date, time],
  );
  const duration = durations.includes(rawDuration)
    ? rawDuration
    : (durations.filter((h) => h <= rawDuration).pop() ?? durations[0] ?? null);

  const flatHours = rules?.FLAT_HOURS ?? 3;
  const canFlat =
    (rules?.PACKAGES ?? ['hourly', 'flat3h']).includes('flat3h') && durations.includes(flatHours);
  const pkg = rawPkg === 'flat3h' && canFlat && duration === flatHours ? 'flat3h' : 'hourly';
  const studentEnabled = Boolean(rules?.STUDENT?.enabled);
  const student = studentEnabled && rawStudent;

  const startAt = date && time ? startISO(date, time) : null;
  const endAt =
    startAt && duration ? new Date(Date.parse(startAt) + duration * HOUR_MS).toISOString() : null;
  const slotKey = startAt && duration ? `${startAt}|${duration}` : null;
  const slotText = startAt && endAt ? `${formatThaiDate(date)} · ${time}–${timeTH(endAt)}` : '';

  // ---------- ผังโต๊ะ ----------
  const [floor, setFloor] = useState(null); // { key, tables, zones }
  const [floorError, setFloorError] = useState(null);
  const [floorLoading, setFloorLoading] = useState(false);
  const floorReq = useRef(0);

  const loadFloor = useCallback(() => {
    if (!startAt || !duration) return;
    const id = ++floorReq.current;
    const key = `${startAt}|${duration}`;
    setFloorLoading(true);
    fetchFloor({ startAt, durationHours: duration })
      .then((data) => {
        if (id !== floorReq.current) return;
        setFloor({ key, tables: data?.tables ?? [], zones: data?.zones ?? [] });
        setFloorError(null);
      })
      .catch((err) => {
        if (id === floorReq.current) setFloorError(thaiError(err));
      })
      .finally(() => {
        if (id === floorReq.current) setFloorLoading(false);
      });
  }, [startAt, duration]);
  useEffect(loadFloor, [loadFloor]);

  const floorFresh = Boolean(floor && floor.key === slotKey);
  const maxCap = floor?.tables?.length
    ? Math.max(1, ...floor.tables.map((t) => Number(t.capacity) || 0))
    : 10;
  const players = Math.min(Math.max(1, rawPlayers), maxCap);
  const selectedTable = (tableCode && floor?.tables?.find((t) => t.code === tableCode)) || null;
  const tableId = selectedTable?._id ?? null;
  // เลือกโต๊ะแล้ว → เพิ่มคนได้ไม่เกินที่นั่งของโต๊ะนั้น
  const playerMax = selectedTable ? Math.max(1, Number(selectedTable.capacity) || 1) : maxCap;

  // ---------- ความว่างของโต๊ะ/เกม (ตามจำนวนคน) ----------
  const [avail, setAvail] = useState(null); // { key, ...data }
  const [availError, setAvailError] = useState(null);
  const [availLoading, setAvailLoading] = useState(false);
  const availReq = useRef(0);

  const loadAvail = useCallback(() => {
    if (!startAt || !duration) return;
    const id = ++availReq.current;
    const key = `${startAt}|${duration}|${players}`;
    setAvailLoading(true);
    fetchAvailability({ startAt, durationHours: duration, players })
      .then((data) => {
        if (id !== availReq.current) return;
        setAvail({ ...data, key });
        setAvailError(null);
      })
      .catch((err) => {
        if (id === availReq.current) setAvailError(thaiError(err));
      })
      .finally(() => {
        if (id === availReq.current) setAvailLoading(false);
      });
  }, [startAt, duration, players]);
  // หน่วงเล็กน้อย เผื่อกดเพิ่ม/ลดจำนวนคนรัว ๆ
  useEffect(() => {
    const t = setTimeout(loadAvail, 250);
    return () => clearTimeout(t);
  }, [loadAvail]);

  const availNow = avail && avail.key === `${slotKey}|${players}` ? avail : null;

  // รีเฟรชอัตโนมัติทุก 30 วิ และเมื่อกลับมาที่หน้าต่างนี้
  useEffect(() => {
    const refresh = () => {
      setClock(Date.now());
      loadFloor();
      loadAvail();
    };
    const timer = setInterval(refresh, REFRESH_MS);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [loadFloor, loadAvail]);

  // โต๊ะที่เลือกไว้ไม่ว่างแล้ว (มีคนจองตัดหน้า / เปลี่ยนเวลา / คนเกินที่นั่ง) → ล้างแล้วแจ้ง
  useEffect(() => {
    if (!tableCode || !floor || floor.key !== slotKey) return;
    const t = floor.tables.find((x) => x.code === tableCode);
    const block = tableBlock(t, players);
    if (!block) return;
    updateParams({ table: null });
    if (!t) return; // รหัสโต๊ะใน URL ไม่มีจริง → ทิ้งเงียบ ๆ
    showToast(
      block === 'too_small'
        ? `โต๊ะ ${t.code} นั่งได้ไม่เกิน ${t.capacity} คน — เลือกโต๊ะอื่นแทน`
        : `โต๊ะ ${t.code} ไม่ว่างช่วงเวลานี้แล้ว — เลือกโต๊ะอื่นแทน`,
      false,
    );
  }, [floor, slotKey, tableCode, players, showToast, updateParams]);

  // ---------- เกมที่เลือก (?game=) ----------
  const [gameData, setGameData] = useState(null);
  const [gameMissingId, setGameMissingId] = useState(null);
  useEffect(() => {
    if (!gameId) return undefined;
    let alive = true;
    fetchGame(gameId)
      .then((g) => {
        if (alive) setGameData(g);
      })
      .catch(() => {
        if (alive) setGameMissingId(gameId);
      });
    return () => {
      alive = false;
    };
  }, [gameId]);

  const gameAvail = availNow?.games?.find((g) => g._id === gameId) ?? null;
  const game = gameId
    ? { ...(gameData?._id === gameId ? gameData : null), ...gameAvail, _id: gameId }
    : null;
  const gameMissing = Boolean(gameId) && gameMissingId === gameId && !gameAvail;

  const pickGame = useCallback(
    (g) => {
      setPickerOpen(false);
      if (g) setGameData(g);
      updateParams({ game: g?._id ?? null });
    },
    [updateParams],
  );
  const closePicker = useCallback(() => setPickerOpen(false), []);

  // ---------- ราคา (quote จาก server, หน่วง 300ms) ----------
  const quoteBody = useMemo(
    () =>
      tableId && startAt && duration
        ? {
            table: tableId,
            game: gameId,
            players,
            startAt,
            durationHours: duration,
            package: pkg,
            student,
          }
        : null,
    [tableId, gameId, players, startAt, duration, pkg, student],
  );
  const quoteKey = quoteBody ? JSON.stringify(quoteBody) : null;
  const [quote, setQuote] = useState({ key: null, data: null, error: null });
  const [quoteNonce, setQuoteNonce] = useState(0);
  const quoteReq = useRef(0);

  useEffect(() => {
    if (!loggedIn || !quoteBody) return undefined;
    const id = ++quoteReq.current;
    const key = JSON.stringify(quoteBody);
    const timer = setTimeout(() => {
      quoteBooking(quoteBody)
        .then((data) => {
          if (id === quoteReq.current) setQuote({ key, data, error: null });
        })
        .catch((err) => {
          if (id === quoteReq.current) setQuote({ key, data: null, error: thaiError(err) });
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [loggedIn, quoteBody, quoteNonce]);

  const quoteNow = loggedIn && quoteKey && quote.key === quoteKey ? quote : null;
  const quoting = loggedIn && Boolean(quoteBody) && !quoteNow;
  const estimate = useMemo(
    () =>
      duration
        ? estimatePrice({
            rules,
            players,
            hours: pkg === 'flat3h' ? flatHours : duration,
            pkg,
            extraPerHour: Number(selectedTable?.extraPerHour) || 0,
            student,
          })
        : null,
    [rules, players, pkg, flatHours, duration, selectedTable?.extraPerHour, student],
  );

  // ---------- handlers ----------
  function chooseDate(ymd) {
    const d = dates.find((x) => x.ymd === ymd);
    updateParams({ date: ymd, time: d?.times[0] ?? null }); // เปลี่ยนวัน → เริ่มที่รอบแรกที่จองได้
    setDone(null);
  }

  function chooseDuration(h) {
    updateParams({ hours: h });
    if (h !== flatHours) setRawPkg('hourly');
  }

  function choosePackage(p) {
    setRawPkg(p);
    if (p === 'flat3h') updateParams({ hours: flatHours });
  }

  function chooseTable(id) {
    const t = floor?.tables?.find((x) => x._id === id);
    if (t) updateParams({ table: t.code === tableCode ? null : t.code });
    setSubmitError(null);
    setDone(null);
  }

  function changePlayers(delta) {
    updateParams({ players: Math.min(playerMax, Math.max(1, players + delta)) });
  }

  function goSignin() {
    navigate('/signin', { state: { from: '/booking' + location.search } });
  }

  async function confirm() {
    if (!loggedIn) {
      goSignin();
      return;
    }
    if (!quoteBody || submitting) return;
    if (!nv.submit()) return;
    setSubmitting(true);
    setSubmitError(null);
    const code = selectedTable?.code ?? '';
    try {
      const r = await createBooking({ ...quoteBody, note: note.trim() });
      const bookedCode = r?.table?.code ?? code;
      showToast(`จองโต๊ะ ${bookedCode} สำเร็จ`);
      setDone({
        code: bookedCode,
        when: slotText,
        game: r?.game?.name ?? game?.name ?? null,
        total: r?.price?.total ?? quoteNow?.data?.price?.total ?? null,
      });
      updateParams({ table: null });
      setNote('');
      nv.reset();
      loadFloor();
      loadAvail();
    } catch (err) {
      if (err?.status === 400 && nv.server(err)) return;
      const msg = thaiError(err);
      showToast(msg, false);
      if (err?.status === 409) {
        // มีคนจองตัดหน้า → โหลดสถานะใหม่ (ถ้าโต๊ะไม่ว่างแล้วจะถูกล้างอัตโนมัติ)
        setQuote({ key: null, data: null, error: null });
        setQuoteNonce((n) => n + 1);
        loadFloor();
        loadAvail();
      }
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- render ----------
  if (!rules) {
    return (
      <div className="paper min-h-[calc(100vh-4rem)] w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {rulesError ? (
            <ErrorBanner message={`โหลดข้อมูลร้านไม่สำเร็จ: ${rulesError}`} onRetry={loadRules} />
          ) : (
            <div className="flex items-center justify-center py-24 text-slate-500">
              <i className="fa-solid fa-spinner fa-spin mr-2"></i> กำลังโหลด...
            </div>
          )}
        </div>
      </div>
    );
  }

  const windowError = availNow && availNow.bookable === false ? availNow.reason : null;
  const confirmDisabled = loggedIn
    ? !quoteBody ||
      !floorFresh ||
      submitting ||
      quoting ||
      Boolean(quoteNow?.error) ||
      Boolean(windowError)
    : false;
  const cutoff = rules.CANCEL_CUTOFF_HOURS ?? 0;

  return (
    <div className="paper min-h-[calc(100vh-4rem)] w-full text-ink">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-ink/10 bg-white shadow-card sm:flex">
            <TableIcon size={40} />
          </span>
          <div className="min-w-0">
            <h1 className="font-heading text-3xl sm:text-4xl leading-tight text-forest">จองโต๊ะ</h1>
            <p className="text-sm text-slate-600">
              จองล่วงหน้าได้ไม่เกิน {rules.MAX_ADVANCE_DAYS} วัน · ครั้งละ {rules.MIN_HOURS}–
              {rules.MAX_HOURS} ชม.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
          <div className="min-w-0 flex flex-col gap-5">
            {/* 1. วันและเวลา */}
            <section
              className={`${card} p-4 sm:p-5 flex flex-col gap-4`}
              aria-label="เลือกวันและเวลา"
            >
              <div>
                <span className={labelCls}>1. วันที่</span>
                <div className="grid grid-cols-4 gap-2">
                  {dates.map((d) => {
                    const active = d.ymd === date;
                    const off = !d.times.length;
                    return (
                      <button
                        key={d.ymd}
                        type="button"
                        disabled={off}
                        aria-pressed={active}
                        onClick={() => chooseDate(d.ymd)}
                        className={`py-2 px-1 rounded-2xl border flex flex-col items-center transition min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-1 ${
                          active
                            ? 'bg-forest text-white border-forest shadow-sm'
                            : off
                              ? 'bg-cream-light text-slate-400 border-ink/5 cursor-not-allowed'
                              : 'bg-cream-light hover:bg-cream hover:border-forest/50 text-slate-700 border-ink/15'
                        }`}
                      >
                        <span
                          className={`text-[10px] truncate max-w-full ${active ? 'text-forest-100' : 'text-slate-500'}`}
                        >
                          {d.label}
                        </span>
                        <span className="font-bold text-sm truncate max-w-full">{d.display}</span>
                        {off && (
                          <span className="text-[9px] font-bold text-brick-dark">
                            {d.closed ? 'ร้านปิด' : 'หมดรอบ'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {date ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <SelectBox
                      id="booking-start"
                      label="2. เวลาเริ่ม"
                      value={time ?? ''}
                      onChange={(e) => {
                        updateParams({ time: e.target.value });
                        setDone(null);
                      }}
                    >
                      {times.map((t) => (
                        <option key={t} value={t}>
                          {t} น.
                        </option>
                      ))}
                    </SelectBox>
                    <SelectBox
                      id="booking-duration"
                      label="3. ระยะเวลา"
                      value={duration ?? ''}
                      onChange={(e) => chooseDuration(Number(e.target.value))}
                      disabled={pkg === 'flat3h'}
                    >
                      {durations.map((h) => (
                        <option key={h} value={h}>
                          {hoursLabel(h)}
                        </option>
                      ))}
                    </SelectBox>
                  </div>
                  {endAt && (
                    <p className="text-xs text-slate-600 -mt-1">
                      <i className="fa-regular fa-clock mr-1 text-forest"></i>
                      {slotText}
                      {pkg === 'flat3h' && ' (แพ็กเกจเหมา)'}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-600 bg-cream-light border border-ink/10 rounded-xl p-3">
                  ช่วงนี้ไม่มีรอบว่างให้จอง ลองกลับมาดูใหม่ภายหลัง
                </p>
              )}

              <div className="flex items-center justify-between gap-3 bg-cream-light p-2.5 rounded-2xl border border-ink/10">
                <div className="pl-1 min-w-0">
                  <span className="text-sm text-forest block font-heading">4. จำนวนผู้เล่น</span>
                  <span className="text-[10px] text-slate-600">
                    {selectedTable
                      ? `โต๊ะ ${selectedTable.code} นั่งได้ ${selectedTable.capacity} คน` +
                        (players >= playerMax && playerMax < maxCap
                          ? ' — เลือกโต๊ะที่ใหญ่ขึ้นถ้าจะเพิ่มคน'
                          : '')
                      : `สูงสุด ${maxCap} คน (ตามโต๊ะใหญ่สุดในร้าน)`}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => changePlayers(-1)}
                    disabled={players <= 1}
                    aria-label="ลดจำนวนผู้เล่น"
                    className="w-10 h-10 rounded-full bg-white border border-ink/15 text-forest hover:bg-cream active:scale-95 flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-forest disabled:opacity-40"
                  >
                    <i className="fa-solid fa-minus text-xs"></i>
                  </button>
                  <span
                    className="font-heading text-xl text-forest w-6 text-center"
                    aria-live="polite"
                  >
                    {players}
                  </span>
                  <button
                    type="button"
                    onClick={() => changePlayers(1)}
                    disabled={players >= playerMax}
                    aria-label="เพิ่มจำนวนผู้เล่น"
                    className="w-10 h-10 rounded-full bg-forest text-white flex items-center justify-center hover:bg-forest-dark active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 disabled:opacity-40"
                  >
                    <i className="fa-solid fa-plus text-xs"></i>
                  </button>
                </div>
              </div>

              {windowError && (
                <p className="text-xs font-semibold text-slate-800 bg-mustard-light/60 border border-mustard/50 rounded-xl p-3">
                  <i className="fa-solid fa-triangle-exclamation mr-1.5 text-mustard-dark"></i>
                  {thaiError({ message: windowError })}
                </p>
              )}
            </section>

            {/* 2. ผังโต๊ะ */}
            <section className={`${card} p-4 sm:p-5 flex flex-col gap-4`} aria-label="ผังโต๊ะ">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2.5">
                  <TableIcon size={34} />
                  <div className="min-w-0">
                    <h2 className="text-xl font-heading text-forest">5. เลือกโต๊ะ</h2>
                    <p className="text-[11px] text-slate-600">
                      สถานะช่วง {slotText || '-'} · อัปเดตเองทุก 30 วินาที
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    loadFloor();
                    loadAvail();
                  }}
                  disabled={!slotKey || floorLoading}
                  className={`${BTN.secondary} shrink-0`}
                >
                  <i
                    className={`fa-solid fa-rotate-right mr-1 ${floorLoading ? 'fa-spin' : ''}`}
                  ></i>
                  รีเฟรช
                </button>
              </div>

              <FloorLegend />

              {floorError && (
                <ErrorBanner message={`โหลดผังโต๊ะไม่สำเร็จ: ${floorError}`} onRetry={loadFloor} />
              )}

              {!slotKey ? null : !floor ? (
                !floorError && (
                  <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i> กำลังโหลดผังโต๊ะ...
                  </div>
                )
              ) : floor.tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-slate-600 gap-3 rounded-2xl border-2 border-dashed border-ink/15 bg-cream-light">
                  <TableIcon size={56} />
                  <p className="font-heading text-lg text-forest">ร้านยังไม่ได้เพิ่มโต๊ะ</p>
                </div>
              ) : (
                <div
                  className={`floor-grid-blueprint relative rounded-2xl border border-ink/10 p-3 sm:p-4 transition-opacity ${floorFresh ? '' : 'opacity-50 pointer-events-none'}`}
                  aria-busy={!floorFresh}
                >
                  <FloorMap
                    tables={floor.tables}
                    zones={floor.zones}
                    players={players}
                    selectedId={tableId}
                    onSelect={chooseTable}
                  />
                </div>
              )}

              <div className="pt-3 border-t border-ink/10 text-xs text-slate-600 flex items-center gap-2">
                <i className="fa-solid fa-door-open text-forest text-base"></i>
                <span>ทางเข้าร้าน · เช็คอินที่เคาน์เตอร์</span>
              </div>
            </section>
          </div>

          {/* แผงสรุป (มือถือ: อยู่ใต้ผัง, จอใหญ่: ติดด้านขวา) */}
          <aside className="min-w-0 flex flex-col gap-5 lg:sticky lg:top-20">
            <section className={`${card} p-4 sm:p-5`} aria-label="เกมพร้อมเล่นเมื่อมาถึง">
              <h2 className="text-lg font-heading text-forest mb-3 flex items-center gap-2">
                <DiceIcon size={28} /> เกมพร้อมเล่นเมื่อมาถึง
              </h2>
              <GamePanel
                game={game}
                loading={Boolean(gameId) && !game?.name}
                missing={gameMissing}
                onChange={() => setPickerOpen(true)}
                onClear={() => pickGame(null)}
              />
            </section>

            {done ? (
              <section
                className={`${card} overflow-hidden flex flex-col border-forest-300`}
                aria-live="polite"
              >
                <div aria-hidden="true" className="board-border h-1.5 w-full" />
                <div className="p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-full bg-cream border border-ink/10 flex items-center justify-center shrink-0">
                      <TrophyIcon size={32} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-heading text-xl text-forest">
                        จองโต๊ะ {done.code} สำเร็จ
                      </h2>
                      <p className="text-xs text-slate-600">{done.when}</p>
                    </div>
                  </div>
                  {done.game && <p className="text-sm text-slate-700">เกม: {done.game}</p>}
                  {done.total != null && (
                    <p className="text-sm text-slate-700">ยอดรวม {baht(done.total)}</p>
                  )}
                  <Link to="/reservations" className={`${BTN.primary} w-full py-3`}>
                    ดูการจองของฉัน
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDone(null)}
                    className={`${BTN.secondary} w-full py-2.5 text-sm`}
                  >
                    จองอีกโต๊ะ
                  </button>
                </div>
              </section>
            ) : (
              <section className={`${card} p-4 sm:p-5 flex flex-col gap-4`} aria-label="สรุปการจอง">
                <h2 className="text-lg font-heading text-forest flex items-center gap-2">
                  <CalendarIcon size={28} /> สรุปการจอง
                </h2>

                <div className="flex flex-col gap-3">
                  <SummaryRow icon="fa-chair" label="โต๊ะ">
                    {selectedTable ? (
                      <>
                        {selectedTable.code}
                        {selectedTable.name ? ` · ${selectedTable.name}` : ''}
                        <span className="font-normal text-slate-600 text-xs">
                          {' '}
                          (โซน {selectedTable.zone || '-'})
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-500 font-normal text-xs">
                        ยังไม่ได้เลือก — แตะโต๊ะว่างบนผัง
                      </span>
                    )}
                  </SummaryRow>
                  <SummaryRow icon="fa-clock" label="วันและเวลา">
                    {slotText ? (
                      <>
                        {slotText}{' '}
                        <span className="font-normal text-slate-600 text-xs">
                          ({duration ? hoursLabel(duration) : '-'})
                        </span>
                      </>
                    ) : (
                      '-'
                    )}
                  </SummaryRow>
                  <SummaryRow icon="fa-users" label="ผู้เล่น">
                    {players} คน
                  </SummaryRow>
                </div>

                {canFlat && (
                  <div>
                    <span className={labelCls}>แพ็กเกจ</span>
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="แพ็กเกจ">
                      {[
                        {
                          id: 'hourly',
                          title: 'รายชั่วโมง',
                          sub: `${baht(rules.PRICE_PER_PERSON_HOUR)}/คน/ชม.`,
                        },
                        {
                          id: 'flat3h',
                          title: `เหมา ${hoursLabel(flatHours)}`,
                          sub: `${baht(rules.FLAT_3H_PER_PERSON)}/คน`,
                        },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          role="radio"
                          aria-checked={pkg === p.id}
                          onClick={() => choosePackage(p.id)}
                          className={`rounded-2xl border px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-forest ${
                            pkg === p.id
                              ? 'border-forest bg-forest-50 ring-2 ring-forest/20'
                              : 'border-ink/15 bg-cream-light hover:bg-cream hover:border-forest/40'
                          }`}
                        >
                          <span className="block text-xs font-bold text-ink">{p.title}</span>
                          <span className="block text-[11px] text-slate-600">{p.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {studentEnabled && (
                  <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer bg-cream-light rounded-xl border border-ink/10 p-3">
                    <input
                      type="checkbox"
                      checked={student}
                      onChange={(e) => setRawStudent(e.target.checked)}
                      className="mt-0.5 accent-forest w-4 h-4"
                    />
                    <span>
                      <span className="font-bold">ส่วนลดนักศึกษา {rules.STUDENT.percent}%</span> —
                      แสดงบัตรที่หน้าร้าน
                    </span>
                  </label>
                )}

                <div className="rounded-2xl bg-cream-light border border-ink/10 p-3.5 flex flex-col gap-2">
                  {loggedIn && quoteBody ? (
                    quoteNow?.error ? (
                      <p role="alert" className="text-xs font-semibold text-brick-dark">
                        <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
                        {quoteNow.error}
                      </p>
                    ) : quoteNow?.data?.price ? (
                      <PriceBreakdown price={quoteNow.data.price} rules={rules} />
                    ) : (
                      <p className="text-xs text-slate-500 py-3 text-center">
                        <i className="fa-solid fa-spinner fa-spin mr-1.5"></i> กำลังคำนวณราคา...
                      </p>
                    )
                  ) : (
                    <>
                      <p className="text-[11px] font-bold text-ink bg-mustard-light border border-mustard/60 rounded-full px-2.5 py-1">
                        {loggedIn
                          ? 'ราคาโดยประมาณ — เลือกโต๊ะเพื่อดูราคาจริง'
                          : 'ราคาโดยประมาณ — เข้าสู่ระบบเพื่อดูราคาจริง'}
                      </p>
                      <PriceBreakdown price={estimate} rules={rules} />
                      {rules.PEAK?.enabled && pkg === 'hourly' && (
                        <p className="text-[11px] text-slate-600">
                          ช่วงพีค {rules.PEAK.start}–{rules.PEAK.end} น. คิด{' '}
                          {baht(rules.PEAK.perPersonHour)}/คน/ชม.
                        </p>
                      )}
                    </>
                  )}
                </div>

                {loggedIn && (
                  <div>
                    <label htmlFor="booking-note" className={labelCls}>
                      หมายเหตุถึงร้าน (ไม่บังคับ)
                    </label>
                    <textarea
                      id="booking-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      maxLength={300}
                      {...nv.bind('note')}
                      rows={2}
                      placeholder="เช่น ขอที่นั่งใกล้ปลั๊ก, มีเด็กเล็กมาด้วย"
                      className="w-full rounded-xl border border-ink/15 bg-white text-sm p-2.5 outline-none placeholder:text-slate-400 focus:border-forest focus:ring-2 focus:ring-forest/20 resize-none"
                    ></textarea>
                    <div className="flex items-start justify-between gap-2">
                      <FieldError id={nv.errId('note')} msg={nv.errors.note} className="mt-0.5" />
                      <span className="ml-auto text-[10px] text-slate-500">{note.length}/300</span>
                    </div>
                  </div>
                )}

                {submitError && !quoteNow?.error && (
                  <p role="alert" className="text-xs font-semibold text-brick-dark">
                    <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
                    {submitError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={confirm}
                  disabled={confirmDisabled}
                  className="w-full py-3.5 px-4 rounded-full disabled:bg-cream-dark disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed bg-brick-dark hover:bg-[#963a3a] active:scale-[0.99] text-white font-heading text-base transition shadow-card flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2"
                >
                  {submitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> กำลังจอง...
                    </>
                  ) : !loggedIn ? (
                    <>
                      <i className="fa-solid fa-right-to-bracket"></i> เข้าสู่ระบบเพื่อจอง
                    </>
                  ) : !tableId ? (
                    'เลือกโต๊ะก่อนจอง'
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i> จองโต๊ะ {selectedTable?.code}
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-slate-500">
                  {cutoff > 0
                    ? `ยกเลิกเองได้ถึง ${cutoff} ชม. ก่อนเวลาเริ่ม`
                    : 'ยกเลิกเองได้จนถึงเวลาเริ่ม'}
                </p>
              </section>
            )}
          </aside>
        </div>

        {pickerOpen && (
          <GamePickerModal
            games={availNow?.games ?? null}
            loading={availLoading || !availNow}
            error={availError}
            onRetry={loadAvail}
            selectedId={gameId}
            onSelect={pickGame}
            onClose={closePicker}
            slotText={slotText}
            players={players}
          />
        )}

        {toastEl}
      </div>
    </div>
  );
}
