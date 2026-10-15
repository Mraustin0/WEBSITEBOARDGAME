// ติดตามการซ่อมบำรุง: เปิดใบแจ้งซ่อม → ของถูกปิดใช้งาน, ซ่อมเสร็จ → เปิดใช้งานอัตโนมัติ
import mongoose from 'mongoose';
import {
  MaintenanceTicket,
  OPEN_TICKET_STATUSES,
  TICKET_STATUSES,
} from '../../models/maintenance.model.js';
import { Game } from '../../models/game.model.js';
import { Table } from '../../models/table.model.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { Reservation } from '../../models/reservation.model.js';
import { copiesOf, overbooked } from '../reservations/reservations.rules.js';
import {
  brokenCopies,
  refreshGameStatus,
  syncLifecycle,
  usableCopies,
} from '../reservations/reservations.lifecycle.js';
import {
  notifyBookingsAffected,
  notifyMaintenanceDone,
  notifyMaintenanceNew,
  resolveNotifications,
} from '../notifications/notifications.service.js';

const POPULATE = [
  { path: 'game', select: 'name thumbnail status copies' },
  { path: 'table', select: 'code zone status' },
  { path: 'reportedBy', select: 'username' },
  { path: 'resolvedBy', select: 'username' },
  { path: 'reservation', select: 'startAt endAt players customer' },
];

const itemKey = (t) => (t.itemType === 'game' ? { game: t.game } : { table: t.table });

/**
 * ปิดใช้งานของ: โต๊ะ → closed
 * เกม → ปิดเฉพาะจำนวนกล่องที่แจ้ง (สถานะเกมเป็น maintenance เมื่อซ่อมครบทุกกล่อง)
 */
async function lockItem(t) {
  if (t.itemType === 'game') {
    await refreshGameStatus(t.game); // เพิ่มกล่องที่ซ่อม → สถานะเข้มขึ้นได้อย่างเดียว
  } else {
    await Table.updateOne({ _id: t.table }, { $set: { status: 'closed' } });
  }
}

/** เปิดใช้งานคืน ถ้าไม่มีใบแจ้งซ่อมอื่นของของชิ้นนี้ค้างอยู่ */
async function releaseItem(t, { deleted = false } = {}) {
  if (t.itemType === 'game') {
    // ใบที่ถูกลบไปแล้วหาป้ายใน DB ไม่เจอ → ส่งป้ายของใบนั้นไปเอง
    await refreshGameStatus(t.game, { release: true, ticketDriven: deleted && t.lockedGame });
    return;
  }
  const stillOpen = await MaintenanceTicket.exists({
    ...itemKey(t),
    _id: { $ne: t._id },
    status: { $in: OPEN_TICKET_STATUSES },
  });
  if (stillOpen) return;
  await Table.updateOne({ _id: t.table }, { $set: { status: 'active' } });
}

/**
 * การจองที่ไม่มีกล่องให้แล้วหลังแจ้งซ่อม — ส่งกลับให้ admin ติดต่อลูกค้า / เปลี่ยนเกม
 * (ไม่บล็อกการแจ้งซ่อม เพราะของเสียจริงต้องแจ้งได้เสมอ)
 */
async function affectedReservations(gameId) {
  const now = new Date();
  await syncLifecycle(now);
  const game = await Game.findById(gameId).select('copies').lean();
  if (!game) return [];
  const { usable } = await usableCopies(game);
  const rows = await Reservation.find({
    game: gameId,
    status: { $in: ['booked', 'playing'] },
    $or: [{ endAt: { $gt: now } }, { status: 'playing' }],
  })
    .select('startAt endAt status players customer user table')
    .populate('table', 'code zone')
    .populate('user', 'username email')
    .lean();
  return overbooked(rows, usable, now).map((r) => ({
    _id: r._id,
    status: r.status,
    startAt: r.startAt,
    endAt: r.endAt,
    players: r.players,
    table: r.table?.code ?? null,
    member: r.user ? { username: r.user.username, email: r.user.email } : null,
    customer: r.customer ?? null,
  }));
}

/** ใบแจ้งซ่อม + รายการจองที่ได้รับผลกระทบ (เฉพาะเกม) */
async function withAffected(t) {
  const doc = (await findById(t._id)).toObject();
  doc.affectedReservations =
    t.itemType === 'game' && t.status !== 'resolved' ? await affectedReservations(t.game) : [];
  return doc;
}

/** แจ้งซ่อมเกินจำนวนกล่องที่ยังดีอยู่ไม่ได้ */
async function assertCopiesAvailable(gameId, copies, excludeTicketId) {
  const game = await Game.findById(gameId).select('name copies').lean();
  if (!game) throw notFound('game not found');
  let broken = (await brokenCopies([gameId])).get(String(gameId)) ?? 0;
  if (excludeTicketId) {
    const self = await MaintenanceTicket.findById(excludeTicketId).select('copies status').lean();
    if (self && OPEN_TICKET_STATUSES.includes(self.status)) broken -= self.copies ?? 1;
  }
  const left = copiesOf(game) - broken;
  if (copies > left) {
    throw badRequest(`${game.name} has only ${left} of ${copiesOf(game)} copies not under repair`);
  }
}

