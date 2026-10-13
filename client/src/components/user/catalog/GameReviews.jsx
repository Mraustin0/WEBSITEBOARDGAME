// รีวิวของสมาชิก (คะแนน 1–10): สรุปคะแนน + กราฟกระจาย + รายการ + เขียน/แก้/ลบรีวิวของตัวเอง
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReviewForm from '../ReviewForm.jsx';
import { useSession } from '../../../lib/session.js';
import { thaiError } from '../../../lib/booking.js';
import {
  deleteReview,
  fetchGameReviews,
  fetchMyReviews,
  fetchReviewSummary,
} from '../../../services/api.js';
import { dateTH } from './catalogUtils.js';

const idOf = (v) => String(v?._id ?? v ?? '');

function Distribution({ distribution, count }) {
  const rows = Array.from({ length: 10 }, (_, i) => i + 1).map((n) => ({
    n,
    c: Number(distribution?.[n] ?? 0),
  }));
  const max = Math.max(1, ...rows.map((r) => r.c));
  return (
    <div className="flex-1 min-w-0" aria-label="การกระจายคะแนน">
      <div className="flex items-end gap-1 h-14">
        {rows.map((r) => (
          <div
            key={r.n}
            className="flex-1 bg-slate-100 rounded-t-sm h-full flex items-end"
            title={`${r.n} คะแนน: ${r.c} รีวิว`}
          >
            <div
              className="w-full bg-amber-400 rounded-t-sm"
              style={{ height: count ? `${(r.c / max) * 100}%` : 0 }}
            ></div>
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {rows.map((r) => (
          <span key={r.n} className="flex-1 text-center text-[9px] font-semibold text-slate-400">
            {r.n}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function GameReviews({ gameId, gameName, notify }) {
  const user = useSession();
  const navigate = useNavigate();
  const userKey = user ? String(user._id ?? user.id ?? user.username ?? 'me') : '';

  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState({ loading: true, error: '', summary: null, items: [] });
  const [mine, setMine] = useState(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // สรุป + รายการ (สาธารณะ)
  useEffect(() => {
    let cancelled = false;
    setData((d) => ({ ...d, loading: true, error: '' }));
    Promise.all([fetchReviewSummary(gameId), fetchGameReviews(gameId)])
      .then(([summary, items]) => {
        if (!cancelled) {
          setData({
            loading: false,
            error: '',
            summary,
            items: Array.isArray(items) ? items : [],
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setData((d) => ({ ...d, loading: false, error: thaiError(err) }));
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, reloadKey]);

  // รีวิวของฉันสำหรับเกมนี้ (ต้อง login)
  useEffect(() => {
    if (!userKey) {
      setMine(null);
      return undefined;
    }
    let cancelled = false;
    fetchMyReviews()
      .then((list) => {
        if (cancelled) return;
        const found = (Array.isArray(list) ? list : []).find((r) => idOf(r.game) === gameId);
        setMine(found ?? null);
      })
      .catch(() => {
        if (!cancelled) setMine(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userKey, gameId, reloadKey]);

  function startWrite() {
    if (!user) {
      navigate('/signin', { state: { from: '/catalog' } });
      return;
    }
    setConfirmDelete(false);
    setEditing(true);
  }

  function onSaved() {
    setEditing(false);
    setReloadKey((k) => k + 1);
    notify?.(mine ? 'แก้รีวิวแล้ว' : 'ขอบคุณสำหรับรีวิว!');
  }

  async function onDelete() {
    if (!mine) return;
    setDeleting(true);
    try {
      await deleteReview(mine._id);
      setMine(null);
      setConfirmDelete(false);
      setReloadKey((k) => k + 1);
      notify?.('ลบรีวิวแล้ว');
    } catch (err) {
      notify?.(thaiError(err), false);
    } finally {
      setDeleting(false);
    }
  }

  const { loading, error, summary, items } = data;
  const count = summary?.count ?? items.length;
  const shown = showAll ? items : items.slice(0, 5);

  return (
    <section aria-labelledby="reviews-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="reviews-title" className="font-heading font-bold text-base text-slate-900">
          รีวิวจากสมาชิกร้าน
        </h3>
        {!editing && (
          <button
            type="button"
            onClick={startWrite}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition flex items-center gap-1.5"
          >
            <i className={`fa-solid ${mine ? 'fa-pen' : 'fa-star'}`}></i>
            {!user ? 'เข้าสู่ระบบเพื่อเขียนรีวิว' : mine ? 'แก้รีวิวของฉัน' : 'เขียนรีวิว'}
          </button>
        )}
      </div>

      {editing && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <ReviewForm
            gameId={gameId}
            gameName={gameName}
            initial={mine ? { rating: mine.rating, comment: mine.comment } : undefined}
            onSaved={onSaved}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}

      {mine && !editing && (
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-emerald-900">
            รีวิวของคุณ: <strong>{mine.rating}/10</strong>
          </span>
          {confirmDelete ? (
            <span className="flex items-center gap-2">
              <span className="text-slate-600">ลบรีวิวนี้?</span>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'กำลังลบ...' : 'ยืนยันลบ'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 rounded-lg font-semibold text-slate-600 hover:bg-white"
              >
                ไม่ลบ
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="px-3 py-1.5 rounded-lg font-semibold text-red-600 hover:bg-red-50"
            >
              <i className="fa-solid fa-trash-can mr-1"></i> ลบรีวิว
            </button>
          )}
        </div>
      )}

      {error ? (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex flex-wrap items-center gap-2">
          <span>โหลดรีวิวไม่สำเร็จ: {error}</span>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="underline font-bold"
          >
            ลองใหม่
          </button>
        </div>
      ) : loading && !summary ? (
        <p className="text-xs text-slate-400 flex items-center gap-2">
          <i className="fa-solid fa-spinner fa-spin"></i> กำลังโหลดรีวิว...
        </p>
      ) : (
        <>
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <div className="text-center shrink-0">
              <div className="text-3xl font-bold text-slate-900 leading-none">
                {summary?.average != null ? Number(summary.average).toFixed(1) : '–'}
                <span className="text-sm font-semibold text-slate-400">/10</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{count} รีวิว</div>
            </div>
            <Distribution distribution={summary?.distribution} count={count} />
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-3">
              ยังไม่มีรีวิว — เป็นคนแรกที่รีวิวเกมนี้!
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100">
              {shown.map((r) => (
                <li key={r._id} className="py-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-800 truncate">
                      {r.user?.username ?? 'สมาชิก'}
                      {mine && idOf(mine) === idOf(r) && (
                        <span className="ml-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                          ของฉัน
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      ★ {r.rating}/10
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-slate-600 whitespace-pre-line break-words">
                      {r.comment}
                    </p>
                  )}
                  <span className="text-[11px] text-slate-400">{dateTH(r.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
          {items.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="self-center text-xs font-bold text-emerald-700 hover:underline"
            >
              {showAll ? 'ย่อรีวิว' : `ดูรีวิวทั้งหมด (${items.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
