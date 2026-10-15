import { useEffect, useState } from 'react';
import FieldError from '../../FieldError.jsx';
import { useFieldErrors } from '../../../lib/useFieldErrors.js';
import { vText } from '../../../lib/validate.js';

// ยกเลิกการจอง (admin) + เหตุผล ไม่บังคับ ≤ 300 ตัว (cancelBody.reason) — แทน window.prompt
export default function CancelReasonModal({ title, busy, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const v = useFieldErrors({ reason }, (f) => ({
    reason: vText(f.reason, { max: 300, label: 'เหตุผล' }),
  }));

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit(e) {
    e.preventDefault();
    if (!v.submit()) return;
    onConfirm(reason.trim());
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cr-title"
        onSubmit={submit}
        noValidate
      >
        <h2 id="cr-title">{title}</h2>
        <label className="field">
          <span>เหตุผล (ไม่บังคับ)</span>
          <textarea
            className="input"
            rows={3}
            maxLength={300}
            placeholder="เช่น ลูกค้าโทรมายกเลิก"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
            {...v.bind('reason')}
          />
          <FieldError variant="admin" id={v.errId('reason')} msg={v.errors.reason} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            ไม่ยกเลิก
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'กำลังยกเลิก...' : 'ยกเลิกการจอง'}
          </button>
        </div>
      </form>
    </div>
  );
}
