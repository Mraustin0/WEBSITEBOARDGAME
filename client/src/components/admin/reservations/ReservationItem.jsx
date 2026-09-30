import { timeTH } from '../../../lib/date.js';
import {
  customerName,
  customerPhone,
  endAtOf,
  gameName,
  statusOf,
  tableCode,
} from '../../../lib/reservationStatus.js';

// การ์ดหนึ่งรายการในรายการจอง
export default function ReservationItem({ r, busy, onCancel, onNoShow }) {
  const st = statusOf(r.status);
  const canCancel = r.status === 'booked' || r.status === 'playing';
  const canNoShow = r.status === 'booked';
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

      {(canCancel || canNoShow) && (
        <div className="res-actions">
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
