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
import { refreshGameStatus } from '../reservations/reservations.lifecycle.js';

const POPULATE = [
  { path: 'game', select: 'name thumbnail status' },
  { path: 'table', select: 'code zone status' },
  { path: 'reportedBy', select: 'username' },
  { path: 'resolvedBy', select: 'username' },
  { path: 'reservation', select: 'startAt endAt players customer' },
];

const itemKey = (t) => (t.itemType === 'game' ? { game: t.game } : { table: t.table });

/** ปิดใช้งานของ: เกม → maintenance, โต๊ะ → closed */
async function lockItem(t) {
  if (t.itemType === 'game') {
    await Game.updateOne({ _id: t.game }, { $set: { status: 'maintenance' } });
  } else {
    await Table.updateOne({ _id: t.table }, { $set: { status: 'closed' } });
  }
}

/** เปิดใช้งานคืน ถ้าไม่มีใบแจ้งซ่อมอื่นของของชิ้นนี้ค้างอยู่ */
async function releaseItem(t) {
  const stillOpen = await MaintenanceTicket.exists({
    ...itemKey(t),
    _id: { $ne: t._id },
    status: { $in: OPEN_TICKET_STATUSES },
  });
  if (stillOpen) return;
  if (t.itemType === 'game') {
    await Game.updateOne({ _id: t.game, status: 'maintenance' }, { $set: { status: 'available' } });
    await refreshGameStatus(t.game); // ถ้ามีโต๊ะกำลังเล่นอยู่ → in_use
  } else {
    await Table.updateOne({ _id: t.table }, { $set: { status: 'active' } });
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
    const game = await Game.findById(body.game);
    if (!game) throw notFound('game not found');
  } else {
    if (!body.table) throw badRequest('table is required for itemType=table');
    const table = await Table.findById(body.table);
    if (!table) throw notFound('table not found');
  }
  const t = await MaintenanceTicket.create({
    ...body,
    game: itemType === 'game' ? body.game : null,
    table: itemType === 'table' ? body.table : null,
    reportedBy: userId,
  });
  await lockItem(t);
  return findById(t._id);
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
  return t;
}

export async function update(id, patch, userId) {
  const t = await MaintenanceTicket.findById(id);
  if (!t) throw notFound('ticket not found');
  const prev = t.status;

  for (const k of ['title', 'description', 'priority', 'cost', 'resolution']) {
    if (patch[k] !== undefined) t[k] = patch[k];
  }
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

  if (prev !== 'resolved' && t.status === 'resolved') await releaseItem(t);
  if (prev === 'resolved' && t.status !== 'resolved') await lockItem(t); // เปิดงานซ่อมใหม่
  return findById(t._id);
}

export async function remove(id) {
  const t = await MaintenanceTicket.findByIdAndDelete(id);
  if (!t) throw notFound('ticket not found');
  if (t.status !== 'resolved') await releaseItem(t);
  return t;
}
