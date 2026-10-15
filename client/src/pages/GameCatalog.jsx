// คลังบอร์ดเกม (สมาชิก / ผู้เยี่ยมชม) — ข้อมูลเกมจาก DB ของร้าน (GET /api/games) ไม่เรียก BGG ตรง
// สถานะบนการ์ด = "ตอนนี้" (กล่องบนชั้น/กำลังเล่น/ส่งซ่อม) หรือ "ช่วงเวลาที่เลือก" เมื่อเช็กล่วงหน้า
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchGames, fetchRules } from '../services/api.js';
import { thaiError } from '../lib/booking.js';
import { useToast } from '../components/user/Toast.jsx';
import { BTN } from '../components/user/brandUi.js';
import { DiceIcon, GameBoxIcon } from '../components/brand/BrandIcons.jsx';
import AvailabilityChecker from '../components/user/catalog/AvailabilityChecker.jsx';
import GameCard from '../components/user/catalog/GameCard.jsx';
import GameDetailModal from '../components/user/catalog/GameDetailModal.jsx';
import { useSlotAvailability } from '../components/user/catalog/useSlotAvailability.js';
import {
  PAX_OPTIONS,
  SORT_OPTIONS,
  categoryCounts,
  fitsPlayers,
  nowStatus,
  slotStatus,
  sortGames,
} from '../components/user/catalog/catalogUtils.js';

const PAGE_LIMIT = 200; // สูงสุดที่ GET /games รับ
const MAX_PAGES = 10;
const TOP_CATEGORIES = 10;
const EMPTY_SLOT = { ymd: '', time: '', hours: 2, players: '' };

/** โหลดเกมทั้งคลัง (ทีละ 200 จนหมด) */
async function fetchAllGames() {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const items = await fetchGames({ page, limit: PAGE_LIMIT, sort: 'name', order: 'asc' });
    all.push(...items);
    if (items.length < PAGE_LIMIT) break;
  }
  return all;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-ink/10 shadow-card p-3.5 flex flex-col gap-3 animate-pulse">
      <div className="h-44 rounded-xl bg-cream"></div>
      <div className="h-3 w-1/3 rounded bg-cream"></div>
      <div className="h-4 w-2/3 rounded bg-cream-dark"></div>
      <div className="h-12 rounded-xl bg-cream"></div>
      <div className="h-9 rounded-full bg-cream"></div>
    </div>
  );
}

