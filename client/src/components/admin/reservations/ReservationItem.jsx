import { timeTH } from '../../../lib/date.js';
import {
  customerName,
  customerPhone,
  displayStatus,
  endAtOf,
  gameName,
  needsConfirm,
  tableCode,
} from '../../../lib/reservationStatus.js';

// การ์ดหนึ่งรายการในรายการจอง
// รองรับ onConfirm ตาม API Develop: PATCH /reservations/admin/:id/confirm
export default function ReservationItem({ r, busy, onCancel, onNoShow, onCheckout, onConfirm }) {
  const st = displayStatus(r);
  const canConfirm = needsConfirm(r);
  const canCancel = r.status === 'booked' || r.status === 'playing';
  const canNoShow = r.status === 'booked';
  const canCheckout = r.status === 'playing';
  const dim = r.status === 'cancelled' || r.status === 'no_show';

  return (
    <li className={`res-item tone-${st.tone}${dim ? ' is-dim' : ''}`}>
      <div className="res-item-top">
        <div className="res-time">
          {timeTH(r.startAt)} – {timeTH(endAtOf(r))}
          <span className="res-table">{tableCode(r)}</span>
        </div>
        <span className={`chip tone-${st.tone}`}>{st.label}</span>
      </div>

      <div className="res-name">{customerName(r)}</div>
      <div className="res-meta">
        {customerPhone(r) && <span>{customerPhone(r)} • </span>}
        {r.players} ที่นั่ง
        {gameName(r) && <span> • {gameName(r)}</span>}
      </div>

      {(canConfirm || canCancel || canNoShow || canCheckout) && (
        <div className="res-actions">
          {canConfirm && (
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => onConfirm?.(r)}
            >
              ยืนยันการจอง
            </button>
          )}

          {canCheckout && (
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => onCheckout(r)}
            >
              เช็คบิล / คืนเกม
            </button>
          )}

          {canNoShow && (
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => onNoShow(r)}>
              ลูกค้าไม่มา
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              className="btn-danger"
              disabled={busy}
              onClick={() => onCancel(r)}
            >
              ยกเลิกการจอง
            </button>
          )}
        </div>
      )}
    </li>
  );
}
