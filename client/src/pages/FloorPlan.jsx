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

const REFRESH_MS = 30_000;
const STEP_MIN = 30;
const HOUR_MS = 3600_000;
const DEFAULT_HOURS = 2;
const DEFAULT_PLAYERS = 2;

const card = 'bg-white rounded-2xl border border-slate-200 shadow-sm';
const labelCls = 'block text-xs font-bold text-slate-700 mb-2 font-heading';
const selectCls =
  'w-full appearance-none bg-[#f8fafc] border border-slate-300 rounded-xl text-sm font-bold text-[#064e3b] pl-4 pr-10 py-2.5 outline-none cursor-pointer focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed';

function ErrorBanner({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm p-3.5 flex items-center justify-between gap-3"
    >
      <span className="min-w-0">
        <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
        {message}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-red-200 hover:bg-red-100 shrink-0"
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
        <i className="fa-solid fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-[#064e3b] text-[10px] pointer-events-none"></i>
      </div>
    </div>
  );
}

function SummaryRow({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="w-8 h-8 rounded-xl bg-emerald-50 text-[#064e3b] flex items-center justify-center shrink-0">
        <i className={`fa-solid ${icon} text-xs`}></i>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-slate-400">{label}</p>
        <div className="font-semibold text-slate-800 break-words">{children}</div>
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
        ? `โต๊ะ ${t.code} นั่งได้ไม่เกิน ${t.capacity} คน — กรุณาเลือกโต๊ะใหม่`
        : `โต๊ะ ${t.code} ไม่ว่างในช่วงเวลานี้แล้ว — กรุณาเลือกโต๊ะใหม่`,
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
    setSubmitting(true);
    setSubmitError(null);
    const code = selectedTable?.code ?? '';
    try {
      const r = await createBooking({ ...quoteBody, note });
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
      loadFloor();
      loadAvail();
    } catch (err) {
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
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {rulesError ? (
          <ErrorBanner message={`โหลดข้อมูลร้านไม่สำเร็จ: ${rulesError}`} onRetry={loadRules} />
        ) : (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <i className="fa-solid fa-spinner fa-spin mr-2"></i> กำลังโหลด...
          </div>
        )}
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-heading font-bold text-[#064e3b] flex items-center gap-2">
          <i className="fa-solid fa-layer-group text-emerald-600 text-xl"></i> จองโต๊ะ
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          จองล่วงหน้าได้ไม่เกิน {rules.MAX_ADVANCE_DAYS} วัน · ครั้งละ {rules.MIN_HOURS}–
          {rules.MAX_HOURS} ชม.
        </p>
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
                      className={`py-2 px-1 rounded-xl border flex flex-col items-center transition min-w-0 ${
                        active
                          ? 'bg-[#064e3b] text-white border-[#064e3b] shadow-sm'
                          : off
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span
                        className={`text-[10px] truncate max-w-full ${active ? 'text-emerald-200' : 'text-slate-400'}`}
                      >
                        {d.label}
                      </span>
                      <span className="font-bold text-sm truncate max-w-full">{d.display}</span>
                      {off && (
                        <span className="text-[9px] font-bold text-rose-500">
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
                  <p className="text-xs text-slate-500 -mt-1">
                    <i className="fa-regular fa-clock mr-1"></i>
                    {slotText}
                    {pkg === 'flat3h' && ' (แพ็กเกจเหมา)'}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-3">
                ช่วงนี้ไม่มีรอบเวลาที่จองได้ ลองกลับมาใหม่ภายหลัง
              </p>
            )}

            <div className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
              <div className="pl-1 min-w-0">
                <span className="text-xs font-bold text-slate-800 block font-heading">
                  4. จำนวนผู้เล่น
                </span>
                <span className="text-[10px] text-slate-500">
                  {selectedTable
                    ? `โต๊ะ ${selectedTable.code} นั่งได้ ${selectedTable.capacity} คน` +
                      (players >= playerMax && playerMax < maxCap
                        ? ' — เลือกโต๊ะใหญ่ขึ้นเพื่อเพิ่มคน'
                        : '')
                    : `สูงสุด ${maxCap} คน (ตามโต๊ะที่ใหญ่ที่สุด)`}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => changePlayers(-1)}
                  disabled={players <= 1}
                  aria-label="ลดจำนวนผู้เล่น"
                  className="w-9 h-9 rounded-xl bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 active:scale-95 flex items-center justify-center transition disabled:opacity-40"
                >
                  <i className="fa-solid fa-minus text-xs"></i>
                </button>
                <span
                  className="font-heading font-bold text-lg text-[#064e3b] w-6 text-center"
                  aria-live="polite"
                >
                  {players}
                </span>
                <button
                  type="button"
                  onClick={() => changePlayers(1)}
                  disabled={players >= playerMax}
                  aria-label="เพิ่มจำนวนผู้เล่น"
                  className="w-9 h-9 rounded-xl bg-[#064e3b] text-white flex items-center justify-center hover:bg-[#065f46] active:scale-95 transition disabled:opacity-40"
                >
                  <i className="fa-solid fa-plus text-xs"></i>
                </button>
              </div>
            </div>

            {windowError && (
              <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
                {thaiError({ message: windowError })}
              </p>
            )}
          </section>

          {/* 2. ผังโต๊ะ */}
          <section className={`${card} p-4 sm:p-5 flex flex-col gap-4`} aria-label="ผังโต๊ะ">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-heading font-bold text-slate-800">5. เลือกโต๊ะ</h2>
                <p className="text-[11px] text-slate-500">
                  สถานะ ณ {slotText || '-'} · อัปเดตอัตโนมัติทุก 30 วินาที
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  loadFloor();
                  loadAvail();
                }}
                disabled={!slotKey || floorLoading}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 shrink-0"
              >
                <i className={`fa-solid fa-rotate-right mr-1 ${floorLoading ? 'fa-spin' : ''}`}></i>
                รีเฟรช
              </button>
            </div>

            <FloorLegend />

            {floorError && (
              <ErrorBanner message={`โหลดผังโต๊ะไม่สำเร็จ: ${floorError}`} onRetry={loadFloor} />
            )}

            {!slotKey ? null : !floor ? (
              !floorError && (
                <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i> กำลังโหลดผังโต๊ะ...
                </div>
              )
            ) : floor.tables.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-400 gap-2">
                <i className="fa-solid fa-chair text-3xl"></i>
                <p className="text-sm font-semibold">ร้านยังไม่ได้เพิ่มโต๊ะ</p>
              </div>
            ) : (
              <div
                className={`relative transition-opacity ${floorFresh ? '' : 'opacity-50 pointer-events-none'}`}
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

            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-2">
              <i className="fa-solid fa-door-open text-[#064e3b] text-base"></i>
              <span>ทางเข้าหลัก · เช็กอินที่เคาน์เตอร์บาริสต้า</span>
            </div>
          </section>
        </div>

        {/* แผงสรุป (มือถือ: อยู่ใต้ผัง, จอใหญ่: ติดด้านขวา) */}
        <aside className="min-w-0 flex flex-col gap-5 lg:sticky lg:top-20">
          <section className={`${card} p-4 sm:p-5`} aria-label="เกมพร้อมเล่นเมื่อมาถึง">
            <h2 className="text-sm font-heading font-bold text-slate-800 mb-3 flex items-center gap-2">
              <i className="fa-solid fa-dice text-emerald-600"></i> เกมพร้อมเล่นเมื่อมาถึง
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
              className={`${card} p-5 flex flex-col gap-3 border-emerald-300`}
              aria-live="polite"
            >
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shrink-0">
                  <i className="fa-solid fa-circle-check"></i>
                </span>
                <div className="min-w-0">
                  <h2 className="font-heading font-bold text-[#064e3b]">
                    จองโต๊ะ {done.code} สำเร็จ
                  </h2>
                  <p className="text-xs text-slate-500">{done.when}</p>
                </div>
              </div>
              {done.game && <p className="text-sm text-slate-700">เกม: {done.game}</p>}
              {done.total != null && (
                <p className="text-sm text-slate-700">ยอดรวม {baht(done.total)}</p>
              )}
              <Link
                to="/reservations"
                className="w-full py-3 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white font-heading font-bold text-sm text-center"
              >
                ดูการจองของฉัน
              </Link>
              <button
                type="button"
                onClick={() => setDone(null)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                จองโต๊ะเพิ่ม
              </button>
            </section>
          ) : (
            <section className={`${card} p-4 sm:p-5 flex flex-col gap-4`} aria-label="สรุปการจอง">
              <h2 className="text-sm font-heading font-bold text-slate-800 flex items-center gap-2">
                <i className="fa-regular fa-calendar-check text-emerald-600"></i> สรุปการจอง
              </h2>

              <div className="flex flex-col gap-3">
                <SummaryRow icon="fa-chair" label="โต๊ะ">
                  {selectedTable ? (
                    <>
                      {selectedTable.code}
                      {selectedTable.name ? ` · ${selectedTable.name}` : ''}
                      <span className="font-normal text-slate-500 text-xs">
                        {' '}
                        (โซน {selectedTable.zone || '-'})
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400 font-normal text-xs">
                      ยังไม่ได้เลือก — แตะโต๊ะว่างบนผัง
                    </span>
                  )}
                </SummaryRow>
                <SummaryRow icon="fa-clock" label="วันและเวลา">
                  {slotText ? (
                    <>
                      {slotText}{' '}
                      <span className="font-normal text-slate-500 text-xs">
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
                        className={`rounded-xl border px-3 py-2 text-left transition ${
                          pkg === p.id
                            ? 'border-[#064e3b] bg-emerald-50 ring-2 ring-[#064e3b]/15'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-xs font-bold text-slate-800">{p.title}</span>
                        <span className="block text-[11px] text-slate-500">{p.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {studentEnabled && (
                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer bg-slate-50 rounded-xl border border-slate-200 p-3">
                  <input
                    type="checkbox"
                    checked={student}
                    onChange={(e) => setRawStudent(e.target.checked)}
                    className="mt-0.5 accent-[#064e3b] w-4 h-4"
                  />
                  <span>
                    <span className="font-bold">ส่วนลดนักศึกษา {rules.STUDENT.percent}%</span> —
                    แสดงบัตรที่หน้าร้าน
                  </span>
                </label>
              )}

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 flex flex-col gap-2">
                {loggedIn && quoteBody ? (
                  quoteNow?.error ? (
                    <p role="alert" className="text-xs font-semibold text-rose-600">
                      <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
                      {quoteNow.error}
                    </p>
                  ) : quoteNow?.data?.price ? (
                    <PriceBreakdown price={quoteNow.data.price} rules={rules} />
                  ) : (
                    <p className="text-xs text-slate-400 py-3 text-center">
                      <i className="fa-solid fa-spinner fa-spin mr-1.5"></i> กำลังคำนวณราคา...
                    </p>
                  )
                ) : (
                  <>
                    <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                      {loggedIn
                        ? 'ราคาประมาณ — เลือกโต๊ะเพื่อดูราคาจริง'
                        : 'ราคาประมาณ — เข้าสู่ระบบเพื่อดูราคาจริง'}
                    </p>
                    <PriceBreakdown price={estimate} rules={rules} />
                    {rules.PEAK?.enabled && pkg === 'hourly' && (
                      <p className="text-[11px] text-slate-500">
                        ช่วง {rules.PEAK.start}–{rules.PEAK.end} คิด{' '}
                        {baht(rules.PEAK.perPersonHour)}/คน/ชม.
                      </p>
                    )}
                  </>
                )}
              </div>

              {loggedIn && (
                <label className="block">
                  <span className={labelCls}>หมายเหตุถึงร้าน (ไม่บังคับ)</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 300))}
                    rows={2}
                    placeholder="เช่น ขอที่นั่งใกล้ปลั๊ก, มีเด็กเล็กมาด้วย"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 text-sm p-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 resize-none"
                  ></textarea>
                </label>
              )}

              {submitError && !quoteNow?.error && (
                <p role="alert" className="text-xs font-semibold text-rose-600">
                  <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
                  {submitError}
                </p>
              )}

              <button
                type="button"
                onClick={confirm}
                disabled={confirmDisabled}
                className="w-full py-3.5 px-4 rounded-xl disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed bg-[#064e3b] hover:bg-[#065f46] active:scale-[0.99] text-white font-heading font-bold text-sm transition shadow-sm flex items-center justify-center gap-2"
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
                  'เลือกโต๊ะก่อนยืนยัน'
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i> ยืนยันการจองโต๊ะ {selectedTable?.code}
                  </>
                )}
              </button>
              <p className="text-[10px] text-center text-slate-400">
                {cutoff > 0
                  ? `ยกเลิกเองได้ก่อนเวลาเริ่ม ${cutoff} ชม.`
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
  );
}
