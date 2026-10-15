import { useCallback, useEffect, useState } from 'react';
import FieldError from '../../components/FieldError.jsx';
import { useFieldErrors } from '../../lib/useFieldErrors.js';
import { gameRules, splitList } from '../../lib/gameRules.js';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Gamepad, Users, ClockCircle, Scale, Box } from 'reicon-react';
import { api } from '../../lib/api.js';
import { timeTH } from '../../lib/date.js';
import './inventory.css';
import { copyLabel } from '../../lib/copies.js';
import { statusOf } from '../../lib/reservationStatus.js';
import { PRIORITY } from '../../components/admin/maintenance/helpers.js';

const TICKET_STATUS = { pending: 'รอซ่อม', in_progress: 'กำลังซ่อม', resolved: 'ซ่อมเสร็จแล้ว' };

const STATUS = {
  available: { label: 'ว่างบนชั้น', tone: 'ok' },
  in_use: { label: 'กำลังเล่น', tone: 'play' },
  maintenance: { label: 'ส่งซ่อม', tone: 'fix' },
};

const baht = (n) => '฿' + Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 });

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('general'); // general | history | stats
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [g, s] = await Promise.all([
        api(`/games/${id}`),
        api(`/stats/games/${id}`).catch(() => null),
      ]);
      setGame(g);
      setStats(s);
      setForm({
        name: g.name || '',
        minPlayers: g.minPlayers ?? 1,
        maxPlayers: g.maxPlayers ?? 4,
        playtimeMin: g.playtimeMin ?? 60,
        yearPublished: g.yearPublished ?? '',
        status: g.status || 'available',
        description: g.description || '',
        categories: (g.categories || []).join(', '),
        mechanics: (g.mechanics || []).join(', '),
        designers: (g.designers || []).join(', '),
        thumbnail: g.thumbnail || '',
        image: g.image || '',
        copies: g.copies ?? 1,
      });
    } catch (err) {
      setError(err.message || 'โหลดเกมไม่สำเร็จ');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const v = useFieldErrors(form, (f) => (f.name === undefined ? {} : gameRules(f)));
  const fe = (k) => <FieldError variant="admin" id={v.errId(k)} msg={v.errors[k]} />;

  async function save(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    if (!v.submit()) return;
    setBusy(true);
    try {
      const body = {
        name: form.name.trim(),
        minPlayers: Number(form.minPlayers) || 1,
        maxPlayers: Number(form.maxPlayers) || 4,
        playtimeMin: Number(form.playtimeMin) || 60,
        status: form.status,
        description: form.description,
        copies: Math.max(1, Number(form.copies) || 1),
        categories: splitList(form.categories),
        mechanics: splitList(form.mechanics),
        designers: splitList(form.designers),
      };
      if (form.yearPublished !== '') body.yearPublished = Number(form.yearPublished);
      body.thumbnail = form.thumbnail.trim();
      body.image = form.image.trim();
      const updated = await api(`/games/${id}`, { method: 'PUT', body });
      setGame(updated);
      setEdit(false);
      setMsg('บันทึกแล้ว');
      load();
    } catch (err) {
      if (err.status === 400 && v.server(err)) return;
      setError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !window.confirm(
        `ลบเกม "${game?.name}" ออกจากคลัง?\n\nถ้ายังมีการจองที่รอยืนยัน จองแล้ว หรือกำลังเล่นอยู่ จะลบไม่ได้`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api(`/games/${id}`, { method: 'DELETE' });
      navigate('/admin/inventory', { replace: true });
    } catch (err) {
      const msg =
        err.status === 409
          ? err.message ||
            'ลบไม่ได้ ยังมีการจองที่ใช้เกมนี้อยู่ — ไปหน้าการจองเพื่อยืนยัน ยกเลิก หรือเช็คบิลให้เรียบร้อยก่อน'
          : err.message || 'ลบไม่สำเร็จ';
      setError(msg);
      setBusy(false);
    }
  }

  if (!game && !error) return <p className="muted inv-page-pad">กำลังโหลด...</p>;
  if (!game) {
    return (
      <div className="inv">
        <div className="form-error">{error}</div>
        <Link to="/admin/inventory" className="btn-ghost">
          ← กลับไปคลังบอร์ดเกม
        </Link>
      </div>
    );
  }

  const st = STATUS[game.status] || STATUS.available;
  const copies = game.copies ?? 1;
  const img = game.image || game.thumbnail;

  return (
    <div className="inv gd">
      <div className="gd-topbar">
        <Link to="/admin/inventory" className="gd-back">
          ← กลับไปคลังบอร์ดเกม
        </Link>
        <div className="inv-head-actions">
          {!edit ? (
            <>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  v.reset();
                  setEdit(true);
                }}
              >
                แก้ไขเกม
              </button>
              <Link className="btn-ghost" to="/admin/maintenance">
                แจ้งซ่อม
              </Link>
              <button type="button" className="btn-danger" onClick={remove} disabled={busy}>
                ลบเกม
              </button>
            </>
          ) : (
            <button type="button" className="btn-ghost" onClick={() => setEdit(false)}>
              ยกเลิก
            </button>
          )}
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
      {msg && <div className="inv-ok">{msg}</div>}

      {/* Hero ตามดีไซน์ */}
      <section className="panel gd-hero-card">
        <div className="gd-hero-grid">
          <div className="gd-cover-wrap">
            {img ? (
              <img src={img} alt="" className="gd-cover" />
            ) : (
              <div className="gd-cover ph">
                <Gamepad size={64} />
              </div>
            )}
            {game.yearPublished && <span className="gd-year-pill">{game.yearPublished}</span>}
          </div>

          <div className="gd-hero-info">
            <div className="gd-status-row">
              <span className={`inv-badge inv-badge-${st.tone}`}>
                ● {st.label}
                {copyLabel(game)}
              </span>
              {game.bggAverage != null && (
                <span className="gd-bgg-pill">★ BGG {Number(game.bggAverage).toFixed(1)}/10</span>
              )}
              {game.bggId && (
                <a
                  className="gd-bgg-link muted"
                  href={`https://boardgamegeek.com/boardgame/${game.bggId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  ดูบน BoardGameGeek ↗
                </a>
              )}
              <a
                className="bgg-powered"
                href="https://boardgamegeek.com"
                target="_blank"
                rel="noopener noreferrer"
                title="Powered by BoardGameGeek"
              >
                <img src="/powered-by-bgg.png" alt="Powered by BGG" height={24} />
              </a>
            </div>

            <h1 className="gd-title">{game.name}</h1>

            {(game.designers || []).length > 0 && (
              <p className="muted gd-designers">ออกแบบโดย {(game.designers || []).join(', ')}</p>
            )}

            <div className="inv-tags gd-tags">
              {(game.categories || []).map((c) => (
                <span key={c} className="inv-tag">
                  {c}
                </span>
              ))}
              {(game.mechanics || []).slice(0, 4).map((m) => (
                <span key={m} className="inv-tag mech">
                  {m}
                </span>
              ))}
            </div>

            <div className="gd-fact-row">
              <div className="gd-fact">
                <span className="gd-fact-ico" aria-hidden="true">
                  <Users size={20} />
                </span>
                <div>
                  <span className="inv-meta-k">จำนวนผู้เล่น</span>
                  <strong>
                    {game.minPlayers}–{game.maxPlayers} คน
                  </strong>
                </div>
              </div>
              <div className="gd-fact">
                <span className="gd-fact-ico" aria-hidden="true">
                  <ClockCircle size={20} />
                </span>
                <div>
                  <span className="inv-meta-k">เวลาเล่นโดยประมาณ</span>
                  <strong>{game.playtimeMin || '—'} นาที</strong>
                </div>
              </div>
              <div className="gd-fact">
                <span className="gd-fact-ico" aria-hidden="true">
                  <Scale size={20} />
                </span>
                <div>
                  <span className="inv-meta-k">ความยาก</span>
                  <strong>
                    {game.bggWeight != null ? `${Number(game.bggWeight).toFixed(2)} / 5` : '—'}
                  </strong>
                </div>
              </div>
              <div className="gd-fact">
                <span className="gd-fact-ico" aria-hidden="true">
                  <Box size={20} />
                </span>
                <div>
                  <span className="inv-meta-k">จำนวนกล่อง</span>
                  <strong>{copies} กล่อง</strong>
                  {(game.copiesInRepair > 0 || game.copiesInPlay > 0) && (
                    <span className="muted">
                      {' '}
                      (ว่างบนชั้น {game.copiesInVault ?? copies} · กำลังเล่น{' '}
                      {game.copiesInPlay ?? 0} · ส่งซ่อม {game.copiesInRepair ?? 0})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="gd-tabs">
        {[
          { id: 'general', label: 'ข้อมูลทั่วไป' },
          { id: 'history', label: 'ประวัติการเล่น' },
          { id: 'stats', label: 'สถิติการเล่น' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={'gd-tab' + (tab === t.id ? ' active' : '')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="gd-layout">
        <div className="gd-main-col">
          {tab === 'general' && (
            <section className="panel gd-block">
              {edit ? (
                <form className="gd-edit" onSubmit={save} noValidate>
                  <h2>แก้ไขข้อมูลเกม</h2>
                  <label className="field">
                    <span>ชื่อเกม</span>
                    <input
                      className="input"
                      value={form.name}
                      onChange={(e) => setField('name', e.target.value)}
                      required
                      maxLength={200}
                      {...v.bind('name')}
                    />
                    {fe('name')}
                  </label>
                  <div className="inv-form-row">
                    <label className="field">
                      <span>ผู้เล่นขั้นต่ำ</span>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        max={99}
                        inputMode="numeric"
                        value={form.minPlayers}
                        onChange={(e) => setField('minPlayers', e.target.value)}
                        {...v.bind('minPlayers')}
                      />
                      {fe('minPlayers')}
                    </label>
                    <label className="field">
                      <span>ผู้เล่นสูงสุด</span>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        max={99}
                        inputMode="numeric"
                        value={form.maxPlayers}
                        onChange={(e) => setField('maxPlayers', e.target.value)}
                        {...v.bind('maxPlayers')}
                      />
                      {fe('maxPlayers')}
                    </label>
                    <label className="field">
                      <span>เวลาเล่น (นาที)</span>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        max={1440}
                        inputMode="numeric"
                        value={form.playtimeMin}
                        onChange={(e) => setField('playtimeMin', e.target.value)}
                        {...v.bind('playtimeMin')}
                      />
                      {fe('playtimeMin')}
                    </label>
                    <label className="field">
                      <span>จำนวนกล่อง</span>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        max={999}
                        inputMode="numeric"
                        value={form.copies}
                        onChange={(e) => setField('copies', e.target.value)}
                        {...v.bind('copies')}
                      />
                      {fe('copies')}
                    </label>
                  </div>
                  <div className="inv-form-row">
                    <label className="field">
                      <span>ปีที่ออก</span>
                      <input
                        className="input"
                        type="number"
                        min={1800}
                        inputMode="numeric"
                        value={form.yearPublished}
                        onChange={(e) => setField('yearPublished', e.target.value)}
                        {...v.bind('yearPublished')}
                      />
                      {fe('yearPublished')}
                    </label>
                    <label className="field">
                      <span>สถานะ</span>
                      <select
                        className="input"
                        value={form.status}
                        onChange={(e) => setField('status', e.target.value)}
                      >
                        <option value="available">ว่างบนชั้น</option>
                        <option value="in_use">กำลังเล่น</option>
                        <option value="maintenance">ส่งซ่อม</option>
                      </select>
                    </label>
                  </div>
                  <label className="field">
                    <span>หมวดหมู่ (คั่นด้วย ,)</span>
                    <input
                      className="input"
                      value={form.categories}
                      onChange={(e) => setField('categories', e.target.value)}
                      {...v.bind('categories')}
                    />
                    {fe('categories')}
                  </label>
                  <label className="field">
                    <span>กลไกเกม (คั่นด้วย ,)</span>
                    <input
                      className="input"
                      value={form.mechanics}
                      onChange={(e) => setField('mechanics', e.target.value)}
                      {...v.bind('mechanics')}
                    />
                    {fe('mechanics')}
                  </label>
                  <label className="field">
                    <span>ผู้ออกแบบ (คั่นด้วย ,)</span>
                    <input
                      className="input"
                      value={form.designers}
                      onChange={(e) => setField('designers', e.target.value)}
                      {...v.bind('designers')}
                    />
                    {fe('designers')}
                  </label>
                  <label className="field">
                    <span>ลิงก์รูปย่อ</span>
                    <input
                      className="input"
                      type="url"
                      inputMode="url"
                      placeholder="https://..."
                      maxLength={2000}
                      value={form.thumbnail}
                      onChange={(e) => setField('thumbnail', e.target.value)}
                      {...v.bind('thumbnail')}
                    />
                    {fe('thumbnail')}
                  </label>
                  <label className="field">
                    <span>ลิงก์รูปเต็ม</span>
                    <input
                      className="input"
                      type="url"
                      inputMode="url"
                      placeholder="https://..."
                      maxLength={2000}
                      value={form.image}
                      onChange={(e) => setField('image', e.target.value)}
                      {...v.bind('image')}
                    />
                    {fe('image')}
                  </label>
                  {(form.thumbnail || form.image) && (
                    <div className="inv-preview">
                      <img src={form.thumbnail || form.image} alt="" />
                    </div>
                  )}
                  <label className="field">
                    <span>คำอธิบาย</span>
                    <textarea
                      className="input inv-textarea"
                      value={form.description}
                      onChange={(e) => setField('description', e.target.value)}
                      maxLength={10000}
                      {...v.bind('description')}
                    />
                    {fe('description')}
                  </label>
                  <div className="modal-actions">
                    <button type="submit" className="btn-primary" disabled={busy}>
                      {busy ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <h2>เกี่ยวกับเกม</h2>
                  <p className="gd-desc-text">
                    {game.description || 'ยังไม่มีคำอธิบาย กด “แก้ไขเกม” เพื่อเพิ่ม'}
                  </p>

                  <h2 className="gd-sub">ข้อมูลในระบบ</h2>
                  <div className="gd-meta-grid">
                    <div className="gd-meta-item">
                      <span className="inv-meta-k">สถานะ</span>
                      <strong>{st.label}</strong>
                    </div>
                    <div className="gd-meta-item">
                      <span className="inv-meta-k">จำนวนกล่อง</span>
                      <strong>{copies}</strong>
                    </div>
                    <div className="gd-meta-item">
                      <span className="inv-meta-k">รหัส BGG</span>
                      <strong>{game.bggId || '—'}</strong>
                    </div>
                    <div className="gd-meta-item">
                      <span className="inv-meta-k">ปีที่ออก</span>
                      <strong>{game.yearPublished || '—'}</strong>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {tab === 'history' && (
            <section className="panel gd-block">
              <h2>ประวัติการเล่นล่าสุด</h2>
              <ul className="gd-recent">
                {(stats?.recentSessions || []).length === 0 && (
                  <li className="muted">ยังไม่มีรอบเล่น</li>
                )}
                {(stats?.recentSessions || []).map((r) => (
                  <li key={r._id}>
                    <div className="gd-recent-main">
                      <strong>
                        โต๊ะ {r.table?.code || '—'} · {r.players} คน · {statusOf(r.status).label}
                      </strong>
                      <span className="muted">
                        {r.user?.username || r.customer?.name || 'ลูกค้าหน้าร้าน'}
                      </span>
                    </div>
                    <small className="muted">
                      {r.startAt
                        ? new Date(r.startAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
                        : ''}
                      {r.startAt ? ` · ${timeTH(r.startAt)}` : ''}
                    </small>
                  </li>
                ))}
              </ul>

              {(stats?.maintenance || []).length > 0 && (
                <>
                  <h2 className="gd-sub">ประวัติซ่อมบำรุง</h2>
                  <ul className="gd-recent">
                    {stats.maintenance.map((t) => (
                      <li key={t._id}>
                        <strong>{t.title}</strong>
                        <small className="muted">
                          {TICKET_STATUS[t.status] ?? t.status} ·{' '}
                          {PRIORITY[t.priority]?.label ?? t.priority}
                          {t.copies ? ` · ${t.copies} กล่อง` : ''}
                        </small>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          {tab === 'stats' && (
            <section className="panel gd-block">
              <h2>สถิติการเล่น</h2>
              {!stats ? (
                <p className="muted">ไม่มีข้อมูลสถิติ</p>
              ) : (
                <div className="gd-stat-cards">
                  <div className="gd-stat-card">
                    <span className="inv-meta-k">รอบเล่นทั้งหมด</span>
                    <strong>{stats.sessions ?? 0}</strong>
                  </div>
                  <div className="gd-stat-card">
                    <span className="inv-meta-k">ผู้เล่นรวม</span>
                    <strong>{stats.players ?? 0}</strong>
                  </div>
                  <div className="gd-stat-card">
                    <span className="inv-meta-k">ชั่วโมงเล่น</span>
                    <strong>{stats.hours ?? 0}</strong>
                  </div>
                  <div className="gd-stat-card">
                    <span className="inv-meta-k">รายได้จากเกมนี้</span>
                    <strong>{baht(stats.revenue)}</strong>
                  </div>
                  <div className="gd-stat-card">
                    <span className="inv-meta-k">คะแนนรีวิวในร้าน</span>
                    <strong>
                      {stats.rating?.average != null
                        ? `★ ${stats.rating.average} (${stats.rating.count})`
                        : '—'}
                    </strong>
                  </div>
                  <div className="gd-stat-card">
                    <span className="inv-meta-k">แจ้งชำรุด</span>
                    <strong>{stats.damageReports ?? 0}</strong>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sidebar ขวา ตามดีไซน์ */}
        <aside className="gd-side">
          <section className="panel gd-side-card">
            <div className="gd-side-head">
              <h3>คะแนนและความยาก (BGG)</h3>
              {game.bggId && <span className="inv-tag mech">BGG</span>}
            </div>
            <div className="gd-score">
              <span className="gd-score-big">
                {game.bggAverage != null ? Number(game.bggAverage).toFixed(1) : '—'}
              </span>
              <span className="muted">/ 10</span>
            </div>
            {game.bggWeight != null && (
              <div className="gd-weight-bar">
                <div className="gd-weight-labels">
                  <span>ง่าย</span>
                  <span>ยาก</span>
                </div>
                <div className="rp-bar">
                  <i style={{ width: `${(Number(game.bggWeight) / 5) * 100}%` }} />
                </div>
                <p className="muted" style={{ margin: '6px 0 0', fontSize: 'var(--fs-detail)' }}>
                  ความยาก {Number(game.bggWeight).toFixed(2)} / 5
                </p>
              </div>
            )}
          </section>

          <section className="panel gd-side-card">
            <h3>สรุปในร้าน</h3>
            <ul className="gd-stat-list">
              <li>
                <span>รอบเล่น</span>
                <strong>{stats?.sessions ?? 0}</strong>
              </li>
              <li>
                <span>รายได้</span>
                <strong>{baht(stats?.revenue)}</strong>
              </li>
              <li>
                <span>เล่นล่าสุด</span>
                <strong style={{ fontSize: 'var(--fs-detail)' }}>
                  {stats?.lastPlayedAt
                    ? new Date(stats.lastPlayedAt).toLocaleDateString('th-TH', {
                        timeZone: 'Asia/Bangkok',
                      })
                    : '—'}
                </strong>
              </li>
            </ul>
            <Link className="btn-ghost inv-btn" to="/admin/maintenance" style={{ marginTop: 8 }}>
              ไปหน้าซ่อมบำรุง →
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
