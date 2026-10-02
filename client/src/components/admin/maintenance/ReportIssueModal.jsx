import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';
import { fmtDetails } from './helpers.js';

// + แจ้งปัญหาใหม่ -> POST /api/maintenance
// แจ้งซ่อมแล้ว: เกมจะเป็น maintenance / โต๊ะจะเป็น closed อัตโนมัติ (จองไม่ได้)
export default function ReportIssueModal({ onClose, onCreated }) {
  const [itemType, setItemType] = useState('game');
  const [tables, setTables] = useState([]);
  const [tableId, setTableId] = useState('');
  const [gameQuery, setGameQuery] = useState('');
  const [gameResults, setGameResults] = useState([]);
  const [game, setGame] = useState(null);
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

  // โหลดรายชื่อโต๊ะ (GET /tables คืน array)
  useEffect(() => {
    api('/tables')
      .then((d) => setTables(Array.isArray(d) ? d : (d?.items ?? [])))
      .catch(() => setError('โหลดรายชื่อโต๊ะไม่สำเร็จ'));
  }, []);

  // ค้นหาเกม (หน่วง 300ms)
  useEffect(() => {
    const q = gameQuery.trim();
    if (!q || game) return setGameResults([]);
    const id = setTimeout(() => {
      api('/games', { query: { q, limit: 8 } })
        .then((d) => setGameResults(d?.items ?? []))
        .catch(() => setGameResults([]));
    }, 300);
    return () => clearTimeout(id);
  }, [gameQuery, game]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (itemType === 'game' && !game) return setError('เลือกเกมที่ต้องการแจ้งซ่อม');
    if (itemType === 'table' && !tableId) return setError('เลือกโต๊ะที่ต้องการแจ้งซ่อม');
    if (!title.trim()) return setError('กรอกหัวข้อปัญหา');

    setBusy(true);
    try {
      await api('/maintenance', {
        method: 'POST',
        body: {
          itemType,
          ...(itemType === 'game' ? { game: game._id } : { table: tableId }),
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
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mt-report-title"
        onSubmit={submit}
      >
        <h2 id="mt-report-title">แจ้งปัญหาใหม่ (Report New Issue)</h2>
        {error && <div className="form-error">{error}</div>}

        <div className="tabs">
          <button
            type="button"
            className={'tab' + (itemType === 'game' ? ' active' : '')}
            onClick={() => setItemType('game')}
          >
            บอร์ดเกม
          </button>
          <button
            type="button"
            className={'tab' + (itemType === 'table' ? ' active' : '')}
            onClick={() => setItemType('table')}
          >
            โต๊ะ / อุปกรณ์
          </button>
        </div>

        {itemType === 'game' ? (
          <div className="field">
            <span>เกม</span>
            {game ? (
              <div className="mt-picked">
                <strong>{game.name}</strong>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => {
                    setGame(null);
                    setGameQuery('');
                  }}
                >
                  เปลี่ยน
                </button>
              </div>
            ) : (
              <>
                <input
                  className="input"
                  placeholder="พิมพ์ชื่อเกมเพื่อค้นหา"
                  value={gameQuery}
                  onChange={(e) => setGameQuery(e.target.value)}
                />
                {gameResults.length > 0 && (
                  <div className="mt-pick-list">
                    {gameResults.map((g) => (
                      <button
                        key={g._id}
                        type="button"
                        className="mt-pick-item"
                        onClick={() => setGame(g)}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
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
          เมื่อแจ้งซ่อม ระบบจะปิดการใช้งาน{itemType === 'game' ? 'เกม' : 'โต๊ะ'}
          นี้ทันทีจนกว่างานซ่อมจะเสร็จสิ้น
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