export async function list({ status, itemType, game, table, priority, page, limit }) {
  const query = {};
  if (status) query.status = status;
  if (itemType) query.itemType = itemType;
  if (game) query.game = new mongoose.Types.ObjectId(game);
  if (table) query.table = new mongoose.Types.ObjectId(table);
  if (priority) query.priority = priority;
  const sort = status === 'resolved' ? { resolvedAt: -1 } : { createdAt: -1 };
  const [items, total] = await Promise.all([
    MaintenanceTicket.find(query)
      .populate(POPULATE)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    MaintenanceTicket.countDocuments(query),
  ]);
  return { items, total, page, limit };
}

/** การ์ดสรุปบนสุดของหน้า: pending / in_progress / resolved + ค่าซ่อมรวม */
export async function summary() {
  const rows = await MaintenanceTicket.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 }, cost: { $sum: '$cost' } } },
  ]);
  const out = { total: 0, totalCost: 0 };
  for (const s of TICKET_STATUSES) {
    const r = rows.find((x) => x._id === s);
    out[s] = r?.count ?? 0;
    out.total += out[s];
    out.totalCost += r?.cost ?? 0;
  }
  return out;
}

export async function findById(id) {
  const t = await MaintenanceTicket.findById(id).populate(POPULATE);
  if (!t) throw notFound('ticket not found');
  return t;
}

export async function create(body, userId) {
  const { itemType } = body;
  if (itemType === 'game') {
    if (!body.game) throw badRequest('game is required for itemType=game');
    await assertCopiesAvailable(body.game, body.copies ?? 1);
  } else {
    if (!body.table) throw badRequest('table is required for itemType=table');
    const table = await Table.findById(body.table);
    if (!table) throw notFound('table not found');
  }
  const t = await MaintenanceTicket.create({
    ...body,
    game: itemType === 'game' ? body.game : null,
    table: itemType === 'table' ? body.table : null,
    copies: itemType === 'game' ? (body.copies ?? 1) : 1,
    reportedBy: userId,
  });
  await lockItem(t);
  const doc = await withAffected(t);
  await notifyMaintenanceNew(doc);
  await notifyBookingsAffected(doc, doc.affectedReservations);
  return doc;
}

/** เรียกจาก reservations: คืนเกมแล้วเลือกสภาพ "ชำรุด" */
export async function openDamageTicket({ reservation, note, reportedBy }) {
  const game = await Game.findById(reservation.game).select('name');
  const t = await MaintenanceTicket.create({
    itemType: 'game',
    game: reservation.game,
    title: `${game?.name ?? 'Game'}: damaged on return`,
    description: note,
    priority: 'medium',
    reservation: reservation._id,
    reportedBy,
  });
  await lockItem(t);
  const doc = await withAffected(t);
  await notifyMaintenanceNew(doc);
  await notifyBookingsAffected(doc, doc.affectedReservations);
  return t;
}

export async function update(id, patch, userId) {
  const t = await MaintenanceTicket.findById(id);
  if (!t) throw notFound('ticket not found');
  const prev = t.status;
  const prevCopies = t.copies ?? 1;
  const reopening = prev === 'resolved' && patch.status && patch.status !== 'resolved';
  if (t.itemType === 'game' && (patch.copies !== undefined || reopening)) {
    const willBeOpen = patch.status ? patch.status !== 'resolved' : prev !== 'resolved';
    if (willBeOpen) await assertCopiesAvailable(t.game, patch.copies ?? t.copies ?? 1, t._id);
  }

  for (const k of ['title', 'description', 'priority', 'cost', 'resolution']) {
    if (patch[k] !== undefined) t[k] = patch[k];
  }
  if (patch.copies !== undefined && t.itemType === 'game') t.copies = patch.copies; // โต๊ะไม่มีจำนวนกล่อง
  if (patch.status && patch.status !== prev) {
    t.status = patch.status;
    if (patch.status === 'in_progress' && !t.startedAt) t.startedAt = new Date();
    if (patch.status === 'resolved') {
      t.resolvedAt = new Date();
      t.resolvedBy = userId;
    } else {
      t.resolvedAt = undefined;
      t.resolvedBy = undefined;
    }
  }
  await t.save();

  const nowOpen = t.status !== 'resolved';
  if (prev !== 'resolved' && !nowOpen) {
    await releaseItem(t); // ซ่อมเสร็จ
  } else if (prev === 'resolved' && nowOpen) {
    await lockItem(t); // เปิดงานซ่อมใหม่
  } else if (nowOpen && t.itemType === 'game' && t.copies !== prevCopies) {
    if (t.copies > prevCopies) await lockItem(t);
    else await releaseItem(t); // ลดจำนวนกล่องที่เสีย
  }
  const doc = await withAffected(t);
  if (prev !== 'resolved' && !nowOpen) await notifyMaintenanceDone(doc);
  else if (nowOpen && (t.copies > prevCopies || prev === 'resolved')) {
    await notifyBookingsAffected(doc, doc.affectedReservations);
  }
  return doc;
}

export async function remove(id) {
  const t = await MaintenanceTicket.findByIdAndDelete(id).select('+lockedGame');
  if (!t) throw notFound('ticket not found');
  if (t.status !== 'resolved') await releaseItem(t, { deleted: true });
  await resolveNotifications({ 'refs.ticket': t._id });
  t.lockedGame = undefined;
  return t;
}
