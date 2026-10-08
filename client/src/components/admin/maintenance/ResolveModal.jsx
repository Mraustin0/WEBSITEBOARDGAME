import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';
import { fmtDetails, itemName } from './helpers.js';

// ปิดงานซ่อม -> PATCH /api/maintenance/:id { status: 'resolved', cost, resolution }
export default function ResolveModal({ ticket, onClose, onDone }) {
  const [resolution, setResolution] = useState(ticket.resolution ?? '');
  const [cost, setCost] = useState(ticket.cost ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api(`/maintenance/${ticket._id}`, {
        method: 'PATCH',
        body: { status: 'resolved', cost: Number(cost) || 0, resolution: resolution.trim() },
      });
      onDone();
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
        aria-labelledby="mt-resolve-title"
        onSubmit={submit}
      >
        <h2 id="mt-resolve-title">ปิดงานซ่อม: {itemName(ticket)}</h2>
        {error && <div className="form-error">{error}</div>}

        <label className="field">
          <span>สรุปผลการซ่อม</span>
          <textarea
            className="input mt-textarea"
            maxLength={2000}
            placeholder="เช่น เปลี่ยนชิ้นส่วนใหม่ ทำความสะอาด ตรวจสอบแล้ว"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          />
        </label>

        <label className="field">
          <span>ค่าซ่อม (บาท)</span>
          <input
            className="input"
            type="number"
            min="0"
            step="1"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </label>

        <p className="muted">
          เมื่อปิดงาน ระบบจะเปิดใช้งาน{ticket.itemType === 'game' ? 'เกม' : 'โต๊ะ'}คืนให้อัตโนมัติ
          (ถ้าไม่มีใบแจ้งซ่อมอื่นของชิ้นนี้ค้างอยู่)
        </p>

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>
            ยกเลิก
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'กำลังบันทึก...' : 'ปิดงานซ่อม'}
          </button>
        </div>
      </form>
    </div>
  );
}
