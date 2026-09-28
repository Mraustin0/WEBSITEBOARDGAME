import mongoose from 'mongoose';
import { Reservation } from '../../models/reservation.model.js';
import { Table } from '../../models/table.model.js';
import { Game } from '../../models/game.model.js';
import { User } from '../../models/user.model.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { localDayRange, localRange } from '../../lib/time.js';
import {
  bookingWindowError,
  calcCheckout,
  calcPrice,
  computeEnd,
  conflictFilter,
  durationError,
  operatingHoursError,
  PACKAGES,
  RULES,
} from './reservations.rules.js';
import { getRules } from '../settings/settings.service.js';
import { openDamageTicket } from '../maintenance/maintenance.service.js';
import { findBusy, refreshGameStatus, syncLifecycle } from './reservations.lifecycle.js';

const POPULATE = [
  { path: 'table', select: 'code name zone capacity status extraPerHour' },
  { path: 'game', select: 'name thumbnail minPlayers maxPlayers status' },
  { path: 'user', select: 'username email' },
  { path: 'createdBy', select: 'username' },
  { path: 'returnedBy', select: 'username' },
];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
  { table: tableId, game: gameId, players, startAt, durationHours, package: pkg = 'hourly' },
  { userId, excludeId, staff = false, now = new Date() },
) {
  const rules = await getRules();
  const windowErr = bookingWindowError(startAt, now, rules);
  if (windowErr) throw badRequest(windowErr);
  const durErr = durationError(durationHours, rules);
  if (durErr) throw badRequest(durErr);
  const endAtCheck = computeEnd(startAt, durationHours);
  // admin เปิดโต๊ะนอกเวลาได้ (เช่น ลูกค้าประจำ) — จำกัดเฉพาะสมาชิกจองเอง
  const hoursErr = staff ? null : operatingHoursError(startAt, endAtCheck, rules.OPERATING);
  if (hoursErr) throw badRequest(hoursErr);

  const [table, game] = await Promise.all([loadTable(tableId), loadGame(gameId)]);

  const maxSeats = table.capacity + (staff ? rules.EXTRA_SEATS : 0);
  if (players > maxSeats) {
    throw badRequest(`table ${table.code} seats up to ${maxSeats} players`);
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

  const price = calcPrice({
    players,
    durationHours,
    tableExtraPerHour: table.extraPerHour,
    pkg,
    rules,
  });
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
  past: {
    filter: { status: { $in: ['completed', 'cancelled', 'no_show'] } },
    sort: { startAt: -1 },
  },
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
    package: patch.package ?? r.price?.package ?? 'hourly',
  };
  if (next.package === 'flat3h' && next.durationHours !== RULES.FLAT_HOURS) {
    throw badRequest(`flat3h package must be ${RULES.FLAT_HOURS} hours`);
  }
  const { table, game, endAt, price } = await validateBooking(next, {
    userId: r.user,
    excludeId: r._id,
    staff: isAdmin(user),
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

function assertPlaying(r) {
  if (r.status !== 'playing') {
    throw conflict(
      r.status === 'booked'
        ? 'reservation has not started yet'
        : `reservation is already ${r.status}`,
    );
  }
}

async function billFor(r, now = new Date()) {
  return calcCheckout({
    startedAt: r.startedAt ?? r.startAt,
    now,
    durationHours: r.durationHours,
    players: r.players,
    tableExtraPerHour: r.price?.tableExtraPerHour ?? 0,
    perPersonHour: r.price?.perPersonHour,
    bookedTotal: r.price.total,
    rules: await getRules(),
  });
}

/** ดูยอดก่อนเช็คบิล (ยังไม่บันทึก) — ใช้แสดงใน Checkout modal */
export async function checkoutPreview(id, user) {
  await syncLifecycle();
  const r = await loadOwned(id, user);
  assertPlaying(r);
  await r.populate(POPULATE);
  return { reservation: r, bill: await billFor(r) };
}

/**
 * กด "เล่นเสร็จแล้ว / คืนเกม" (สมาชิกเจ้าของ หรือ admin ที่เคาน์เตอร์)
 * - บันทึกเวลาเล่นจริง + ค่าเล่นเกินเวลา
 * - condition = damaged → เกมถูกตั้งเป็น maintenance อัตโนมัติ
 * - admin ส่ง paymentMethod มาด้วย = เก็บเงินพร้อมปิดบิล
 */
export async function returnGame(
  id,
  user,
  { condition = 'good', damageNote = '', paymentMethod } = {},
) {
  await syncLifecycle();
  const r = await loadOwned(id, user);
  assertPlaying(r);

  const now = new Date();
  const bill = await billFor(r, now);
  Object.assign(r, {
    status: 'completed',
    returnedAt: now,
    returnedBy: user._id,
    checkout: {
      actualMinutes: bill.actualMinutes,
      overtimeHours: bill.overtimeHours,
      overtimeCharge: bill.overtimeCharge,
      total: bill.total,
      condition,
      damageNote,
      inspectedBy: isAdmin(user) ? user._id : undefined,
    },
  });
  if (paymentMethod && isAdmin(user)) {
    r.payment = {
      status: 'paid',
      method: paymentMethod,
      amount: bill.total,
      paidAt: now,
      receivedBy: user._id,
    };
  }
  await r.save();

  if (r.game && condition === 'damaged') {
    // เปิดใบแจ้งซ่อมอัตโนมัติ → เกมเป็น maintenance จนกว่าจะปิดงานซ่อม
    await openDamageTicket({ reservation: r, note: damageNote, reportedBy: user._id });
  } else {
    await refreshGameStatus(r.game);
  }
  return r.populate(POPULATE);
}

/** เปลี่ยน/เลือกเกมให้การจอง — ใช้ได้ทั้งตอน booked และระหว่างเล่น (walk-in ที่เริ่มโดยยังไม่เลือกเกม) */
export async function setGame(id, user, gameId) {
  await syncLifecycle();
  const r = await loadOwned(id, user);
  if (r.status === 'booked') return update(id, user, { game: gameId });
  assertPlaying(r);

  const oldGame = r.game;
  let game = null;
  if (gameId) {
    game = await loadGame(gameId);
    if (r.players < game.minPlayers || r.players > game.maxPlayers) {
      throw badRequest(`${game.name} needs ${game.minPlayers}-${game.maxPlayers} players`);
    }
    const now = new Date();
    const clash = await Reservation.exists({
      ...conflictFilter({ startAt: now, endAt: r.endAt > now ? r.endAt : now }, now),
      _id: { $ne: r._id },
      game: game._id,
    });
    if (clash) throw conflict(`${game.name} is being played or booked right now`);
  }

  r.game = game?._id ?? null;
  await r.save();
  if (oldGame && String(oldGame) !== String(r.game)) await refreshGameStatus(oldGame);
  if (game) await refreshGameStatus(game._id);
  return Reservation.findById(r._id).populate(POPULATE);
}

/** admin รับชำระเงิน (กรณีคืนเกมแล้วแต่ยังไม่จ่าย) */
export async function pay(id, admin, method) {
  const r = await Reservation.findById(id);
  if (!r) throw notFound('reservation not found');
  if (r.status !== 'completed') throw conflict('check out (return the game) before payment');
  if (r.payment?.status === 'paid') throw conflict('already paid');
  r.payment = {
    status: 'paid',
    method,
    amount: r.checkout?.total ?? r.price.total,
    paidAt: new Date(),
    receivedBy: admin._id,
  };
  await r.save();
  return r.populate(POPULATE);
}

// ---------- public ----------

/** เลือกช่วงเวลา → ดูว่าโต๊ะไหน / เกมไหนว่าง */
export async function availability({ startAt, durationHours, players }) {
  const now = new Date();
  await syncLifecycle(now);
  const endAt = computeEnd(startAt, durationHours);
  const rules = await getRules();
  const windowErr =
    bookingWindowError(startAt, now, rules) ||
    durationError(durationHours, rules) ||
    operatingHoursError(startAt, endAt, rules.OPERATING);

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

/**
 * Admin เปิดโต๊ะ walk-in / เพิ่มการจองแทนลูกค้า
 * ต่างจากสมาชิกจองเอง: ไม่ส่ง startAt = เริ่มทันที, ใส่ชื่อ/เบอร์ลูกค้าที่ไม่มีบัญชีได้,
 * เสริมเก้าอี้เกิน capacity ได้ RULES.EXTRA_SEATS ที่
 */
export async function adminCreate(admin, body) {
  const now = new Date();
  await syncLifecycle(now);
  const startAt = body.startAt ?? now;
  const walkIn = startAt.getTime() <= now.getTime() + 5 * 60 * 1000;

  if (body.user && !(await User.exists({ _id: body.user }))) throw notFound('member not found');

  const { table, game, endAt, price } = await validateBooking(
    { ...body, startAt },
    { userId: body.user, staff: true, now },
  );
  const r = await Reservation.create({
    user: body.user ?? null,
    customer: body.customer,
    source: walkIn ? 'walk_in' : 'admin',
    createdBy: admin._id,
    table: table._id,
    game: game?._id ?? null,
    players: body.players,
    startAt,
    endAt,
    durationHours: body.durationHours,
    price,
    note: body.note,
  });
  await syncLifecycle();
  return Reservation.findById(r._id).populate(POPULATE);
}

export async function adminList({
  date,
  from,
  to,
  status,
  table,
  zone,
  user,
  game,
  source,
  payment,
  q,
  page,
  limit,
}) {
  await syncLifecycle();
  const query = {};
  if (date) {
    const { start, end } = localDayRange(date);
    query.startAt = { $gte: start, $lt: end };
  } else if (from || to) {
    const { start, end } = localRange(from ?? to, to ?? from);
    query.startAt = { $gte: start, $lt: end };
  }
  if (status) query.status = status;
  if (table) query.table = new mongoose.Types.ObjectId(table);
  if (zone) {
    const ids = await Table.find({ zone }).distinct('_id');
    query.table = table ? query.table : { $in: ids };
  }
  if (user) query.user = new mongoose.Types.ObjectId(user);
  if (game) query.game = new mongoose.Types.ObjectId(game);
  if (source) query.source = source;
  if (payment === 'paid') query['payment.status'] = 'paid';
  if (payment === 'unpaid') query['payment.status'] = { $ne: 'paid' };
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    const users = await User.find({ $or: [{ username: rx }, { email: rx }] }).distinct('_id');
    query.$or = [{ 'customer.name': rx }, { 'customer.phone': rx }, { user: { $in: users } }];
  }

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

export async function rules() {
  const r = await getRules();
  return { ...r, PACKAGES };
}

/** admin กด "ลูกค้าไม่มา" — ปล่อยโต๊ะ/เกมคืน และนับสถิติ no-show ของสมาชิก */
export async function markNoShow(id, admin) {
  await syncLifecycle();
  const r = await Reservation.findById(id);
  if (!r) throw notFound('reservation not found');
  if (!['booked', 'playing'].includes(r.status)) {
    throw conflict(`cannot mark a ${r.status} reservation as no-show`);
  }
  const wasPlaying = r.status === 'playing';
  Object.assign(r, { status: 'no_show', noShowAt: new Date(), cancelledBy: admin._id });
  await r.save();
  if (wasPlaying) await refreshGameStatus(r.game);
  return r.populate(POPULATE);
}
