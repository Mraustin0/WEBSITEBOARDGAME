// Game status lifecycle: available → in_use (ถึงเวลาเริ่ม) → available (คืนเกม)
import { Reservation } from '../../models/reservation.model.js';
import { Game } from '../../models/game.model.js';
import { logger } from '../../lib/logger.js';
import { conflictFilter, copiesOf } from './reservations.rules.js';

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

/**
 * คำนวณสถานะเกมใหม่ (หลังเริ่มเล่น/คืน/ยกเลิก/ลบ) — ไม่แตะเกมที่ maintenance
 * in_use = ทุกกล่องกำลังถูกเล่นอยู่ (เกมที่มีหลายกล่องยัง available ถ้าเหลือกล่อง)
 */
export async function refreshGameStatus(gameId) {
  if (!gameId) return;
  const [game, playing] = await Promise.all([
    Game.findById(gameId).select('copies status').lean(),
    Reservation.countDocuments({ game: gameId, status: 'playing' }),
  ]);
  if (!game || game.status === 'maintenance') return;
  await Game.updateOne(
    { _id: gameId, status: { $ne: 'maintenance' } },
    { $set: { status: playing >= copiesOf(game) ? 'in_use' : 'available' } },
  );
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
