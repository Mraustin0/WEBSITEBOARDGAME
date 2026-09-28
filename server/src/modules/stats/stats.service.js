// Dashboard / สถิติ — ใช้ MongoDB aggregation pipeline
import { Reservation } from '../../models/reservation.model.js';
import { Table } from '../../models/table.model.js';
import { Game } from '../../models/game.model.js';
import { badRequest } from '../../lib/errors.js';
import {
  TZ,
  addDays,
  eachLocalDate,
  localDayRange,
  localRange,
  toLocalDateString,
} from '../../lib/time.js';
import { syncLifecycle } from '../reservations/reservations.lifecycle.js';

const NOT_CANCELLED = { status: { $ne: 'cancelled' } };
const round1 = (n) => Math.round((n ?? 0) * 10) / 10;

function resolveRange({ from, to }, defaultDays = 7) {
  const today = toLocalDateString(new Date());
  const end = to ?? (from ? addDays(from, defaultDays - 1) : today);
  const start = from ?? addDays(end, -(defaultDays - 1));
  const days = eachLocalDate(start, end);
  if (days.length > 366) throw badRequest('range too large (max 366 days)');
  return { from: start, to: end, days, ...localRange(start, end) };
}

/** Admin dashboard: ภาพรวมของวัน */
export async function overview({ date }) {
  await syncLifecycle();
  const day = date ?? toLocalDateString(new Date());
  const { start, end } = localDayRange(day);
  const inDay = { startAt: { $gte: start, $lt: end } };

  const [byStatus, tableCounts, gameCounts, occupiedNow, hourly] = await Promise.all([
    Reservation.aggregate([
      { $match: inDay },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$price.total' },
          players: { $sum: '$players' },
          hours: { $sum: '$durationHours' },
        },
      },
    ]),
    Table.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Game.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Reservation.distinct('table', { status: 'playing' }),
    Reservation.aggregate([
      { $match: { ...inDay, ...NOT_CANCELLED } },
      { $group: { _id: { $hour: { date: '$startAt', timezone: TZ } }, count: { $sum: 1 } } },
    ]),
  ]);

  const reservations = { total: 0, booked: 0, playing: 0, completed: 0, cancelled: 0 };
  let revenue = 0;
  let players = 0;
  let bookedHours = 0;
  for (const s of byStatus) {
    reservations[s._id] = s.count;
    reservations.total += s.count;
    if (s._id !== 'cancelled') {
      revenue += s.revenue;
      players += s.players;
      bookedHours += s.hours;
    }
  }

  const toMap = (rows, keys) =>
    Object.fromEntries(keys.map((k) => [k, rows.find((r) => r._id === k)?.count ?? 0]));
  const tables = toMap(tableCounts, ['active', 'closed']);
  const games = toMap(gameCounts, ['available', 'in_use', 'maintenance']);
  const peak = hourly.sort((a, b) => b.count - a.count)[0];

  return {
    date: day,
    reservations,
    revenue,
    players,
    bookedHours: round1(bookedHours),
    peakHour: peak ? { hour: peak._id, reservations: peak.count } : null,
    tables: { ...tables, total: tables.active + tables.closed, occupiedNow: occupiedNow.length },
    games: { ...games, total: games.available + games.in_use + games.maintenance },
  };
}

/** กราฟรายวัน: จำนวนการจอง + รายได้ (เติมวันที่ไม่มีข้อมูลเป็น 0) */
export async function daily(query) {
  const { from, to, days, start, end } = resolveRange(query, 7);
  const rows = await Reservation.aggregate([
    { $match: { startAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$startAt', timezone: TZ } },
        reservations: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        revenue: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$price.total', 0] } },
        players: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$players', 0] } },
      },
    },
  ]);
  const byDay = new Map(rows.map((r) => [r._id, r]));
  return {
    from,
    to,
    series: days.map((d) => ({
      date: d,
      reservations: byDay.get(d)?.reservations ?? 0,
      cancelled: byDay.get(d)?.cancelled ?? 0,
      revenue: byDay.get(d)?.revenue ?? 0,
      players: byDay.get(d)?.players ?? 0,
    })),
  };
}

/** ช่วงเวลาที่คนจองเยอะ (0-23 น. เวลาไทย) */
export async function hourly(query) {
  const { from, to, start, end } = resolveRange(query, 30);
  const rows = await Reservation.aggregate([
    { $match: { startAt: { $gte: start, $lt: end }, ...NOT_CANCELLED } },
    { $group: { _id: { $hour: { date: '$startAt', timezone: TZ } }, count: { $sum: 1 } } },
  ]);
  const byHour = new Map(rows.map((r) => [r._id, r.count]));
  return {
    from,
    to,
    series: Array.from({ length: 24 }, (_, h) => ({ hour: h, reservations: byHour.get(h) ?? 0 })),
  };
}

