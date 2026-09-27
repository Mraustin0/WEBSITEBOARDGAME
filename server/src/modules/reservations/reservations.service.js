import mongoose from 'mongoose';
import { Reservation } from '../../models/reservation.model.js';
import { Table } from '../../models/table.model.js';
import { Game } from '../../models/game.model.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { localDayRange } from '../../lib/time.js';
import {
  bookingWindowError,
  calcPrice,
  computeEnd,
  conflictFilter,
  RULES,
} from './reservations.rules.js';
import { findBusy, refreshGameStatus, syncLifecycle } from './reservations.lifecycle.js';

const POPULATE = [
  { path: 'table', select: 'code name zone capacity status extraPerHour' },
  { path: 'game', select: 'name thumbnail minPlayers maxPlayers status' },
  { path: 'user', select: 'username email' },
];

const isAdmin = (user) => user.role === 'admin';
const sameId = (a, b) => String(a?._id ?? a) === String(b?._id ?? b);

async function loadOwned(id, user) {
  const r = await Reservation.findById(id);
  if (!r) throw notFound('reservation not found');
  if (!isAdmin(user) && !sameId(r.user, user._id)) throw notFound('reservation not found');
  return r;
}

async function loadTable(id) {
  const table = await Table.findById(id);
  if (!table) throw notFound('table not found');
  if (table.status !== 'active') throw conflict(`table ${table.code} is closed`);
  return table;
}

async function loadGame(id) {
  if (!id) return null;
  const game = await Game.findById(id);
  if (!game) throw notFound('game not found');
  if (game.status === 'maintenance') throw conflict(`${game.name} is under maintenance`);
  return game;
}

/**
 * ตรวจทุกกฎของการจอง แล้วคืน { table, game, endAt, price }
 * ใช้ร่วมกันทั้ง create / update / quote
 */
async function validateBooking(
  { table: tableId, game: gameId, players, startAt, durationHours },
  { userId, excludeId, now = new Date() },
) {
  const windowErr = bookingWindowError(startAt, now);
  if (windowErr) throw badRequest(windowErr);

  const [table, game] = await Promise.all([loadTable(tableId), loadGame(gameId)]);

  if (players > table.capacity) {
    throw badRequest(`table ${table.code} seats up to ${table.capacity} players`);
  }
  if (game && (players < game.minPlayers || players > game.maxPlayers)) {
    throw badRequest(`${game.name} needs ${game.minPlayers}-${game.maxPlayers} players`);
  }

  const endAt = computeEnd(startAt, durationHours);
  const base = conflictFilter({ startAt, endAt }, now);
  if (excludeId) base._id = { $ne: excludeId };

  const [tableClash, gameClash, userClash] = await Promise.all([
    Reservation.exists({ ...base, table: table._id }),
    game ? Reservation.exists({ ...base, game: game._id }) : null,
    userId ? Reservation.exists({ ...base, user: userId }) : null,
  ]);
  if (tableClash) throw conflict(`table ${table.code} is already booked for this time`);
  if (gameClash) throw conflict(`${game.name} is already booked for this time`);
  if (userClash) throw conflict('you already have a reservation overlapping this time');

  const price = calcPrice({ players, durationHours, tableExtraPerHour: table.extraPerHour });
  return { table, game, endAt, price };
}

// ---------- member ----------

export async function quote(userId, body) {
  await syncLifecycle();
  const { table, game, endAt, price } = await validateBooking(body, { userId });
  return {
    table: { _id: table._id, code: table.code, zone: table.zone },
    game: game ? { _id: game._id, name: game.name } : null,
    startAt: body.startAt,
    endAt,
    durationHours: body.durationHours,
    price,
  };
}

export async function create(userId, body) {
  await syncLifecycle();
  const { table, game, endAt, price } = await validateBooking(body, { userId });
  const r = await Reservation.create({
    user: userId,
    table: table._id,
    game: game?._id ?? null,
    players: body.players,
    startAt: body.startAt,
    endAt,
    durationHours: body.durationHours,
    price,
    note: body.note,
  });
  await syncLifecycle(); // ถ้าจองแบบเริ่มเลย (walk-in) จะเปลี่ยนเป็น playing ทันที
  return Reservation.findById(r._id).populate(POPULATE);
}

const SCOPES = {
  active: { filter: { status: 'playing' }, sort: { startAt: 1 } },
  upcoming: { filter: { status: 'booked' }, sort: { startAt: 1 } },
  past: { filter: { status: { $in: ['completed', 'cancelled'] } }, sort: { startAt: -1 } },
  all: { filter: {}, sort: { startAt: -1 } },
};

export async function listMine(userId, { scope, page, limit }) {
  await syncLifecycle();
  const { filter, sort } = SCOPES[scope];
  const query = { user: userId, ...filter };
  const [items, total] = await Promise.all([
    Reservation.find(query)
      .populate(POPULATE)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Reservation.countDocuments(query),
  ]);
  return { items, total, page, limit };
}

