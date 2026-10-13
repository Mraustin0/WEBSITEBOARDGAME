// หน้า "การจองของฉัน" (สมาชิก): แท็บ กำลังเล่น / ล่วงหน้า / ประวัติ + ค้นหา
// ทุกปุ่มเรียก API จริง แล้วโหลดแท็บปัจจุบัน + ตัวเลขบนแท็บใหม่ทุกครั้ง (ไม่มี mock data)
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMyReservations, fetchMyReviews, fetchRules } from '../services/api.js';
import { timeTH } from '../lib/date.js';
import { useToast } from '../components/user/Toast.jsx';
import ActiveSessionCard from '../components/user/reservations/ActiveSessionCard.jsx';
import UpcomingCard from '../components/user/reservations/UpcomingCard.jsx';
import PastCard from '../components/user/reservations/PastCard.jsx';
import CancelModal from '../components/user/reservations/CancelModal.jsx';
import EditModal from '../components/user/reservations/EditModal.jsx';
import ChangeGameModal from '../components/user/reservations/ChangeGameModal.jsx';
import ExtendModal from '../components/user/reservations/ExtendModal.jsx';
import ReturnModal from '../components/user/reservations/ReturnModal.jsx';
import ReviewModal from '../components/user/reservations/ReviewModal.jsx';
import { EmptyState, ListSkeleton } from '../components/user/reservations/ui.jsx';
import {
  BTN,
  asList,
  dateLabel,
  errText,
  timeRange,
  useNow,
} from '../components/user/reservations/utils.js';

const TABS = [
  { key: 'active', label: 'กำลังเล่น', icon: 'fa-circle-play' },
  { key: 'upcoming', label: 'ล่วงหน้า', icon: 'fa-calendar-days' },
  { key: 'past', label: 'ประวัติ', icon: 'fa-clock-rotate-left' },
];
const PAGE_SIZE = { active: 20, upcoming: 50, past: 10 };
const EMPTY_LIST = { scope: null, query: '', items: [], total: 0, page: 1 };

const indexReviews = (list) =>
  Object.fromEntries(
    asList(list)
      .filter((rv) => rv?.game)
      .map((rv) => [String(rv.game._id ?? rv.game), rv]),
  );

