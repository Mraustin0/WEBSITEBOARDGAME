import { AssistRequest, ACTIVE_ASSIST_STATUSES } from '../../models/assist.model.js';
import { Reservation } from '../../models/reservation.model.js';
import { conflict, notFound } from '../../lib/errors.js';
import { syncLifecycle } from '../reservations/reservations.lifecycle.js';
import { notifyAssist, resolveNotifications } from '../notifications/notifications.service.js';

const POPULATE = [
  { path: 'table', select: 'code name zone' },
  { path: 'user', select: 'username' },
  {
    path: 'reservation',
    select: 'status startAt endAt players game customer',
    populate: { path: 'game', select: 'name thumbnail' },
  },
  { path: 'acknowledgedBy', select: 'username' },
  { path: 'resolvedBy', select: 'username' },
];

const isAdmin = (user) => user.role === 'admin';
const sameId = (a, b) => String(a?._id ?? a) === String(b?._id ?? b);

/** สมาชิกกด "เรียก GM" — ต้องเป็นเจ้าของการจองที่กำลังเล่นอยู่ */
export async function create(user, { reservation, topic, note }) {
  await syncLifecycle();
  const r = await Reservation.findById(reservation);
  if (!r || (!isAdmin(user) && !sameId(r.user, user._id))) {
    throw notFound('reservation not found');
  }
  if (r.status !== 'playing') throw conflict('can call staff only while playing');

  const dup = await AssistRequest.exists({
    reservation: r._id,
    topic,
    status: { $in: ACTIVE_ASSIST_STATUSES },
  });
  if (dup) throw conflict('staff has already been called for this — please wait');

  const doc = await AssistRequest.create({
    reservation: r._id,
    table: r.table,
    user: r.user,
    topic,
    note,
  });
  await doc.populate(POPULATE);
  await notifyAssist(doc); // แจ้งพนักงาน (สำคัญ)
  return doc;
}

/** คำขอของฉัน (แสดงสถานะ "พนักงานรับเรื่องแล้ว" บนการ์ด) */
export async function listMine(userId, { reservation }) {
  const filter = { user: userId };
  if (reservation) filter.reservation = reservation;
  return AssistRequest.find(filter).populate(POPULATE).sort({ createdAt: -1 }).limit(50);
}

/** สมาชิกยกเลิกคำขอที่ยังไม่เสร็จ */
export async function cancel(id, user) {
  const doc = await AssistRequest.findById(id);
  if (!doc || (!isAdmin(user) && !sameId(doc.user, user._id))) {
    throw notFound('request not found');
  }
  if (!ACTIVE_ASSIST_STATUSES.includes(doc.status)) {
    throw conflict(`request is already ${doc.status}`);
  }
  doc.status = 'cancelled';
  await doc.save();
  await resolveNotifications({ 'refs.assist': doc._id });
  return doc.populate(POPULATE);
}

/** admin: คิวคำขอ (เก่าสุดขึ้นก่อน) + ตัวเลขสรุป */
export async function list({ status, topic, table, page, limit }) {
  const filter = {};
  filter.status = status === 'active' ? { $in: ACTIVE_ASSIST_STATUSES } : status;
  if (topic) filter.topic = topic;
  if (table) filter.table = table;
  const sort = status === 'active' || status === 'open' ? { createdAt: 1 } : { createdAt: -1 };
  const [items, total, open, acknowledged] = await Promise.all([
    AssistRequest.find(filter)
      .populate(POPULATE)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    AssistRequest.countDocuments(filter),
    AssistRequest.countDocuments({ status: 'open' }),
    AssistRequest.countDocuments({ status: 'acknowledged' }),
  ]);
  return { items, total, page, limit, counts: { open, acknowledged } };
}

/** admin: รับเรื่อง → เสร็จแล้ว */
export async function update(id, admin, { status, resolution }) {
  const doc = await AssistRequest.findById(id);
  if (!doc) throw notFound('request not found');
  if (!ACTIVE_ASSIST_STATUSES.includes(doc.status)) {
    throw conflict(`request is already ${doc.status}`);
  }
  const now = new Date();
  if (status === 'acknowledged') {
    if (doc.status === 'acknowledged') throw conflict('request is already acknowledged');
    Object.assign(doc, { status, acknowledgedAt: now, acknowledgedBy: admin._id });
  } else {
    if (!doc.acknowledgedAt) Object.assign(doc, { acknowledgedAt: now, acknowledgedBy: admin._id });
    Object.assign(doc, { status, resolvedAt: now, resolvedBy: admin._id });
  }
  if (resolution !== undefined) doc.resolution = resolution;
  await doc.save();
  await resolveNotifications({ 'refs.assist': doc._id }); // รับเรื่องแล้ว → ซ่อนปุ่มในแจ้งเตือน
  return doc.populate(POPULATE);
}
