import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { endAtOf, gameName, statusOf, tableCode } from '../../lib/reservationStatus.js';
import { timeTH } from '../../lib/date.js';
import './memberDetail.css';
const PAGE_SIZE = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const ROLE_TH = { admin: 'ผู้ดูแลระบบ', user: 'สมาชิก' };
const PAY_TH = { cash: 'เงินสด', transfer: 'โอนเงิน', card: 'บัตร', qr: 'QR' };

const baht = (n) => '฿' + Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 });

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function relativeDay(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
  if (days <= 0) return 'วันนี้';
  if (days === 1) return 'เมื่อวาน';
  if (days < 30) return `${days} วันที่แล้ว`;
  if (days < 365) return `${Math.floor(days / 30)} เดือนที่แล้ว`;
  return `${Math.floor(days / 365)} ปีที่แล้ว`;
}

// อายุสมาชิก เช่น "1 ปี 8 เดือน"
function memberAge(iso) {
  const months = Math.floor((Date.now() - new Date(iso).getTime()) / (30.44 * DAY_MS));
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0 && m === 0) return 'ไม่ถึง 1 เดือน';
  return [y ? `${y} ปี` : '', m ? `${m} เดือน` : ''].filter(Boolean).join(' ');
}

function duration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return [h ? `${h} ชม.` : '', m ? `${m} น.` : ''].filter(Boolean).join(' ') || '0 น.';
}

// ดึงการจองของสมาชิกทั้งหมด (backend เรียงเก่า→ใหม่ และไม่มีตัวเลือก sort) แล้วกลับด้านที่ฝั่งเรา
async function fetchHistory(userId) {
  const items = [];
  let total = 0;
  for (let page = 1; page <= 5; page += 1) {
    const res = await api('/reservations/admin', { query: { user: userId, page, limit: 200 } });
    const got = res.items ?? [];
    items.push(...got);
    total = res.total ?? 0;
    if (items.length >= total || got.length === 0) break;
  }
  return items.sort((a, b) => new Date(b.startAt) - new Date(a.startAt));
}

function amountOf(r) {
  const unpaid = r.payment?.status !== 'paid';
  if ((r.status === 'cancelled' || r.status === 'no_show') && unpaid) return null;
  return r.checkout?.total ?? r.price?.total ?? 0;
}

function paymentLine(r) {
  if (r.payment?.status === 'paid') {
    const m = PAY_TH[r.payment.method];
    return m ? `ชำระแล้ว (${m})` : 'ชำระแล้ว';
  }
  if (r.status === 'completed' || r.status === 'playing') return 'ยังไม่ชำระ';
  return '';
}