export default function MyReservations() {
  const navigate = useNavigate();
  const [toastEl, showToast] = useToast();
  const now = useNow(30_000);

  const [tab, setTab] = useState('active');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // ค่าค้นหาหลัง debounce
  const [list, setList] = useState(EMPTY_LIST);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [rules, setRules] = useState(null);
  const [reviews, setReviews] = useState({}); // gameId → รีวิวของฉัน
  const [modal, setModal] = useState(null); // { kind, r?, game?, initial?, afterReturn? }

  const reqRef = useRef(0); // ใช้ทิ้งผลลัพธ์เก่าเมื่อสลับแท็บ/ค้นหาเร็ว ๆ
  const autoTabRef = useRef(true); // ครั้งแรก: ไม่มีโต๊ะที่กำลังเล่น → ไปแท็บที่มีข้อมูล

  // กฎร้าน + รีวิวของฉัน (โหลดครั้งเดียว)
  useEffect(() => {
    let alive = true;
    fetchRules()
      .then((r) => alive && setRules(r))
      .catch(() => {});
    fetchMyReviews()
      .then((data) => alive && setReviews(indexReviews(data)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // debounce ช่องค้นหา
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim().slice(0, 80)), 350);
    return () => clearTimeout(t);
  }, [search]);

  /** mode: 'replace' = แสดง skeleton, 'silent' = โหลดเบื้องหลัง, 'append' = โหลดหน้าถัดไป */
  const load = useCallback(
    async ({ mode = 'replace', page = 1 } = {}) => {
      const reqId = ++reqRef.current;
      if (mode === 'append') setLoadingMore(true);
      if (mode === 'replace') {
        setLoading(true);
        setError('');
      }
      try {
        const res = await fetchMyReservations({
          scope: tab,
          q: query || undefined,
          page,
          limit: PAGE_SIZE[tab],
        });
        if (reqId !== reqRef.current) return;
        const items = asList(res);
        const total = res?.total ?? items.length;
        setList((prev) => {
          if (mode !== 'append' || prev.scope !== tab || prev.query !== query) {
            return { scope: tab, query, items, total, page };
          }
          const seen = new Set(prev.items.map((x) => x._id));
          return {
            ...prev,
            items: [...prev.items, ...items.filter((x) => !seen.has(x._id))],
            total,
            page,
          };
        });
        if (res?.counts) setCounts(res.counts);
        setError('');

        if (autoTabRef.current) {
          autoTabRef.current = false;
          if (tab === 'active' && !query && items.length === 0 && res?.counts) {
            if (res.counts.upcoming > 0) setTab('upcoming');
            else if (res.counts.past > 0) setTab('past');
          }
        }
      } catch (err) {
        if (reqId !== reqRef.current) return;
        if (mode === 'replace') setError(errText(err));
        else if (mode === 'append') showToast(errText(err), false);
      } finally {
        if (reqId === reqRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [tab, query, showToast],
  );

  useEffect(() => {
    load();
  }, [load]);

  // โหลดเบื้องหลังทุก 1 นาที (การจองที่ถึงเวลาจะย้ายเป็น "กำลังเล่น" เอง) — ไม่ทำในแท็บประวัติ
  useEffect(() => {
    if (tab === 'past') return undefined;
    const t = setInterval(() => load({ mode: 'silent' }), 60_000);
    return () => clearInterval(t);
  }, [tab, load]);

  const refresh = useCallback(() => load({ mode: 'silent' }), [load]);
  const closeModal = useCallback(() => setModal(null), []);
  const open = (kind, r) => setModal({ kind, r });

  // ---------- ผลจาก modal ----------

  function onCancelled() {
    setModal(null);
    showToast('ยกเลิกการจองแล้ว');
    refresh();
  }

  function onEdited() {
    showToast('บันทึกการแก้ไขแล้ว');
    refresh();
  }

  function onGameChanged(updated) {
    setModal(null);
    showToast(updated?.game ? `เปลี่ยนเป็น ${updated.game.name} แล้ว` : 'เอาเกมออกจากการจองแล้ว');
    refresh();
  }

  function onExtended(updated) {
    showToast(`ต่อเวลาแล้ว — เล่นได้ถึง ${timeTH(updated.endAt)} น.`);
    refresh();
  }

  function onReturned(r, updated, { damaged }) {
    const game = updated?.game ?? r.game;
    showToast(
      !game
        ? 'เช็คบิลแล้ว — ขอบคุณที่มาเล่น'
        : damaged
          ? 'คืนเกมแล้ว — พนักงานจะตรวจสภาพเกมให้'
          : 'คืนเกมแล้ว — ขอบคุณที่มาเล่น',
    );
    refresh();
    if (game?._id) {
      setModal({
        kind: 'review',
        game,
        initial: reviews[String(game._id)],
        afterReturn: true,
      });
    } else {
      setModal(null);
    }
  }

  function onReviewSaved(game, saved) {
    const key = String(game._id);
    setReviews((prev) => ({ ...prev, [key]: { ...prev[key], ...saved, game } }));
    setModal(null);
    showToast('บันทึกรีวิวแล้ว ขอบคุณที่รีวิว');
  }

  async function onShare(r) {
    const origin = window.location.origin;
    const url = r.game ? `${origin}/booking?game=${r.game._id}` : `${origin}/catalog`;
    const text = `ชวนมาเล่นบอร์ดเกม${r.game ? ` ${r.game.name}` : ''} ที่ Boardgame Everyday โต๊ะ ${
      r.table?.code ?? ''
    } ${dateLabel(r.startAt)} ${timeRange(r)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'ชวนเล่นบอร์ดเกม', text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      showToast('คัดลอกข้อความชวนเพื่อนแล้ว');
    } catch (err) {
      if (err?.name !== 'AbortError') showToast('แชร์ไม่สำเร็จ — ลองคัดลอกลิงก์เอง', false);
    }
  }

  const goBooking = () => navigate('/booking');
  const onRebook = (game) => navigate(`/booking?game=${game._id}`);

  // ---------- render ----------

  const ready = !loading && list.scope === tab && list.query === query;
  const items = ready ? list.items : [];
  const totalAll = counts ? counts.active + counts.upcoming + counts.past : null;
  const hasMore = tab === 'past' && ready && items.length < list.total;

  function renderEmpty() {
    if (query) {
      return (
        <EmptyState
          icon="fa-magnifying-glass"
          title={`ไม่พบการจองที่ตรงกับ “${query}”`}
          text="ลองค้นด้วยรหัสโต๊ะ ชื่อโซน หรือชื่อเกม"
          action={
            <button type="button" className={BTN.secondary} onClick={() => setSearch('')}>
              ล้างคำค้น
            </button>
          }
        />
      );
    }
    if (totalAll === 0) {
      return (
        <EmptyState
          title="ยังไม่มีการจอง"
          text="จองโต๊ะแล้วเลือกเกมที่อยากเล่นได้เลย"
          action={
            <button type="button" className={BTN.primary} onClick={goBooking}>
              <i className="fa-solid fa-plus" aria-hidden="true"></i>
              ไปจองโต๊ะ
            </button>
          }
        />
      );
    }
    if (tab === 'active') {
      return (
        <EmptyState
          icon="fa-chess-board"
          title="ไม่มีโต๊ะที่กำลังเล่นอยู่"
          text="ถึงเวลาที่จองไว้ โต๊ะของคุณจะขึ้นที่นี่"
          action={
            <>
              {counts?.upcoming > 0 && (
                <button type="button" className={BTN.secondary} onClick={() => setTab('upcoming')}>
                  ดูการจองล่วงหน้า ({counts.upcoming})
                </button>
              )}
              <button type="button" className={BTN.primary} onClick={goBooking}>
                ไปจองโต๊ะ
              </button>
            </>
          }
        />
      );
    }
    if (tab === 'upcoming') {
      return (
        <EmptyState
          icon="fa-calendar-plus"
          title="ไม่มีการจองล่วงหน้า"
          action={
            <button type="button" className={BTN.primary} onClick={goBooking}>
              ไปจองโต๊ะ
            </button>
          }
        />
      );
    }
    return <EmptyState icon="fa-clock-rotate-left" title="ยังไม่มีประวัติการเล่น" />;
  }

  function renderList() {
    if (error) {
      return (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-700"
        >
          <p className="font-semibold">โหลดการจองไม่สำเร็จ: {error}</p>
          <button type="button" className={`${BTN.secondary} mt-3`} onClick={() => load()}>
            ลองใหม่
          </button>
        </div>
      );
    }
    if (!ready) return <ListSkeleton rows={tab === 'past' ? 4 : 2} />;
    if (items.length === 0) return renderEmpty();

    if (tab === 'active') {
      return (
        <div className="space-y-5">
          {items.map((r) => (
            <ActiveSessionCard
              key={r._id}
              r={r}
              now={now}
              rules={rules}
              showToast={showToast}
              onReturn={(x) => open('return', x)}
              onExtend={(x) => open('extend', x)}
              onChangeGame={(x) => open('game', x)}
            />
          ))}
        </div>
      );
    }
    if (tab === 'upcoming') {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((r) => (
            <UpcomingCard
              key={r._id}
              r={r}
              now={now}
              rules={rules}
              onEdit={(x) => open('edit', x)}
              onChangeGame={(x) => open('game', x)}
              onCancel={(x) => open('cancel', x)}
              onShare={onShare}
            />
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {items.map((r) => (
          <PastCard
            key={r._id}
            r={r}
            review={r.game ? reviews[String(r.game._id)] : null}
            onReview={(game, initial) => setModal({ kind: 'review', game, initial })}
            onRebook={onRebook}
          />
        ))}
        {hasMore && (
          <div className="pt-2 text-center">
            <button
              type="button"
              className={BTN.secondary}
              disabled={loadingMore}
              onClick={() => load({ mode: 'append', page: list.page + 1 })}
            >
              {loadingMore ? 'กำลังโหลด...' : `โหลดเพิ่ม (เหลือ ${list.total - items.length})`}
            </button>
          </div>
        )}
      </div>
    );
  }

  const activeCount = counts?.active ?? 0;

  return (
    <div className="min-h-screen bg-[#f2f5f4] pb-16 text-emerald-950">
      {toastEl}

      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">การจองของฉัน</h1>
            <p className="text-xs text-slate-500">
              ดูโต๊ะที่กำลังเล่น ต่อเวลา คืนเกม และจัดการการจองล่วงหน้า
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
              <span
                className={`h-2 w-2 rounded-full ${activeCount ? 'animate-pulse bg-emerald-500' : 'bg-slate-300'}`}
              />
              {activeCount ? `กำลังเล่น ${activeCount} โต๊ะ` : 'ไม่มีโต๊ะที่กำลังเล่น'}
            </span>
            <button type="button" className={BTN.primary} onClick={goBooking}>
              <i className="fa-solid fa-plus" aria-hidden="true"></i>
              จองโต๊ะใหม่
            </button>
          </div>
        </div>
      </div>

      {/* แท็บ + ค้นหา (ติดใต้ header ของ UserLayout) */}
      <div className="sticky top-16 z-30 mt-4 border-b border-slate-200 bg-[#f2f5f4]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div
            role="tablist"
            aria-label="ประเภทการจอง"
            className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-white p-1 sm:inline-grid sm:w-auto"
          >
            {TABS.map((t) => {
              const on = tab === t.key;
              const n = counts?.[t.key];
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition sm:px-4 ${
                    on ? 'bg-[#064e3b] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <i className={`fa-solid ${t.icon} hidden sm:inline`} aria-hidden="true"></i>
                  {t.label}
                  {n != null && (
                    <span
                      className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] ${
                        on ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <i
              className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400"
              aria-hidden="true"
            ></i>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาโต๊ะ โซน หรือชื่อเกม"
              aria-label="ค้นหาการจอง"
              maxLength={80}
              className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-9 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="ล้างคำค้น"
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <i className="fa-solid fa-xmark text-xs" aria-hidden="true"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6" role="tabpanel">
        {renderList()}
      </main>

      {modal?.kind === 'cancel' && (
        <CancelModal r={modal.r} rules={rules} onClose={closeModal} onDone={onCancelled} />
      )}
      {modal?.kind === 'edit' && (
        <EditModal r={modal.r} rules={rules} onClose={closeModal} onDone={onEdited} />
      )}
      {modal?.kind === 'game' && (
        <ChangeGameModal r={modal.r} onClose={closeModal} onDone={onGameChanged} />
      )}
      {modal?.kind === 'extend' && (
        <ExtendModal r={modal.r} rules={rules} onClose={closeModal} onDone={onExtended} />
      )}
      {modal?.kind === 'return' && (
        <ReturnModal
          r={modal.r}
          onClose={closeModal}
          onDone={(updated, info) => onReturned(modal.r, updated, info)}
        />
      )}
      {modal?.kind === 'review' && (
        <ReviewModal
          key={String(modal.game._id)}
          game={modal.game}
          initial={modal.initial}
          afterReturn={modal.afterReturn}
          onClose={closeModal}
          onSaved={(saved) => onReviewSaved(modal.game, saved)}
        />
      )}
    </div>
  );
}