/** เกมยอดนิยม (จองบ่อยสุด) + คะแนนรีวิวเฉลี่ย — public ใช้หน้า Home ได้ */
export async function popularGames({ from, to, limit }) {
  const match = { ...NOT_CANCELLED, game: { $ne: null } };
  if (from || to) {
    const r = resolveRange({ from, to }, 30);
    match.startAt = { $gte: r.start, $lt: r.end };
  }
  return Reservation.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$game',
        reservations: { $sum: 1 },
        players: { $sum: '$players' },
        hours: { $sum: '$durationHours' },
      },
    },
    { $sort: { reservations: -1, hours: -1 } },
    { $limit: limit },
    { $lookup: { from: 'games', localField: '_id', foreignField: '_id', as: 'game' } },
    { $unwind: '$game' },
    { $lookup: { from: 'reviews', localField: '_id', foreignField: 'game', as: 'reviews' } },
    {
      $project: {
        _id: 0,
        game: {
          _id: '$game._id',
          name: '$game.name',
          thumbnail: '$game.thumbnail',
          status: '$game.status',
        },
        reservations: 1,
        players: 1,
        hours: 1,
        avgRating: { $round: [{ $avg: '$reviews.rating' }, 1] },
        reviewCount: { $size: '$reviews' },
      },
    },
  ]);
}

/** การใช้งานแต่ละโต๊ะ (รวมโต๊ะที่ไม่มีการจองด้วย) */
export async function tablesUsage(query) {
  const { from, to, start, end } = resolveRange(query, 7);
  const [tables, rows] = await Promise.all([
    Table.find().sort({ zone: 1, code: 1 }).select('code name zone capacity status').lean(),
    Reservation.aggregate([
      { $match: { startAt: { $gte: start, $lt: end }, ...NOT_CANCELLED } },
      {
        $group: {
          _id: '$table',
          reservations: { $sum: 1 },
          hours: { $sum: '$durationHours' },
          revenue: { $sum: '$price.total' },
        },
      },
    ]),
  ]);
  const byTable = new Map(rows.map((r) => [String(r._id), r]));
  return {
    from,
    to,
    tables: tables.map((t) => {
      const r = byTable.get(String(t._id));
      return {
        ...t,
        reservations: r?.reservations ?? 0,
        hours: round1(r?.hours),
        revenue: r?.revenue ?? 0,
      };
    }),
  };
}

/** สถิติส่วนตัวของสมาชิก */
export async function mine(userId) {
  await syncLifecycle();
  const [byStatus, favorites, next] = await Promise.all([
    Reservation.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          hours: { $sum: '$durationHours' },
          spent: { $sum: '$price.total' },
        },
      },
    ]),
    Reservation.aggregate([
      { $match: { user: userId, ...NOT_CANCELLED, game: { $ne: null } } },
      { $group: { _id: '$game', times: { $sum: 1 }, hours: { $sum: '$durationHours' } } },
      { $sort: { times: -1, hours: -1 } },
      { $limit: 3 },
      { $lookup: { from: 'games', localField: '_id', foreignField: '_id', as: 'game' } },
      { $unwind: '$game' },
      {
        $project: {
          _id: 0,
          game: { _id: '$game._id', name: '$game.name', thumbnail: '$game.thumbnail' },
          times: 1,
          hours: 1,
        },
      },
    ]),
    Reservation.findOne({ user: userId, status: 'booked' })
      .sort({ startAt: 1 })
      .populate('table', 'code zone')
      .populate('game', 'name'),
  ]);

  const get = (s) => byStatus.find((r) => r._id === s);
  const nonCancelled = byStatus.filter((r) => r._id !== 'cancelled');
  return {
    reservations: {
      total: byStatus.reduce((n, r) => n + r.count, 0),
      booked: get('booked')?.count ?? 0,
      playing: get('playing')?.count ?? 0,
      completed: get('completed')?.count ?? 0,
      cancelled: get('cancelled')?.count ?? 0,
    },
    hoursPlayed: round1(get('completed')?.hours),
    totalSpent: nonCancelled.reduce((n, r) => n + r.spent, 0),
    favoriteGames: favorites,
    nextReservation: next,
  };
}
