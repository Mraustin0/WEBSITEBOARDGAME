import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, CheckCircle, Gamepad, Tuning } from 'reicon-react';
import { api } from '../../lib/api.js';
import './inventory.css';
import { copyLabel } from '../../lib/copies.js';
import FieldError from '../../components/FieldError.jsx';
import { useFieldErrors } from '../../lib/useFieldErrors.js';
import { gameRules, splitList } from '../../lib/gameRules.js';

const STATUS = {
  available: { label: 'ว่างบนชั้น', tone: 'ok' },
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
          setBggNote(err.message || 'ค้นหาใน BGG ไม่สำเร็จ กรอกข้อมูลเองได้');
        })
        .finally(() => setBggLoading(false));
    }, 350);
    return () => clearTimeout(id);
  }, [bggQ]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  // กลไกเกมมาจาก BGG เท่านั้น (ไม่มีช่องให้แก้) → ไม่ตรวจ แต่ตัดให้อยู่ในขอบเขตตอนส่ง
  const v = useFieldErrors(form, (f) => gameRules({ ...f, mechanics: undefined }));
  const fe = (k) => <FieldError variant="admin" id={v.errId(k)} msg={v.errors[k]} />;

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
      setBggNote('ดึงข้อมูลจาก BGG แล้ว');
    } catch (err) {
      setError(err.message || 'ดึงข้อมูลจาก BGG ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!v.submit()) return;
    setBusy(true);
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
      if (form.thumbnail.trim()) body.thumbnail = form.thumbnail.trim();
      if (form.image.trim()) body.image = form.image.trim();
      if (form.description) body.description = form.description;
      if (form.bggId) body.bggId = Number(form.bggId);
      if (form.bggAverage !== '') body.bggAverage = Number(form.bggAverage);
      if (form.bggWeight !== '') body.bggWeight = Number(form.bggWeight);
      const cats = splitList(form.categories);
      const mechs = splitList(form.mechanics)
        .filter((m) => m.length <= 80)
        .slice(0, 30);
      if (cats.length) body.categories = cats;
      if (mechs.length) body.mechanics = mechs;
      await api('/games', { method: 'POST', body });
      onCreated();
    } catch (err) {
      if (!(err.status === 400 && v.server(err))) setError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal inv-modal" onSubmit={submit} noValidate>
        <div className="inv-modal-head">
          <div>
            <h2>เพิ่มเกมเข้าคลัง</h2>
            <p className="muted">ค้นหาจาก BGG หรือกรอกข้อมูลเอง</p>
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
            autoComplete="off"
            maxLength={100}
          />
        </label>

        {bggLoading && (
          <p className="muted" style={{ margin: '4px 0 8px' }}>
            กำลังค้นหา...
          </p>
        )}

        {!bggLoading && bggHits.length > 0 && (
          <label className="field" style={{ marginBottom: 12 }}>
            <span style={{ color: '#0f766e', fontWeight: 600 }}>
              พบ {bggHits.length} เกม เลือกเพื่อเติมข้อมูลอัตโนมัติ
            </span>
            <select
              className="input"
              defaultValue=""
              disabled={busy}
              onChange={(e) => {
                const id = Number(e.target.value);
                const hit = bggHits.find((h) => h.bggId === id);
                if (hit) pickBgg(hit);
                e.target.value = '';
              }}
              style={{
                marginTop: 6,
                border: '2px solid #0f766e',
                background: '#eef4ec',
                fontWeight: 600,
                color: '#134e4a',
              }}
            >
              <option value="" disabled>
                เลือกเกมจาก BGG
              </option>
              {bggHits.slice(0, 15).map((h) => (
                <option key={h.bggId} value={h.bggId}>
                  {h.name}
                  {h.yearPublished ? ` (${h.yearPublished})` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        {!bggLoading && bggNote && bggHits.length === 0 && (
          <p className="muted" style={{ margin: '4px 0 8px' }}>
            {bggNote}
          </p>
        )}

        <a
          className="bgg-powered"
          href="https://boardgamegeek.com"
          target="_blank"
          rel="noopener noreferrer"
          title="Powered by BoardGameGeek"
        >
          <img src="/powered-by-bgg.png" alt="Powered by BGG" height={28} />
        </a>

        <label className="field">
          <span>ชื่อเกม *</span>
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
            placeholder="เช่น Strategy, Family"
            value={form.categories}
            onChange={(e) => setField('categories', e.target.value)}
            {...v.bind('categories')}
          />
          {fe('categories')}
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
            <span className="muted">ตัวอย่างรูป</span>
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
      const s = await api('/games/stats');
      setCounts({
        all: s.titles ?? s.total ?? 0,
        available: s.available ?? 0,
        in_use: s.inUse ?? 0,
        maintenance: s.maintenance ?? 0,
        totalCopies: s.totalCopies ?? 0,
      });
    } catch {
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
      if (data?.counts) {
        setCounts((c) => ({
          ...c,
          all: data.counts.total ?? c.all,
          available: data.counts.available ?? c.available,
          in_use: data.counts.inUse ?? c.in_use,
          maintenance: data.counts.maintenance ?? c.maintenance,
        }));
      }
    } catch (err) {
      setError(err.message || 'โหลดคลังบอร์ดเกมไม่สำเร็จ');
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
          <p className="inv-breadcrumb muted">ภาพรวมร้าน / คลังบอร์ดเกม</p>
          <h1>คลังบอร์ดเกม</h1>
          <p className="muted">
            ทั้งหมด {counts.all} เกม
            {status ? ` · แสดงเฉพาะ: ${STATUS[status]?.label}` : ''}
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
            + เพิ่มเกม
          </button>
        </div>
      </div>

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
            <span className="inv-kpi-ico">
              <Box size={18} />
            </span>
          </div>
          <strong>{counts.all}</strong>
          <small className="muted">ทุกสถานะ</small>
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
            <span className="inv-kpi-label">ว่างบนชั้น</span>
            <span className="inv-kpi-ico">
              <CheckCircle size={18} />
            </span>
          </div>
          <strong>{counts.available}</strong>
          <small className="muted">{pct(counts.available)}% ของทั้งหมด</small>
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
            <span className="inv-kpi-label">กำลังเล่น</span>
            <span className="inv-kpi-ico">
              <Gamepad size={18} />
            </span>
          </div>
          <strong>{counts.in_use}</strong>
          <small className="muted">{pct(counts.in_use)}% ของทั้งหมด</small>
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
            <span className="inv-kpi-label">ส่งซ่อม</span>
            <span className="inv-kpi-ico">
              <Tuning size={18} />
            </span>
          </div>
          <strong>{counts.maintenance}</strong>
          <small className="muted">{pct(counts.maintenance)}% ของทั้งหมด</small>
        </button>
      </div>

      <div className="inv-filters panel">
        <input
          className="input inv-search"
          placeholder="ค้นหาชื่อเกม"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
        <div className="inv-filters-row">
          <div className="inv-filter-chips">
            {[
              { key: '', label: `ทั้งหมด (${counts.all})` },
              { key: 'available', label: `ว่างบนชั้น (${counts.available})` },
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
      {loading && <p className="muted">กำลังโหลด...</p>}

      <div className="inv-grid">
        {!loading && items.length === 0 && <p className="muted inv-empty">ไม่พบเกม</p>}
        {items.map((g) => {
          const st = STATUS[g.status] || STATUS.available;
          return (
            <article key={g._id} className="inv-card panel">
              <div className="inv-card-img">
                {g.image || g.thumbnail ? (
                  <img src={g.image || g.thumbnail} alt="" loading="lazy" />
                ) : (
                  <div className="inv-card-ph">
                    <Gamepad size={48} />
                  </div>
                )}
                <div className="inv-card-badges">
                  <span className={`inv-badge inv-badge-${st.tone}`}>
                    {st.label}
                    {copyLabel(g)}
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
                    <span className="inv-meta-k">ผู้เล่น</span>
                    <span className="inv-meta-v">
                      {g.minPlayers}–{g.maxPlayers}
                    </span>
                  </div>
                  <div>
                    <span className="inv-meta-k">เวลา</span>
                    <span className="inv-meta-v">
                      {g.playtimeMin ? `${g.playtimeMin} นาที` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="inv-meta-k">ความยาก</span>
                    <span className="inv-meta-v">
                      {g.bggWeight != null ? `${Number(g.bggWeight).toFixed(1)}/5` : '—'}
                    </span>
                  </div>
                </div>
                <Link className="btn-primary inv-btn" to={`/admin/inventory/${g._id}`}>
                  ดูรายละเอียดเกม
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
            หน้า {page} / {pages} · {total} เกม
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
