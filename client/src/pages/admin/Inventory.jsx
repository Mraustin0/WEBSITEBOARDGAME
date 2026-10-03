import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import './inventory.css';

const STATUS = {
  available: { label: 'พร้อมใช้งาน', tone: 'ok' },
  in_use: { label: 'กำลังเล่น', tone: 'play' },
  maintenance: { label: 'ส่งซ่อม', tone: 'fix' },
};

const emptyForm = () => ({
  name: '',
  minPlayers: 1,
  maxPlayers: 4,
  playtimeMin: 60,
  yearPublished: '',
  thumbnail: '',
  image: '',
  description: '',
  bggId: '',
  bggAverage: '',
  bggWeight: '',
  categories: '',
  mechanics: '',
  status: 'available',
  copies: 1,
});

function AddGameModal({ onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [bggQ, setBggQ] = useState('');
  const [bggHits, setBggHits] = useState([]);
  const [bggLoading, setBggLoading] = useState(false);
  const [bggNote, setBggNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const q = bggQ.trim();
    if (q.length < 2) {
      setBggHits([]);
      setBggNote('');
      return;
    }
    setBggLoading(true);
    setBggNote('');
    const id = setTimeout(() => {
      api('/bgg/search', { query: { q } })
        .then((d) => {
          const list = Array.isArray(d) ? d : (d?.items ?? []);
          setBggHits(list);
          setBggNote(list.length ? '' : 'ไม่พบเกมใน BGG');
        })
        .catch((err) => {
          setBggHits([]);
          setBggNote(err.message || 'ค้น BGG ไม่สำเร็จ (อาจยังไม่มี API token)');
        })
        .finally(() => setBggLoading(false));
    }, 350);
    return () => clearTimeout(id);
  }, [bggQ]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function pickBgg(hit) {
    setBusy(true);
    setError('');
    try {
      const d = await api(`/bgg/game/${hit.bggId}`);
      setForm((f) => ({
        ...f,
        name: d.name || hit.name || '',
        minPlayers: d.minPlayers || 1,
        maxPlayers: d.maxPlayers || 4,
        playtimeMin: d.playtimeMin || 60,
        yearPublished: d.yearPublished || '',
        thumbnail: d.thumbnail || '',
        image: d.image || d.thumbnail || '',
        description: (d.description || '').slice(0, 10000),
        bggId: d.bggId || hit.bggId,
        bggAverage: d.bggAverage ?? '',
        bggWeight: d.bggWeight ?? '',
        categories: (d.categories || []).join(', '),
        mechanics: (d.mechanics || []).join(', '),
        status: 'available',
      }));
      setBggQ('');
      setBggHits([]);
      setBggNote('');
    } catch (err) {
      setError(err.message || 'ดึงข้อมูล BGG ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError('กรอกชื่อเกม');
    setBusy(true);
    setError('');
    try {
      const body = {
        name: form.name.trim(),
        minPlayers: Number(form.minPlayers) || 1,
        maxPlayers: Number(form.maxPlayers) || 4,
        playtimeMin: Number(form.playtimeMin) || 60,
        status: form.status,
        copies: Math.max(1, Number(form.copies) || 1),
      };
      if (form.yearPublished) body.yearPublished = Number(form.yearPublished);
      if (form.thumbnail) body.thumbnail = form.thumbnail;
      if (form.image) body.image = form.image;
      if (form.description) body.description = form.description;
      if (form.bggId) body.bggId = Number(form.bggId);
      if (form.bggAverage !== '') body.bggAverage = Number(form.bggAverage);
      if (form.bggWeight !== '') body.bggWeight = Number(form.bggWeight);
      const cats = form.categories
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const mechs = form.mechanics
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (cats.length) body.categories = cats;
      if (mechs.length) body.mechanics = mechs;
      await api('/games', { method: 'POST', body });
      onCreated();
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal inv-modal" onSubmit={submit}>
        <div className="inv-modal-head">
          <div>
            <h2>เพิ่มเกมใหม่เข้าคลัง</h2>
            <p className="muted">ค้นจาก BGG หรือกรอกเอง</p>
          </div>
          <button type="button" className="inv-x" onClick={onClose} aria-label="ปิด">
            ✕
          </button>
        </div>
        {error && <div className="form-error">{error}</div>}

        <label className="field">
          <span>ค้นหาจาก BoardGameGeek</span>
          <input
            className="input"
            placeholder="พิมพ์ชื่อเกม เช่น Catan"
            value={bggQ}
            onChange={(e) => setBggQ(e.target.value)}
          />
        </label>
        {bggLoading && <p className="muted inv-bgg-note">กำลังค้นหา...</p>}
        {bggNote && !bggLoading && <p className="muted inv-bgg-note">{bggNote}</p>}
        {bggHits.length > 0 && (
          <ul className="inv-bgg-list">
            {bggHits.slice(0, 8).map((h) => (
              <li key={h.bggId}>
                <button type="button" disabled={busy} onClick={() => pickBgg(h)}>
                  {h.name}
                  {h.yearPublished ? ` (${h.yearPublished})` : ''}
                </button>
              </li>
            ))}
          </ul>
        )}

        <label className="field">
          <span>ชื่อเกม *</span>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            required
          />
        </label>

        <div className="inv-form-row">
          <label className="field">
            <span>ผู้เล่นขั้นต่ำ</span>
            <input
              className="input"
              type="number"
              min={1}
              value={form.minPlayers}
              onChange={(e) => setField('minPlayers', e.target.value)}
            />
          </label>
          <label className="field">
            <span>ผู้เล่นสูงสุด</span>
            <input
              className="input"
              type="number"
              min={1}
              value={form.maxPlayers}
              onChange={(e) => setField('maxPlayers', e.target.value)}
            />
          </label>
          <label className="field">
            <span>เวลา (นาที)</span>
            <input
              className="input"
              type="number"
              min={1}
              value={form.playtimeMin}
              onChange={(e) => setField('playtimeMin', e.target.value)}
            />
          </label>
          <label className="field">
            <span>จำนวนกล่อง</span>
            <input
              className="input"
              type="number"
              min={1}
              max={50}
              value={form.copies}
              onChange={(e) => setField('copies', e.target.value)}
            />
          </label>
        </div>

        <div className="inv-form-row">
          <label className="field">
            <span>ปีที่ออก</span>
            <input
              className="input"
              type="number"
              value={form.yearPublished}
              onChange={(e) => setField('yearPublished', e.target.value)}
            />
          </label>
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
        </div>

        <label className="field">
          <span>หมวดหมู่ (คั่นด้วยจุลภาค)</span>
          <input
            className="input"
            placeholder="Strategy, Family"
            value={form.categories}
            onChange={(e) => setField('categories', e.target.value)}
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
          <button type="button" className="btn-ghost" onClick={onClose}>
            ยกเลิก
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'กำลังบันทึก...' : 'เพิ่มเกม'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('name');
  const [counts, setCounts] = useState({ all: 0, available: 0, in_use: 0, maintenance: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const limit = 12;

  const loadCounts = useCallback(async () => {
    try {
      const [all, a, u, m] = await Promise.all([
        api('/games', { query: { limit: 1 } }),
        api('/games', { query: { limit: 1, status: 'available' } }),
        api('/games', { query: { limit: 1, status: 'in_use' } }),
        api('/games', { query: { limit: 1, status: 'maintenance' } }),
      ]);
      setCounts({
        all: all?.total ?? 0,
        available: a?.total ?? 0,
        in_use: u?.total ?? 0,
        maintenance: m?.total ?? 0,
      });
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/games', {
        query: {
          q: q.trim() || undefined,
          status: status || undefined,
          sort,
          order: sort === 'name' ? 'asc' : 'desc',
          page,
          limit,
        },
      });
      setItems(data?.items ?? []);
      setTotal(data?.total ?? 0);
    } catch (err) {
      setError(err.message || 'โหลดคลังเกมไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [q, status, sort, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    loadCounts();
  }, [loadCounts]);
  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      setQ(qInput);
    }, 300);
    return () => clearTimeout(id);
  }, [qInput]);

  const pages = Math.max(1, Math.ceil(total / limit));
  const pct = (n) => (counts.all ? ((n / counts.all) * 100).toFixed(1) : '0');

  return (
    <div className="inv">
      <div className="page-head">
        <div>
          <p className="inv-breadcrumb muted">ภาพรวมระบบ / คลังบอร์ดเกม</p>
          <h1>
            คลังบอร์ดเกม
            <span className="inv-title-en">Game Inventory</span>
          </h1>
          <p className="muted">
            รายการทั้งหมด {counts.all} เกม
            {status ? ` · กรอง: ${STATUS[status]?.label}` : ''}
          </p>
        </div>
        <div className="inv-head-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              load();
              loadCounts();
            }}
          >
            รีเฟรช
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowAdd(true)}>
            + เพิ่มเกมใหม่
          </button>
        </div>
      </div>

      {/* KPI ตามดีไซน์ */}
      <div className="inv-kpis">
        <button
          type="button"
          className={'inv-kpi' + (!status ? ' active' : '')}
          onClick={() => {
            setStatus('');
            setPage(1);
          }}
        >
          <div className="inv-kpi-top">
            <span className="inv-kpi-label">เกมทั้งหมดในคลัง</span>
            <span className="inv-kpi-ico">📦</span>
          </div>
          <strong>{counts.all}</strong>
          <small className="muted">TOTAL VAULT</small>
        </button>
        <button
          type="button"
          className={'inv-kpi ok' + (status === 'available' ? ' active' : '')}
          onClick={() => {
            setStatus('available');
            setPage(1);
          }}
        >
          <div className="inv-kpi-top">
            <span className="inv-kpi-label">พร้อมให้บริการ</span>
            <span className="inv-kpi-ico">✓</span>
          </div>
          <strong>{counts.available}</strong>
          <small className="muted">{pct(counts.available)}% · IN-VAULT</small>
        </button>
        <button
          type="button"
          className={'inv-kpi play' + (status === 'in_use' ? ' active' : '')}
          onClick={() => {
            setStatus('in_use');
            setPage(1);
          }}
        >
          <div className="inv-kpi-top">
            <span className="inv-kpi-label">กำลังอยู่บนโต๊ะ</span>
            <span className="inv-kpi-ico">🎮</span>
          </div>
          <strong>{counts.in_use}</strong>
          <small className="muted">{pct(counts.in_use)}% · IN-PLAY</small>
        </button>
        <button
          type="button"
          className={'inv-kpi fix' + (status === 'maintenance' ? ' active' : '')}
          onClick={() => {
            setStatus('maintenance');
            setPage(1);
          }}
        >
          <div className="inv-kpi-top">
            <span className="inv-kpi-label">ส่งซ่อม / บำรุง</span>
            <span className="inv-kpi-ico">🔧</span>
          </div>
          <strong>{counts.maintenance}</strong>
          <small className="muted">{pct(counts.maintenance)}% · MAINTENANCE</small>
        </button>
      </div>

      <div className="inv-filters panel">
        <input
          className="input inv-search"
          placeholder="ค้นหาชื่อบอร์ดเกม..."
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
        <div className="inv-filters-row">
          <div className="inv-filter-chips">
            {[
              { key: '', label: `ทั้งหมด (${counts.all})` },
              { key: 'available', label: `พร้อมเล่น (${counts.available})` },
              { key: 'in_use', label: `กำลังเล่น (${counts.in_use})` },
              { key: 'maintenance', label: `ส่งซ่อม (${counts.maintenance})` },
            ].map((c) => (
              <button
                key={c.key || 'all'}
                type="button"
                className={'inv-chip' + (status === c.key ? ' active' : '')}
                onClick={() => {
                  setStatus(c.key);
                  setPage(1);
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
          <select
            className="input inv-sort"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="name">เรียงตามชื่อ</option>
            <option value="year">เรียงตามปี</option>
            <option value="bggRating">เรียงตามเรตติ้ง BGG</option>
            <option value="createdAt">เรียงตามวันที่เพิ่ม</option>
          </select>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
      {loading && <p className="muted">กำลังโหลดคลังเกม...</p>}

      <div className="inv-grid">
        {!loading && items.length === 0 && <p className="muted inv-empty">ไม่พบเกมในคลัง</p>}
        {items.map((g) => {
          const st = STATUS[g.status] || STATUS.available;
          const copies = g.copies ?? 1;
          return (
            <article key={g._id} className="inv-card panel">
              <div className="inv-card-img">
                {g.thumbnail || g.image ? (
                  <img src={g.thumbnail || g.image} alt="" loading="lazy" />
                ) : (
                  <div className="inv-card-ph">🎲</div>
                )}
                <div className="inv-card-badges">
                  <span className={`inv-badge inv-badge-${st.tone}`}>
                    {st.label}
                    {copies > 1 ? ` · ${copies} กล่อง` : ''}
                  </span>
                  {g.bggAverage != null && (
                    <span className="inv-rating">★ {Number(g.bggAverage).toFixed(1)}</span>
                  )}
                </div>
              </div>
              <div className="inv-card-body">
                <h3 title={g.name}>{g.name}</h3>
                <div className="inv-tags">
                  {(g.categories || []).slice(0, 3).map((c) => (
                    <span key={c} className="inv-tag">
                      {c}
                    </span>
                  ))}
                </div>
                <div className="inv-meta-grid">
                  <div>
                    <span className="inv-meta-k">PLAYERS</span>
                    <span className="inv-meta-v">
                      {g.minPlayers}–{g.maxPlayers}
                    </span>
                  </div>
                  <div>
                    <span className="inv-meta-k">TIME</span>
                    <span className="inv-meta-v">{g.playtimeMin || '—'}m</span>
                  </div>
                  <div>
                    <span className="inv-meta-k">WEIGHT</span>
                    <span className="inv-meta-v">
                      {g.bggWeight != null ? `${Number(g.bggWeight).toFixed(1)}/5` : '—'}
                    </span>
                  </div>
                </div>
                <Link className="btn-primary inv-btn" to={`/admin/inventory/${g._id}`}>
                  ดูรายละเอียด / จัดการ
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {pages > 1 && (
        <div className="inv-pager">
          <button
            type="button"
            className="btn-ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← ก่อนหน้า
          </button>
          <span className="muted">
            หน้า {page} / {pages} · {total} รายการ
          </span>
          <button
            type="button"
            className="btn-ghost"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            ถัดไป →
          </button>
        </div>
      )}

      {showAdd && (
        <AddGameModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            load();
            loadCounts();
          }}
        />
      )}
    </div>
  );
}
