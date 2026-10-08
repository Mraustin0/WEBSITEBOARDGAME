// ศูนย์การแจ้งเตือน (หน้า 10 ฝั่ง admin)
// - module อื่นเรียก notify() ตอนเกิดเหตุการณ์ (จองใหม่, เรียก GM, แจ้งซ่อม ...)
// - แจ้งเตือนเวลา (ใกล้หมด / เลยเวลา) สร้างจาก scanTimeAlerts() — job ทุก 1 นาที + ตอนเปิดดูรายการ
import mongoose from 'mongoose';
import { Notification, NotificationPref } from '../../models/notification.model.js';
import { Reservation } from '../../models/reservation.model.js';
import { logger } from '../../lib/logger.js';
import { notFound } from '../../lib/errors.js';
import { MINUTE_MS, TZ, toLocalDateString } from '../../lib/time.js';

const ENDING_SOON_MIN = 10;

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
/** "03/10 18:00" (เวลาไทย) */
export const fmtLocal = (d) => fmt.format(new Date(d)).replace(',', '');

const who = (r) => r.user?.username ?? r.customer?.name ?? 'ลูกค้า';

/** สร้างการแจ้งเตือน — ไม่ทำให้งานหลักล้มถ้าบันทึกไม่ได้ */
export async function notify(data) {
  try {
    if (data.dedupeKey) {
      const { dedupeKey, ...rest } = data;
      await Notification.updateOne({ dedupeKey }, { $setOnInsert: rest }, { upsert: true });
    } else {
      await Notification.create(data);
    }
  } catch (err) {
    if (err?.code !== 11000) logger.warn({ err, type: data.type }, 'notify failed');
  }
}

/** ปิดปุ่มดำเนินการของการแจ้งเตือนที่จัดการแล้ว */
export async function resolveNotifications(filter) {
  try {
    await Notification.updateMany({ ...filter, done: false }, { $set: { done: true } });
  } catch (err) {
    logger.warn({ err }, 'resolve notifications failed');
  }
}

/** เรื่องเวลาของการจองนี้จัดการแล้ว (คืนเกม / ต่อเวลา / ยกเลิก / no-show) */
export const resolveTimeAlerts = (reservationId) =>
  resolveNotifications({
    'refs.reservation': reservationId,
    type: { $in: ['time_ending', 'time_overdue'] },
  });

const reservationActions = (id) => [
  {
    key: 'extend',
    label: 'ต่อเวลา',
    method: 'PATCH',
    path: `/api/reservations/${id}/extend`,
    body: { hours: 0.5 },
  },
  { key: 'checkout', label: 'เช็คบิล', method: 'GET', path: `/api/reservations/${id}/checkout` },
];

/** แจ้งเตือนเวลา: โต๊ะที่เหลือ ≤ 10 นาที และโต๊ะที่เลยเวลาแล้วยังไม่คืนเกม */
export async function scanTimeAlerts(now = new Date()) {
  try {
    const rows = await Reservation.find({
      status: { $in: ['booked', 'playing'] },
      startAt: { $lte: now },
      endAt: { $lte: new Date(now.getTime() + ENDING_SOON_MIN * MINUTE_MS) },
    })
      .select('table user customer endAt game')
      .populate('table', 'code')
      .populate('user', 'username')
      .lean();
    await Promise.all(
      rows.map((r) => {
        const overdue = r.endAt <= now;
        const mins = Math.max(1, Math.round(Math.abs(r.endAt - now) / MINUTE_MS));
        const table = r.table?.code ?? '-';
        return notify({
          type: overdue ? 'time_overdue' : 'time_ending',
          title: overdue ? `โต๊ะ ${table} เลยเวลาแล้ว` : `โต๊ะ ${table} ใกล้หมดเวลา`,
          message: overdue
            ? `${who(r)} เลยเวลามา ${mins} นาที ยังไม่คืนเกม`
            : `${who(r)} เหลือเวลาอีก ${mins} นาที (ถึง ${fmtLocal(r.endAt)})`,
          important: overdue,
          refs: { reservation: r._id, table: r.table?._id, game: r.game },
          actions: reservationActions(r._id),
          // ต่อเวลาแล้ว endAt เปลี่ยน → แจ้งใหม่ได้อีกครั้ง
          dedupeKey: `${overdue ? 'time_overdue' : 'time_ending'}:${r._id}:${new Date(r.endAt).getTime()}`,
        });
      }),
    );
    return rows.length;
  } catch (err) {
    logger.warn({ err }, 'scan time alerts failed');
    return 0;
  }
}

