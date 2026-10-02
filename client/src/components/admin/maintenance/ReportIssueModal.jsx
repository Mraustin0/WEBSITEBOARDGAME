import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/api.js';
import { fmtDetails } from './helpers.js';

// + แจ้งปัญหาใหม่ -> POST /api/maintenance
// แจ้งซ่อมแล้ว: ปิดเฉพาะจำนวนกล่องที่แจ้ง (status = maintenance เมื่อซ่อมครบทุกกล่อง)
export default function ReportIssueModal({ onClose, onCreated }) {
  const [itemType, setItemType] = useState('game');
  const [tables, setTables] = useState([]);
  const [tableId, setTableId] = useState('');
  const [games, setGames] = useState([]);
  const [gameId, setGameId] = useState('');
  const [copies, setCopies] = useState(1); // จำนวนกล่องที่เสีย
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // โหลดโต๊ะ + เกม
  useEffect(() => {
    api('/tables')
      .then((d) => setTables(Array.isArray(d) ? d : (d?.items ?? [])))
      .catch(() => setError('โหลดรายชื่อโต๊ะไม่สำเร็จ'));

    api('/games', { query: { limit: 200, sort: 'name', order: 'asc' } })
      .then((d) => setGames(d?.items ?? []))
      .catch(() => setError('โหลดรายชื่อเกมไม่สำเร็จ'));
  }, []);

  // เกมที่เลือกอยู่ → ใช้ copies เป็น max
  const selectedGame = useMemo(() => games.find((g) => g._id === gameId) ?? null, [games, gameId]);
  const maxCopies = Math.max(1, Number(selectedGame?.copies) || 1);

  // เปลี่ยนเกม → reset copies ให้ไม่เกิน max
  function onGameChange(id) {
    setGameId(id);
    const g = games.find((x) => x._id === id);
    const max = Math.max(1, Number(g?.copies) || 1);
    setCopies((c) => Math.min(c, max));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (itemType === 'game' && !gameId) return setError('เลือกเกมที่ต้องการแจ้งซ่อม');
    if (itemType === 'table' && !tableId) return setError('เลือกโต๊ะที่ต้องการแจ้งซ่อม');
    if (!title.trim()) return setError('กรอกหัวข้อปัญหา');

    setBusy(true);
    try {
      await api('/maintenance', {
        method: 'POST',
        body: {
          itemType,
          ...(itemType === 'game'
            ? { game: gameId, copies: Math.min(copies, maxCopies) }
            : { table: tableId }),
          title: title.trim(),
          description: description.trim(),
          priority,
        },
      });
      onCreated();
    } catch (err) {
      const d = fmtDetails(err.details);
      setError(d ? `${err.message} — ${d}` : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="modal mt-report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mt-report-title"
        onSubmit={submit}
      >
        <div className="mt-report-head">
          <h2 id="mt-report-title">แจ้งปัญหาใหม่ (Report New Issue)</h2>
          <button type="button" className="mt-report-x" onClick={onClose} aria-label="ปิด">
            ✕
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        {/* ประเภท */}
        <div className="field">
          <span>ประเภท</span>
          <div className="mt-seg" role="group" aria-label="ประเภทที่แจ้งซ่อม">
            <button
              type="button"
              className={'mt-seg-btn' + (itemType === 'game' ? ' active' : '')}
              onClick={() => {
                setItemType('game');
                setTableId('');
              }}
            >
              บอร์ดเกม
            </button>
            <button
              type="button"
              className={'mt-seg-btn' + (itemType === 'table' ? ' active' : '')}
              onClick={() => {
                setItemType('table');
                setGameId('');
                setCopies(1);
              }}
            >
              โต๊ะ / อุปกรณ์
            </button>
          </div>
        </div>

        {/* เลือกเกม + จำนวนกล่องที่เสีย */}
        {itemType === 'game' ? (
          <>
            <label className="field">
              <span>เกม</span>
              <select
                className="input"
                value={gameId}
                onChange={(e) => onGameChange(e.target.value)}
              >
                <option value="">เลือกเกม</option>
                {games.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name}
                    {Number(g.copies) > 1 ? ` (${g.copies} กล่อง)` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>เสียกี่กล่อง</span>
              <select
                className="input"
                value={copies}
                onChange={(e) => setCopies(Number(e.target.value))}
                disabled={!gameId}
              >
                {Array.from({ length: maxCopies }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} กล่อง
                    {n === maxCopies && maxCopies > 1 ? ' (ทั้งหมด)' : ''}
                  </option>
                ))}
              </select>
              {selectedGame && (
                <small className="muted" style={{ marginTop: 4, display: 'block' }}>
                  มีในร้าน {maxCopies} กล่อง — แจ้งซ่อม {copies} กล่อง
                  {copies >= maxCopies
                    ? ' (จะปิดการจองเกมนี้ทั้งหมด)'
                    : ` (เหลือใช้ได้ ${maxCopies - copies})`}
                </small>
              )}
            </label>
          </>
        ) : (
          <label className="field">
            <span>โต๊ะ</span>
            <select className="input" value={tableId} onChange={(e) => setTableId(e.target.value)}>
              <option value="">เลือกโต๊ะ</option>
              {tables.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.code} ({t.zone})
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="field">
          <span>หัวข้อปัญหา</span>
          <input
            className="input"
            maxLength={120}
            placeholder="เช่น ขาดชิ้นส่วน การ์ดชำรุด ขาโต๊ะหลวม"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="field">
          <span>รายละเอียด</span>
          <textarea
            className="input mt-textarea"
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className="field">
          <span>ความเร่งด่วน</span>
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="high">สูง (High)</option>
            <option value="medium">ปานกลาง</option>
            <option value="low">ต่ำ (Low)</option>
          </select>
        </label>

        <p className="muted">
          เมื่อแจ้งซ่อม ระบบจะปิดการใช้งาน
          {itemType === 'game' ? `เกมนี้ ${copies} กล่อง` : 'โต๊ะนี้'}
          ทันทีจนกว่างานซ่อมจะเสร็จสิ้น
        </p>

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            ปิด
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'กำลังบันทึก...' : 'แจ้งซ่อม'}
          </button>
        </div>
      </form>
    </div>
  );
}