/** หน้ารายละเอียดสมาชิก (ดีไซน์หน้า 13) — GET /stats/members/:id + GET /reservations/admin?user= */
export default function MemberDetail() {
  const { id } = useParams();
  const [info, setInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    Promise.all([api(`/stats/members/${id}`), fetchHistory(id)])
      .then(([m, h]) => {
        if (!alive) return;
        setInfo(m);
        setHistory(h);
      })
      .catch((err) => alive && setError(err.status === 404 ? 'ไม่พบสมาชิกนี้' : err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  const rows = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return history;
    return history.filter((r) => `${tableCode(r)} ${gameName(r)}`.toLowerCase().includes(kw));
  }, [history, q]);

  if (loading) return <div className="md-state">กำลังโหลด...</div>;
  if (error || !info) {
    return (
      <div className="md-state">
        <p>{error || 'โหลดข้อมูลสมาชิกไม่สำเร็จ'}</p>
        <Link to="/admin/users" className="btn-ghost md-back-btn">
          ← กลับไปจัดการผู้ใช้
        </Link>
      </div>
    );
  }

  const { user } = info;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const months = Math.max(1, (Date.now() - new Date(user.createdAt).getTime()) / (30.44 * DAY_MS));
  const perMonth = (info.visits / months).toFixed(1);
  const perSession = info.visits ? (info.hoursPlayed / info.visits).toFixed(1) : '0';
  const fav = info.favoriteTable;
  const next = info.nextReservation;
  const r = info.reservations;

  const stats = [
    {
      label: 'ยอดใช้จ่ายสะสม',
      value: baht(info.totalSpent),
      sub: 'รวมทุกการใช้บริการที่ไม่ยกเลิก',
    },
    {
      label: 'จำนวนครั้งที่มาเยือน',
      value: `${info.visits} ครั้ง`,
      sub: `เฉลี่ย ${perMonth} ครั้ง / เดือน`,
    },
    {
      label: 'เวลารวมในร้าน',
      value: `${info.hoursPlayed} ชั่วโมง`,
      sub: `เฉลี่ย ${perSession} ชม. / เซสชัน`,
    },
  ];

  const details = [
    {
      label: 'วันที่สมัคร',
      value: formatDate(user.createdAt),
      sub: `เป็นสมาชิกมา ${memberAge(user.createdAt)}`,
    },
    { label: 'สิทธิ์การใช้งาน', value: ROLE_TH[user.role] ?? user.role },
    {
      label: 'โต๊ะที่นั่งบ่อย',
      value: fav ? `${fav.code}${fav.zone ? ` (${fav.zone})` : ''}` : '—',
      sub: fav ? `นั่งแล้ว ${fav.times} ครั้ง` : 'ยังไม่มีข้อมูล',
    },
    {
      label: 'แนวเกมที่ชอบ',
      value: info.favoriteCategories.map((c) => c.name).join(', ') || '—',
      sub: info.favoriteGames.map((g) => g.game.name).join(', ') || 'ยังไม่มีข้อมูล',
    },
    {
      label: 'ประวัติการจอง',
      value: `${r.total} ครั้ง`,
      sub: `เสร็จสิ้น ${r.completed} · ยกเลิก ${r.cancelled} · ไม่มา ${r.no_show}${
        info.noShowLimit ? `/${info.noShowLimit}` : ''
      } ครั้ง`,
    },
  ];

  return (
    <div className="md">
      <div className="md-top">
        <div>
          <Link to="/admin/users" className="md-back">
            ← กลับไปจัดการผู้ใช้
          </Link>
          <h1>รายละเอียดบัญชีสมาชิก</h1>
        </div>
      </div>

      <section className="md-card md-profile">
        <div className="md-profile-main">
          <span className={'md-avatar ' + user.role} aria-hidden="true">
            {user.username.charAt(0).toUpperCase()}
          </span>
          <div className="md-profile-text">
            <h2>
              {user.username}{' '}
              <span className={'md-role ' + user.role}>{ROLE_TH[user.role] ?? user.role}</span>
            </h2>
            <p className="md-muted">
              ID: #{String(user._id).slice(-6).toUpperCase()} · สมาชิกตั้งแต่{' '}
              {formatDate(user.createdAt)} ({memberAge(user.createdAt)})
            </p>
            <p className="md-muted">{user.email}</p>
          </div>
          <div className="md-lastvisit">
            <span className="md-muted">เข้าใช้บริการล่าสุด</span>
            {info.lastVisitAt ? (
              <strong>
                {formatDate(info.lastVisitAt)} ({relativeDay(info.lastVisitAt)})
              </strong>
            ) : (
              <strong>ยังไม่เคยมาใช้บริการ</strong>
            )}
            {next && (
              <span className="md-muted">
                จองถัดไป: {formatDate(next.startAt)} {timeTH(next.startAt)} น. · โต๊ะ{' '}
                {tableCode(next)}
              </span>
            )}
          </div>
        </div>

        <div className="md-stats">
          {stats.map((s) => (
            <div key={s.label} className="md-stat">
              <span className="md-muted">{s.label}</span>
              <strong>{s.value}</strong>
              <span className="md-muted">{s.sub}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="md-grid">
        <section className="md-card">
          <div className="md-card-head">
            <div>
              <h2>ประวัติการเข้าใช้งานและเปิดโต๊ะ</h2>
              <p className="md-muted">Session &amp; Table Gaming History</p>
            </div>
            <input
              className="input md-search"
              type="search"
              placeholder="ค้นหาโต๊ะ หรือเกม..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="md-table-wrap">
            <table className="md-table">
              <thead>
                <tr>
                  <th>วันที่ &amp; ช่วงเวลา</th>
                  <th>โต๊ะ</th>
                  <th>ผู้เล่น</th>
                  <th>เกมที่เปิดเล่น</th>
                  <th>ยอดชำระ</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={6} className="md-empty">
                      {history.length === 0
                        ? 'สมาชิกคนนี้ยังไม่มีประวัติการจอง'
                        : 'ไม่พบรายการที่ค้นหา'}
                    </td>
                  </tr>
                )}
                {shown.map((x) => {
                  const st = statusOf(x.status);
                  const amount = amountOf(x);
                  const mins = x.checkout?.actualMinutes ?? (Number(x.durationHours) || 0) * 60;
                  const pay = paymentLine(x);
                  return (
                    <tr key={x._id}>
                      <td>
                        <strong>{formatDate(x.startAt)}</strong>
                        <small className="md-muted">
                          {timeTH(x.startAt)} - {timeTH(endAtOf(x))} ({duration(mins)})
                        </small>
                      </td>
                      <td>
                        <span className="md-table-tag">{tableCode(x)}</span>
                        {x.table?.zone && <small className="md-muted">{x.table.zone}</small>}
                      </td>
                      <td>{x.players} คน</td>
                      <td>{gameName(x) || <span className="md-muted">—</span>}</td>
                      <td>
                        <strong>{amount === null ? '—' : baht(amount)}</strong>
                        {pay && <small className="md-muted">{pay}</small>}
                      </td>
                      <td>
                        <span className={'md-chip ' + st.tone}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md-pager">
            <span className="md-muted">
              แสดง {rows.length === 0 ? 0 : (cur - 1) * PAGE_SIZE + 1} -{' '}
              {Math.min(cur * PAGE_SIZE, rows.length)} จากทั้งหมด {rows.length} ครั้ง
            </span>
            <div className="md-pager-btns">
              <button
                type="button"
                className="md-pg"
                disabled={cur <= 1}
                onClick={() => setPage(cur - 1)}
              >
                ‹
              </button>
              <span className="md-pg-now">
                {cur} / {pages}
              </span>
              <button
                type="button"
                className="md-pg"
                disabled={cur >= pages}
                onClick={() => setPage(cur + 1)}
              >
                ›
              </button>
            </div>
          </div>
        </section>

        <aside className="md-card">
          <div className="md-card-head">
            <h2>ข้อมูลบัญชี &amp; สมาชิก</h2>
          </div>
          <dl className="md-details">
            {details.map((d) => (
              <div key={d.label} className="md-detail">
                <dt>{d.label}</dt>
                <dd>
                  <strong>{d.value}</strong>
                  {d.sub && <small className="md-muted">{d.sub}</small>}
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </div>
  );
}