// ---------- ข้อความของเหตุการณ์จาก module อื่น ----------

export function notifyBookingNew(r) {
  return notify({
    type: 'booking_new',
    title: 'การจองใหม่',
    message: `${who(r)} จองโต๊ะ ${r.table?.code ?? '-'} ${fmtLocal(r.startAt)} (${r.players} คน${
      r.game?.name ? ` · ${r.game.name}` : ''
    })`,
    refs: { reservation: r._id, table: r.table?._id, game: r.game?._id },
    actions: [
      {
        key: 'confirm',
        label: 'ยืนยัน',
        method: 'PATCH',
        path: `/api/reservations/admin/${r._id}/confirm`,
      },
      { key: 'open', label: 'ดูการจอง', method: 'GET', path: `/api/reservations/${r._id}` },
    ],
  });
}

export function notifyBookingCancelled(r) {
  return notify({
    type: 'booking_cancelled',
    title: 'ยกเลิกการจอง',
    message: `${who(r)} ยกเลิกโต๊ะ ${r.table?.code ?? '-'} ${fmtLocal(r.startAt)}${
      r.cancelReason ? ` (${r.cancelReason})` : ''
    }`,
    refs: { reservation: r._id, table: r.table?._id, game: r.game?._id },
  });
}

const ASSIST_TOPIC_TH = {
  tutorial: 'ขอให้สอนเล่น',
  extension: 'สอบถามการต่อเวลา',
  game_issue: 'อุปกรณ์เกมมีปัญหา',
  other: 'ขอความช่วยเหลือ',
};

export function notifyAssist(a) {
  return notify({
    type: 'assist',
    title: `โต๊ะ ${a.table?.code ?? '-'} เรียกพนักงาน`,
    message: `${ASSIST_TOPIC_TH[a.topic] ?? a.topic}${a.note ? `: ${a.note}` : ''}`,
    important: true,
    refs: { assist: a._id, reservation: a.reservation?._id ?? a.reservation, table: a.table?._id },
    actions: [
      {
        key: 'acknowledge',
        label: 'รับเรื่อง',
        method: 'PATCH',
        path: `/api/assist/${a._id}`,
        body: { status: 'acknowledged' },
      },
    ],
  });
}

const itemName = (t) => (t.itemType === 'game' ? t.game?.name : `โต๊ะ ${t.table?.code}`) ?? '-';

export function notifyMaintenanceNew(t) {
  return notify({
    type: 'maintenance_new',
    title: t.reservation ? 'เกมชำรุดตอนคืน' : 'แจ้งซ่อมใหม่',
    message: `${itemName(t)}${t.itemType === 'game' && t.copies > 1 ? ` (${t.copies} กล่อง)` : ''}: ${t.title}`,
    important: t.priority === 'high' || Boolean(t.reservation),
    refs: { ticket: t._id, game: t.game?._id ?? t.game, table: t.table?._id ?? t.table },
    actions: [
      { key: 'open', label: 'ดูใบแจ้งซ่อม', method: 'GET', path: `/api/maintenance/${t._id}` },
    ],
  });
}

export async function notifyMaintenanceDone(t) {
  await resolveNotifications({ 'refs.ticket': t._id });
  return notify({
    type: 'maintenance_done',
    title: 'งานซ่อมเสร็จสิ้น',
    message: `${itemName(t)}: ${t.title}${t.resolution ? ` — ${t.resolution}` : ''}`,
    refs: { ticket: t._id, game: t.game?._id ?? t.game, table: t.table?._id ?? t.table },
  });
}

