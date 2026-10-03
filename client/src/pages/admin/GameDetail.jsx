import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { timeTH } from '../../lib/date.js';
import './inventory.css';

const STATUS_LABEL = {
  available: { text: 'พร้อมใช้งาน', tone: 'ok' },
  in_use: { text: 'กำลังเล่น', tone: 'play' },
  maintenance: { text: 'ส่งซ่อม', tone: 'fix' },
};

const baht = (n) => '฿' + Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 });

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [stats, setStats] = useState(null);
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
        thumbnail: g.thumbnail || '',
        image: g.image || '',
      });
    } catch (err) {
      setError(err.message || 'โหลดเกมไม่สำเร็จ');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const body = {
        name: form.name.trim(),
        minPlayers: Number(form.minPlayers) || 1,
        maxPlayers: Number(form.maxPlayers) || 4,
        playtimeMin: Number(form.playtimeMin) || 60,
        status: form.status,
        description: form.description,
      };
      if (form.yearPublished !== '') body.yearPublished = Number(form.yearPublished);
      if (form.thumbnail !== undefined) body.thumbnail = form.thumbnail || '';
      if (form.image !== undefined) body.image = form.image || '';
      body.categories = form.categories
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      body.mechanics = form.mechanics
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const updated = await api(`/games/${id}`, { method: 'PUT', body });
      setGame(updated);
      setEdit(false);
      setMsg('บันทึกแล้ว');
      load();
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`ลบเกม "${game?.name}" ออกจากคลัง?`)) return;
    setBusy(true);
    try {
      await api(`/games/${id}`, { method: 'DELETE' });
      navigate('/admin/inventory', { replace: true });
    } catch (err) {
      setError(err.message || 'ลบไม่สำเร็จ');
      setBusy(false);
    }
  }

  if (!game && !error) {
    return <p className="muted">กำลังโหลด...</p>;
  }

  if (!game) {
    return (
      <div className="inv">
        <div className="form-error">{error}</div>
        <Link to="/admin/inventory" className="btn-ghost">
          ← กลับคลังเกม
        </Link>
      </div>
    );
  }

  const st = STATUS_LABEL[game.status] || STATUS_LABEL.available;

  return (
    <div className="inv gd">
      <div className="page-head">
        <div>
          <p className="muted">
            <Link to="/admin/inventory">คลังบอร์ดเกม</Link> / รายละเอียด
          </p>
          <h1>{game.name}</h1>
          <div className="gd-head-meta">
            <span className={`inv-badge inv-badge-${st.tone}`}>{st.text}</span>
            {game.bggId && (
              <a
                href={`https://boardgamegeek.com/boardgame/${game.bggId}`}
                target="_blank"
                rel="noreferrer"
                className="muted"
              >
                BGG #{game.bggId}
              </a>
            )}
            {game.bggAverage != null && <span>★ {Number(game.bggAverage).toFixed(1)}</span>}
          </div>
        </div>
        <div className="inv-head-actions">
          {!edit ? (
            <>
              <button type="button" className="btn-ghost" onClick={() => setEdit(true)}>
                แก้ไข
              </button>
              <button type="button" className="btn-danger" onClick={remove} disabled={busy}>
                ลบเกม
              </button>
            </>
          ) : (
            <button type="button" className="btn-ghost" onClick={() => setEdit(false)}>
              ยกเลิกแก้ไข
            </button>
          )}
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
      {msg && <div className="inv-ok">{msg}</div>}

      <div className="gd-layout">
        {/* ซ้าย: รูป + ข้อมูล */}
        <section className="panel gd-main">
          <div className="gd-hero">
            {game.thumbnail || game.image ? (
              <img src={game.image || game.thumbnail} alt="" className="gd-cover" />
            ) : (
              <div className="gd-cover ph">🎲</div>
            )}
            <div className="gd-facts">
              <div>
                <span className="muted">ผู้เล่น</span>
                <strong>
                  {game.minPlayers}–{game.maxPlayers} คน
                </strong>
              </div>
              <div>
                <span className="muted">เวลา</span>
                <strong>{game.playtimeMin || '—'} นาที</strong>
              </div>
              <div>
                <span className="muted">ปี</span>
                <strong>{game.yearPublished || '—'}</strong>
              </div>
              <div>
                <span className="muted">น้ำหนัก BGG</span>
                <strong>
                  {game.bggWeight != null ? `${Number(game.bggWeight).toFixed(1)} / 5` : '—'}
                </strong>
              </div>
            </div>
          </div>

          {(game.categories || []).length > 0 && (
            <div className="inv-tags gd-tags">
              {game.categories.map((c) => (
                <span key={c} className="inv-tag">
                  {c}
                </span>
              ))}
            </div>
          )}
          {(game.mechanics || []).length > 0 && (
            <div className="inv-tags gd-tags">
              {game.mechanics.map((m) => (
                <span key={m} className="inv-tag mech">
                  {m}
                </span>
              ))}
            </div>
          )}

          {edit ? (
            <form className="gd-edit" onSubmit={save}>
              <label className="field">
                <span>ชื่อเกม</span>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  required
                />
              </label>
              <div className="inv-form-row">
                <label className="field">
                  <span>ผู้เล่น min</span>
                  <input
                    className="input"
                    type="number"
                    value={form.minPlayers}
                    onChange={(e) => setField('minPlayers', e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>ผู้เล่น max</span>
                  <input
                    className="input"
                    type="number"
                    value={form.maxPlayers}
                    onChange={(e) => setField('maxPlayers', e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>นาที</span>
                  <input
                    className="input"
                    type="number"
                    value={form.playtimeMin}
                    onChange={(e) => setField('playtimeMin', e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>ปี</span>
                  <input
                    className="input"
                    type="number"
                    value={form.yearPublished}
                    onChange={(e) => setField('yearPublished', e.target.value)}
                  />
                </label>
              </div>
              <label className="field">
                <span>สถานะ</span>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value)}
                >
                  <option value="available">พร้อมใช้งาน</option>
                  <option value="in_use">กำลังเล่น</option>
                  <option value="maintenance">ส่งซ่อม</option>
                </select>
              </label>
              <label className="field">
                <span>หมวดหมู่ (คั่นด้วย ,)</span>
                <input
                  className="input"
                  value={form.categories}
                  onChange={(e) => setField('categories', e.target.value)}
                />
              </label>
              <label className="field">
                <span>กลไก (คั่นด้วย ,)</span>
                <input
                  className="input"
                  value={form.mechanics}
                  onChange={(e) => setField('mechanics', e.target.value)}
                />
              </label>
              <label className="field">
                <span>URL รูปย่อ (thumbnail)</span>
                <input
                  className="input"
                  type="url"
                  placeholder="https://..."
                  value={form.thumbnail}
                  onChange={(e) => setField('thumbnail', e.target.value)}
                />
              </label>
              <label className="field">
                <span>URL รูปใหญ่ (image)</span>
                <input
                  className="input"
                  type="url"
                  placeholder="https://..."
                  value={form.image}
                  onChange={(e) => setField('image', e.target.value)}
                />
              </label>
              {(form.thumbnail || form.image) && (
                <div className="inv-preview">
                  <img src={form.thumbnail || form.image} alt="" />
                  <span className="muted">ตัวอย่างรูป</span>
                </div>
              )}
              <label className="field">
                <span>คำอธิบาย</span>
                <textarea
                  className="input inv-textarea"
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          ) : (
            <div className="gd-desc">
              <h2>รายละเอียด</h2>
              <p>{game.description || 'ไม่มีคำอธิบาย'}</p>
            </div>
          )}
        </section>

        {/* ขวา: สถิติ */}
        <aside className="gd-side">
          <section className="panel gd-stats">
            <h2>สถิติการเล่น</h2>
            {!stats ? (
              <p className="muted">ไม่มีข้อมูลสถิติ</p>
            ) : (
              <ul className="gd-stat-list">
                <li>
                  <span>รอบเล่น</span>
                  <strong>{stats.sessions ?? 0}</strong>
                </li>
                <li>
                  <span>ผู้เล่นรวม</span>
                  <strong>{stats.players ?? 0}</strong>
                </li>
                <li>
                  <span>ชั่วโมง</span>
                  <strong>{stats.hours ?? 0}</strong>
                </li>
                <li>
                  <span>รายได้</span>
                  <strong>{baht(stats.revenue)}</strong>
                </li>
                <li>
                  <span>เรตติ้งรีวิว</span>
                  <strong>
                    {stats.rating?.average != null
                      ? `★ ${stats.rating.average} (${stats.rating.count})`
                      : '—'}
                  </strong>
                </li>
                <li>
                  <span>รายงานชำรุด</span>
                  <strong>{stats.damageReports ?? 0}</strong>
                </li>
                <li>
                  <span>เล่นล่าสุด</span>
                  <strong>
                    {stats.lastPlayedAt
                      ? new Date(stats.lastPlayedAt).toLocaleString('th-TH', {
                          timeZone: 'Asia/Bangkok',
                        })
                      : '—'}
                  </strong>
                </li>
              </ul>
            )}
            <Link className="btn-ghost inv-btn" to="/admin/maintenance">
              ไปหน้าซ่อมบำรุง →
            </Link>
          </section>

          <section className="panel gd-stats">
            <h2>รอบเล่นล่าสุด</h2>
            <ul className="gd-recent">
              {(stats?.recentSessions || []).length === 0 && <li className="muted">ยังไม่มี</li>}
              {(stats?.recentSessions || []).map((r) => (
                <li key={r._id}>
                  <strong>
                    {r.table?.code || '—'} · {r.players} คน
                  </strong>
                  <small>
                    {r.startAt ? timeTH(r.startAt) : ''} · {r.status}
                    {r.user?.username ? ` · ${r.user.username}` : ''}
                    {r.customer?.name ? ` · ${r.customer.name}` : ''}
                  </small>
                </li>
              ))}
            </ul>
          </section>

          {(stats?.maintenance || []).length > 0 && (
            <section className="panel gd-stats">
              <h2>ประวัติซ่อม</h2>
              <ul className="gd-recent">
                {stats.maintenance.map((t) => (
                  <li key={t._id}>
                    <strong>
                      {t.title} · {t.status}
                    </strong>
                    <small>
                      {t.priority} · {t.copies ? `${t.copies} กล่อง` : ''}
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