export default function GameCatalog() {
  const [toastEl, notify] = useToast();

  // ---------- เกม ----------
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    fetchAllGames()
      .then((items) => {
        if (!cancelled) setGames(items);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(thaiError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // ---------- กฎร้าน + ช่วงเวลาที่เช็ก ----------
  const [rules, setRules] = useState(null);
  const [rulesError, setRulesError] = useState('');
  const [slot, setSlot] = useState(EMPTY_SLOT);

  useEffect(() => {
    let cancelled = false;
    fetchRules()
      .then((r) => {
        if (cancelled) return;
        setRules(r);
        // ระยะเวลาเริ่มต้น: 2 ชม. ถ้าอยู่ในช่วงที่ร้านอนุญาต
        const min = r?.MIN_HOURS ?? 1;
        const max = r?.MAX_HOURS ?? 6;
        setSlot((s) => ({ ...s, hours: Math.min(max, Math.max(min, s.hours)) }));
      })
      .catch((err) => {
        if (!cancelled) setRulesError(thaiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const availability = useSlotAvailability(slot);
  const slotActive = Boolean(availability.byGame); // เลือกเวลาครบ + จองได้ + โหลดเสร็จ

  const clearSlot = useCallback(() => {
    setSlot((s) => ({ ...EMPTY_SLOT, hours: s.hours }));
  }, []);

  // ---------- ตัวกรอง ----------
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('rating');
  const [category, setCategory] = useState('all');
  const [pax, setPax] = useState('all');
  const [onlyFree, setOnlyFree] = useState(false);

  const categories = useMemo(() => categoryCounts(games), [games]);
  const topCategories = categories.slice(0, TOP_CATEGORIES);
  const otherCategories = categories.slice(TOP_CATEGORIES);

  // สถานะของแต่ละเกม (ช่วงที่เลือก ถ้ามี — ไม่งั้น "ตอนนี้")
  const statusOf = useCallback(
    (g) => {
      const entry = availability.byGame?.get(String(g._id));
      return entry ? slotStatus(entry) : nowStatus(g);
    },
    [availability.byGame],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const range = PAX_OPTIONS.find((p) => p.id === pax) ?? PAX_OPTIONS[0];
    const list = games.filter((g) => {
      if (q) {
        const hay = [g.name, ...(g.designers ?? [])].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (category !== 'all' && !(g.categories ?? []).includes(category)) return false;
      if (!fitsPlayers(g, range.lo, range.hi)) return false;
      if (onlyFree && !statusOf(g).ok) return false;
      return true;
    });
    return sortGames(list, sort);
  }, [games, search, category, pax, onlyFree, sort, statusOf]);

  const freeNow = useMemo(() => games.filter((g) => nowStatus(g).ok).length, [games]);
  const filtersOn = Boolean(search.trim()) || category !== 'all' || pax !== 'all' || onlyFree;

  function resetFilters() {
    setSearch('');
    setCategory('all');
    setPax('all');
    setOnlyFree(false);
  }

  // ---------- modal ----------
  const [openId, setOpenId] = useState(null);
  const openGame = useMemo(
    () => (openId ? (games.find((g) => g._id === openId) ?? null) : null),
    [games, openId],
  );
  const closeModal = useCallback(() => setOpenId(null), []);

  const chipCls = (on) =>
    `shrink-0 px-3.5 py-1.5 rounded-full border font-semibold text-xs transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-1 ${
      on
        ? 'bg-forest border-forest text-white shadow-sm'
        : 'bg-cream-light border-ink/15 hover:border-forest/50 hover:bg-cream text-slate-700'
    }`;

  return (
    <div className="paper min-h-[calc(100vh-4rem)] w-full">
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-5 sm:gap-6 font-sans min-w-0 text-ink">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-1">
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-ink/10 bg-white shadow-card sm:flex">
              <GameBoxIcon size={40} />
            </span>
            <div className="min-w-0">
              <h1 className="font-heading text-3xl sm:text-4xl leading-tight text-forest">
                คลังบอร์ดเกม
              </h1>
              <p className="text-sm text-slate-600">
                เลือกเกมที่อยากเล่น ดูว่ากล่องไหนว่าง แล้วจองโต๊ะได้ทันที
              </p>
            </div>
          </div>
          {!loading && !loadError && games.length > 0 && (
            <div className="bg-white border border-ink/10 shadow-card px-4 py-2 rounded-2xl flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal"></span>
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  ตอนนี้ในร้าน
                </span>
                <span className="text-sm font-bold text-forest">
                  ทั้งหมด {games.length} เกม • ว่าง {freeNow} เกม
                </span>
              </div>
            </div>
          )}
        </div>

        <AvailabilityChecker
          rules={rules}
          rulesError={rulesError}
          slot={slot}
          onChange={setSlot}
          onClear={clearSlot}
          result={availability}
          totalGames={games.length}
        />

        <section className="md:sticky md:top-20 z-30 bg-white/95 backdrop-blur rounded-2xl border border-ink/10 shadow-card p-4 flex flex-col gap-3.5 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-7 relative">
              <i
                className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-forest/60"
                aria-hidden="true"
              ></i>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                type="search"
                aria-label="ค้นหาเกม"
                placeholder="ค้นหาชื่อเกมหรือผู้ออกแบบ"
                className="w-full bg-cream-light border border-ink/15 focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/20 text-ink placeholder-slate-400 rounded-full text-xs font-medium pl-10 pr-4 py-2.5 focus:outline-none transition"
              />
            </div>
            <div className="md:col-span-5 flex flex-wrap items-center justify-between md:justify-end gap-3">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyFree}
                  onChange={(e) => setOnlyFree(e.target.checked)}
                  className="w-4 h-4 accent-forest"
                />
                {slotActive ? 'เฉพาะเกมที่ว่างช่วงนี้' : 'เฉพาะเกมที่ว่างตอนนี้'}
              </label>
              <span className="text-xs text-slate-500 whitespace-nowrap">
                แสดง <strong className="text-forest font-bold">{visible.length}</strong> เกม
              </span>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label="เรียงลำดับ"
                  className="bg-cream-light border border-ink/15 text-forest font-semibold text-xs py-2 pl-3.5 pr-8 rounded-full focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 appearance-none transition"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <i className="fa-solid fa-sort absolute right-3 top-1/2 -translate-y-1/2 text-forest/60 text-[10px] pointer-events-none"></i>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-2 border-t border-ink/10 min-w-0">
            <div
              className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1 min-w-0"
              role="group"
              aria-label="หมวดหมู่"
            >
              <button
                type="button"
                aria-pressed={category === 'all'}
                onClick={() => setCategory('all')}
                className={chipCls(category === 'all')}
              >
                ทั้งหมด ({games.length})
              </button>
              {topCategories.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  aria-pressed={category === c.name}
                  onClick={() => setCategory(c.name)}
                  className={chipCls(category === c.name)}
                >
                  {c.name} ({c.count})
                </button>
              ))}
              {otherCategories.length > 0 && (
                <select
                  value={otherCategories.some((c) => c.name === category) ? category : ''}
                  onChange={(e) => setCategory(e.target.value || 'all')}
                  aria-label="หมวดหมู่อื่น ๆ"
                  className={`shrink-0 rounded-full text-xs font-semibold py-1.5 pl-3 pr-2 border focus:outline-none focus-visible:ring-2 focus-visible:ring-forest ${
                    otherCategories.some((c) => c.name === category)
                      ? 'bg-forest text-white border-forest'
                      : 'bg-cream-light text-slate-700 border-ink/15'
                  }`}
                >
                  <option value="">หมวดอื่น ๆ…</option>
                  {otherCategories.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.count})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div
              className="flex items-center gap-1 bg-cream-light p-1 rounded-full border border-ink/15 self-start lg:self-auto shrink-0 max-w-full overflow-x-auto"
              role="group"
              aria-label="จำนวนผู้เล่น"
            >
              {PAX_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={pax === p.id}
                  onClick={() => setPax(p.id)}
                  className={`shrink-0 px-3 py-1 rounded-full font-semibold text-xs transition whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-forest ${
                    pax === p.id
                      ? 'bg-forest text-white shadow-sm'
                      : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {loadError ? (
          <div
            role="alert"
            className="bg-brick-light/60 border border-brick/30 text-brick-dark rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"
          >
            <span className="text-sm font-semibold flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation"></i> โหลดคลังบอร์ดเกมไม่สำเร็จ:{' '}
              {loadError}
            </span>
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} className={BTN.danger}>
              <i className="fa-solid fa-rotate-right mr-1"></i> ลองใหม่
            </button>
          </div>
        ) : loading ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-2"
            aria-busy="true"
          >
            {Array.from({ length: 8 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="bg-cream-light rounded-3xl p-10 sm:p-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-ink/15">
            <span className="mb-4 flex h-24 w-24 items-center justify-center rounded-full border border-ink/10 bg-white shadow-card">
              <GameBoxIcon size={60} />
            </span>
            <h3 className="font-heading text-2xl text-forest mb-2">ยังไม่มีเกมในคลัง</h3>
            <p className="text-sm text-slate-600">
              ร้านกำลังเพิ่มเกมเข้าคลัง แวะมาดูใหม่เร็ว ๆ นี้
            </p>
          </div>
        ) : visible.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-2">
            {visible.map((game) => (
              <GameCard
                key={game._id}
                game={game}
                status={statusOf(game)}
                slot={slotActive ? slot : null}
                onOpen={(g) => setOpenId(g._id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-cream-light rounded-3xl p-10 sm:p-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-ink/15">
            <span className="mb-4 flex h-24 w-24 items-center justify-center rounded-full border border-ink/10 bg-white shadow-card">
              <DiceIcon size={60} />
            </span>
            <h3 className="font-heading text-2xl text-forest mb-2">ไม่พบเกมที่ตรงกับตัวกรอง</h3>
            <p className="text-sm text-slate-600 mb-4">ลองเปลี่ยนคำค้นหาหรือปรับตัวกรองดู</p>
            {filtersOn && (
              <button type="button" onClick={resetFilters} className={BTN.primary}>
                ล้างตัวกรอง
              </button>
            )}
          </div>
        )}

        {openGame && (
          <GameDetailModal
            game={openGame}
            slot={slotActive ? slot : null}
            slotEntry={availability.byGame?.get(String(openGame._id)) ?? null}
            onClose={closeModal}
            notify={notify}
          />
        )}

        {toastEl}
      </main>
    </div>
  );
}