export function notifyBookingsAffected(t, affected) {
  if (!affected?.length) return null;
  const list = affected
    .slice(0, 3)
    .map((a) => `โต๊ะ ${a.table ?? '-'} ${fmtLocal(a.startAt)}`)
    .join(', ');
  return notify({
    type: 'booking_affected',
    title: `${affected.length} การจองไม่มีกล่องเกมให้`,
    message: `${itemName(t)} เสียหลังแจ้งซ่อม: ${list}${affected.length > 3 ? ' ...' : ''} — ติดต่อลูกค้า/เปลี่ยนเกม`,
    important: true,
    refs: { ticket: t._id, game: t.game?._id ?? t.game },
    actions: [
      { key: 'open', label: 'ดูใบแจ้งซ่อม', method: 'GET', path: `/api/maintenance/${t._id}` },
    ],
  });
}

// ---------- API ของหน้า Notification Center ----------

async function mutedOf(userId) {
  const pref = await NotificationPref.findOne({ user: userId }).lean();
  return pref?.muted ?? [];
}

function baseFilter(muted) {
  return muted.length ? { type: { $nin: muted } } : {};
}

async function counts(userId, muted) {
  const unreadFilter = { ...baseFilter(muted), readBy: { $ne: userId } };
  const [unread, important] = await Promise.all([
    Notification.countDocuments(unreadFilter),
    Notification.countDocuments({ ...unreadFilter, important: true }),
  ]);
  return { unread, important };
}

/** รายการแจ้งเตือน: filter = all | unread | important */
export async function list(user, { filter, type, page, limit }) {
  await scanTimeAlerts();
  const userId = user._id;
  const muted = await mutedOf(userId);
  const query = baseFilter(muted);
  if (type) query.type = muted.includes(type) ? { $in: [] } : type;
  if (filter === 'unread') query.readBy = { $ne: userId };
  if (filter === 'important') query.important = true;

  const today = toLocalDateString(new Date());
  const yesterday = toLocalDateString(new Date(Date.now() - 24 * 60 * MINUTE_MS));
  const [rows, total, c] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    counts(userId, muted),
  ]);
  const items = rows.map(({ readBy, dedupeKey: _dedupeKey, __v, ...n }) => {
    const day = toLocalDateString(n.createdAt);
    return {
      ...n,
      read: readBy.some((id) => String(id) === String(userId)),
      day, // YYYY-MM-DD เวลาไทย
      dayGroup: day === today ? 'today' : day === yesterday ? 'yesterday' : 'earlier',
    };
  });
  return { items, total, page, limit, ...c };
}

/** ตัวเลขบนไอคอนกระดิ่ง */
export async function unreadCount(user) {
  await scanTimeAlerts();
  return counts(user._id, await mutedOf(user._id));
}

export async function markRead(id, user) {
  const res = await Notification.updateOne({ _id: id }, { $addToSet: { readBy: user._id } });
  if (!res.matchedCount) throw notFound('notification not found');
  return { ok: true };
}

/** ปุ่ม "อ่านทั้งหมดแล้ว" */
export async function markAllRead(user) {
  const muted = await mutedOf(user._id);
  const res = await Notification.updateMany(
    { ...baseFilter(muted), readBy: { $ne: user._id } },
    { $addToSet: { readBy: user._id } },
  );
  return { ok: true, updated: res.modifiedCount };
}

export async function getPrefs(user) {
  return { muted: await mutedOf(user._id) };
}

export async function setPrefs(user, { muted }) {
  const pref = await NotificationPref.findOneAndUpdate(
    { user: new mongoose.Types.ObjectId(String(user._id)) },
    { $set: { muted: [...new Set(muted)] } },
    { upsert: true, new: true },
  ).lean();
  return { muted: pref.muted };
}
