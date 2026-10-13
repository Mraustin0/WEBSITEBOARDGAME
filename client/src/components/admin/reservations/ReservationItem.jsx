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

/** การ์ดหนึ่งรายการในรายการจอง — ปุ่มสั้น อ่านง่าย */
export default function ReservationItem({ r, busy, onCancel, onNoShow, onCheckout, onConfirm }) {
  const st = displayStatus(r);
  const pending = needsConfirm(r);
  const canConfirm = pending && typeof onConfirm === 'function';
  const canCancel = r.status === 'booked' || r.status === 'playing';
  const canNoShow = r.status === 'booked';
  const canCheckout = r.status === 'playing';
  const dim = r.status === 'cancelled' || r.status === 'no_show';

  const showActions = canConfirm || canCancel || canNoShow || canCheckout;

  return (
    <li
      className={`res-item tone-${st.tone}${dim ? ' is-dim' : ''}${pending ? ' is-pending' : ''}`}
    >
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

      {showActions && (
        <div className="res-actions">
          {canConfirm && (
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              title="ยืนยันการจองออนไลน์"
              onClick={() => onConfirm(r)}
            >
              ยืนยัน
            </button>
          )}

          {canCheckout && (
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              title="เช็คบิลและคืนเกม"
              onClick={() => onCheckout(r)}
            >
              เช็คบิล
            </button>
          )}

          {canNoShow && (
            <button
              type="button"
              className="btn-ghost"
              disabled={busy}
              title="บันทึกว่าลูกค้าไม่มาตามนัด"
              onClick={() => onNoShow(r)}
            >
              ไม่มา
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              className="btn-danger"
              disabled={busy}
              title="ยกเลิกการจอง"
              onClick={() => onCancel(r)}
            >
              ยกเลิก
            </button>
          )}
        </div>
      )}
    </li>
  );
}
