// Game status lifecycle: available → in_use (ถึงเวลาเริ่ม) → available (คืนเกม)
import mongoose from 'mongoose';
import { Reservation } from '../../models/reservation.model.js';
import { Game } from '../../models/game.model.js';
import { MaintenanceTicket, OPEN_TICKET_STATUSES } from '../../models/maintenance.model.js';
import { logger } from '../../lib/logger.js';
import { conflictFilter, copiesOf } from './reservations.rules.js';

const { Types } = mongoose;

/** booked ที่ถึงเวลาเริ่มแล้ว → playing และเกมที่ผูกไว้ → in_use. คืนจำนวนที่เปลี่ยน */
export async function syncLifecycle(now = new Date()) {
  const due = await Reservation.find({ status: 'booked', startAt: { $lte: now } }).select(
    '_id game',
  );
  if (!due.length) return 0;

  await Reservation.updateMany(
    { _id: { $in: due.map((r) => r._id) }, status: 'booked' },
    { $set: { status: 'playing', startedAt: now } },
  );

  const gameIds = [...new Set(due.filter((r) => r.game).map((r) => r.game.toString()))];
  await Promise.all(gameIds.map((id) => refreshGameStatus(id)));
  return due.length;
}

/** จำนวนกล่องที่อยู่ระหว่างซ่อม (ใบแจ้งซ่อมเกมที่ยังไม่ resolved) → Map(gameId → จำนวน) */
export async function brokenCopies(gameIds) {
  const match = { itemType: 'game', status: { $in: OPEN_TICKET_STATUSES } };
  if (gameIds) match.game = { $in: gameIds.map((id) => new Types.ObjectId(String(id))) };
  const rows = await MaintenanceTicket.aggregate([
    { $match: match },
    { $group: { _id: '$game', n: { $sum: { $ifNull: ['$copies', 1] } } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

/** กล่องที่ใช้งานได้ = copies − กล่องที่ซ่อมอยู่ */
export async function usableCopies(game) {
  const broken = (await brokenCopies([game._id])).get(String(game._id)) ?? 0;
  return { copies: copiesOf(game), broken, usable: copiesOf(game) - broken };
}

/**
 * คำนวณสถานะเกมใหม่ (หลังเริ่มเล่น/คืน/ยกเลิก/ลบ/แจ้งซ่อม)
 * - maintenance = ซ่อมอยู่ครบทุกกล่อง
 * - in_use      = กล่องที่ใช้ได้ถูกเล่นอยู่ครบ
 * - available   = ยังมีกล่องว่าง
 * เกมที่ admin ตั้ง maintenance เอง (ไม่มีใบแจ้งซ่อม) จะไม่ถูกแตะ ยกเว้นเรียกจาก module ซ่อมบำรุง
 */
export async function refreshGameStatus(gameId, { fromMaintenance = false } = {}) {
  if (!gameId) return;
  const [game, playing] = await Promise.all([
    Game.findById(gameId).select('copies status').lean(),
    Reservation.countDocuments({ game: gameId, status: 'playing' }),
  ]);
  if (!game) return;
  const { broken, usable } = await usableCopies(game);
  if (game.status === 'maintenance' && broken === 0 && !fromMaintenance) return;
  let status = 'available';
  if (usable <= 0) status = 'maintenance';
  else if (playing >= usable) status = 'in_use';
  await Game.updateOne({ _id: gameId }, { $set: { status } });
}

/** reservation ทั้งหมดที่ชนกับช่วงเวลา (ใช้ทำ availability / floor plan) */
export function findBusy({ startAt, endAt }, now = new Date()) {
  return Reservation.find(conflictFilter({ startAt, endAt }, now))
    .select('table game status startAt endAt players')
    .populate('game', 'name thumbnail')
    .lean();
}

/** job เบื้องหลัง: sync ทุก ๆ intervalMs (เรียกจาก index.js เท่านั้น ไม่รันตอน test) */
export function startLifecycleJob(intervalMs = 60_000) {
  const tick = () =>
    syncLifecycle()
      .then((n) => n && logger.info({ started: n }, 'reservations started'))
      .catch((err) => logger.error({ err }, 'lifecycle sync failed'));
  tick();
  const timer = setInterval(tick, intervalMs);
  timer.unref();
  return timer;
}