export async function getById(id, user) {
  await syncLifecycle();
  const r = await loadOwned(id, user);
  return r.populate(POPULATE);
}

export async function update(id, user, patch) {
  await syncLifecycle();
  const r = await loadOwned(id, user);
  if (r.status !== 'booked') throw conflict(`cannot edit a ${r.status} reservation`);

  const next = {
    table: patch.table ?? r.table,
    game: patch.game !== undefined ? patch.game : r.game,
    players: patch.players ?? r.players,
    startAt: patch.startAt ?? r.startAt,
    durationHours: patch.durationHours ?? r.durationHours,
  };
  const { table, game, endAt, price } = await validateBooking(next, {
    userId: r.user,
    excludeId: r._id,
  });

  Object.assign(r, {
    table: table._id,
    game: game?._id ?? null,
    players: next.players,
    startAt: next.startAt,
    durationHours: next.durationHours,
    endAt,
    price,
  });
  if (patch.note !== undefined) r.note = patch.note;
  await r.save();
  await syncLifecycle();
  return Reservation.findById(r._id).populate(POPULATE);
}

export async function cancel(id, user, reason = '') {
  await syncLifecycle();
  const r = await loadOwned(id, user);
  const admin = isAdmin(user);
  if (r.status === 'playing' && !admin) {
    throw conflict('reservation already started — return the game instead');
  }
  if (!['booked', 'playing'].includes(r.status)) {
    throw conflict(`cannot cancel a ${r.status} reservation`);
  }
  const wasPlaying = r.status === 'playing';
  Object.assign(r, {
    status: 'cancelled',
    cancelledAt: new Date(),
    cancelledBy: user._id,
    cancelReason: reason,
  });
  await r.save();
  if (wasPlaying) await refreshGameStatus(r.game);
  return r.populate(POPULATE);
}

/** กด "เล่นเสร็จแล้ว / คืนเกม" (สมาชิกเจ้าของ หรือ admin ที่เคาน์เตอร์) */
export async function returnGame(id, user) {
  await syncLifecycle();
  const r = await loadOwned(id, user);
  if (r.status !== 'playing') {
    throw conflict(
      r.status === 'booked'
        ? 'reservation has not started yet'
        : `reservation is already ${r.status}`,
    );
  }
  Object.assign(r, { status: 'completed', returnedAt: new Date(), returnedBy: user._id });
  await r.save();
  await refreshGameStatus(r.game);
  return r.populate(POPULATE);
}

// ---------- public ----------

/** เลือกช่วงเวลา → ดูว่าโต๊ะไหน / เกมไหนว่าง */
export async function availability({ startAt, durationHours, players }) {
  const now = new Date();
  await syncLifecycle(now);
  const endAt = computeEnd(startAt, durationHours);
  const windowErr = bookingWindowError(startAt, now);

  const [busy, tables, games] = await Promise.all([
    findBusy({ startAt, endAt }, now),
    Table.find().sort({ zone: 1, code: 1 }).lean(),
    Game.find()
      .select('name thumbnail minPlayers maxPlayers playtimeMin status')
      .sort({ name: 1 })
      .lean(),
  ]);
  const busyTables = new Set(busy.map((r) => String(r.table)));
  const busyGames = new Set(busy.filter((r) => r.game).map((r) => String(r.game._id)));

  const tableReason = (t) => {
    if (t.status !== 'active') return 'closed';
    if (busyTables.has(String(t._id))) return 'booked';
    if (players && players > t.capacity) return 'too_small';
    return null;
  };
  const gameReason = (g) => {
    if (g.status === 'maintenance') return 'maintenance';
    if (busyGames.has(String(g._id))) return 'booked';
    if (players && (players < g.minPlayers || players > g.maxPlayers)) return 'player_count';
    return null;
  };

  return {
    startAt,
    endAt,
    durationHours,
    bookable: !windowErr,
    reason: windowErr,
    tables: tables.map((t) => {
      const reason = tableReason(t);
      return { ...t, available: !reason && !windowErr, reason };
    }),
    games: games.map((g) => {
      const reason = gameReason(g);
      return { ...g, available: !reason && !windowErr, reason };
    }),
  };
}

// ---------- admin ----------

export async function adminList({ date, status, table, page, limit }) {
  await syncLifecycle();
  const query = {};
  if (date) {
    const { start, end } = localDayRange(date);
    query.startAt = { $gte: start, $lt: end };
  }
  if (status) query.status = status;
  if (table) query.table = new mongoose.Types.ObjectId(table);

  const [items, total] = await Promise.all([
    Reservation.find(query)
      .populate(POPULATE)
      .sort({ startAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Reservation.countDocuments(query),
  ]);
  return { items, total, page, limit };
}

export async function adminRemove(id) {
  const r = await Reservation.findByIdAndDelete(id);
  if (!r) throw notFound('reservation not found');
  if (r.status === 'playing') await refreshGameStatus(r.game);
  return r;
}

export const rules = () => ({ ...RULES });
