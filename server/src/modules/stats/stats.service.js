// Dashboard / สถิติ — ใช้ MongoDB aggregation pipeline
import mongoose from 'mongoose';
import { NOT_SERVED, Reservation } from '../../models/reservation.model.js';
import { User } from '../../models/user.model.js';
import { Review } from '../../models/review.model.js';
import { MaintenanceTicket, OPEN_TICKET_STATUSES } from '../../models/maintenance.model.js';
import { Table } from '../../models/table.model.js';
import { Game } from '../../models/game.model.js';
import { badRequest, notFound } from '../../lib/errors.js';
import {
  TZ,
  addDays,
  eachLocalDate,
  localDayRange,
  localRange,
  toLocalDateString,
} from '../../lib/time.js';
import { syncLifecycle } from '../reservations/reservations.lifecycle.js';
import { openHoursOfDay } from '../reservations/reservations.rules.js';
import { getRules } from '../settings/settings.service.js';

// นับเฉพาะการใช้บริการจริง (ไม่รวมยกเลิก / no-show)
const NOT_CANCELLED = { status: { $nin: NOT_SERVED } };
const SERVED_EXPR = { $not: [{ $in: ['$status', NOT_SERVED] }] };
const MONEY = { $ifNull: ['$checkout.total', '$price.total'] };
const oid = (id) => new mongoose.Types.ObjectId(String(id));
const pct = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);
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

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    byStatus,
    tableCounts,
    gameCounts,
    occupiedNow,
    hourly,
    extra,
    activeMembers,
    openTickets,
    popularToday,
    rules,
  ] = await Promise.all([
    Reservation.aggregate([
      { $match: inDay },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$checkout.total', '$price.total'] } },
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
    Reservation.aggregate([
      { $match: inDay },
      {
        $group: {
          _id: null,
          walkIns: { $sum: { $cond: [{ $eq: ['$source', 'walk_in'] }, 1, 0] } },
          unpaid: {
            $sum: {
              $cond: [
                {
                  $and: [{ $eq: ['$status', 'completed'] }, { $ne: ['$payment.status', 'paid'] }],
                },
                1,
                0,
              ],
            },
          },
          collected: {
            $sum: { $cond: [{ $eq: ['$payment.status', 'paid'] }, '$payment.amount', 0] },
          },
        },
      },
    ]),
    Reservation.distinct('user', {
      startAt: { $gte: since7d },
      user: { $ne: null },
      ...NOT_CANCELLED,
    }),
    MaintenanceTicket.countDocuments({ status: { $in: OPEN_TICKET_STATUSES } }),
    popularGames({ from: day, to: day, limit: 5 }),
    getRules(),
  ]);

  const reservations = {
    total: 0,
    booked: 0,
    playing: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
  };
  let revenue = 0;
  let players = 0;
  let bookedHours = 0;
  for (const s of byStatus) {
    reservations[s._id] = s.count;
    reservations.total += s.count;
    if (!NOT_SERVED.includes(s._id)) {
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
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
  const capacityHours = tables.active * openHoursOfDay(dow, rules.OPERATING);
  const target = rules.REVENUE_TARGET_PER_DAY;

  return {
    date: day,
    reservations,
    revenue,
    revenueTarget: target,
    revenueTargetPct: target ? Math.round((revenue / target) * 1000) / 10 : null,
    collected: extra[0]?.collected ?? 0,
    unpaid: extra[0]?.unpaid ?? 0,
    walkIns: extra[0]?.walkIns ?? 0,
    players,
    bookedHours: round1(bookedHours),
    utilizationPct: capacityHours ? Math.round((bookedHours / capacityHours) * 1000) / 10 : null,
    activeMembers7d: activeMembers.length,
    openMaintenance: openTickets,
    popularGames: popularToday,
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
        reservations: { $sum: { $cond: [SERVED_EXPR, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        noShows: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
        revenue: {
          $sum: {
            $cond: [SERVED_EXPR, { $ifNull: ['$checkout.total', '$price.total'] }, 0],
          },
        },
        players: { $sum: { $cond: [SERVED_EXPR, '$players', 0] } },
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
      noShows: byDay.get(d)?.noShows ?? 0,
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
          revenue: { $sum: { $ifNull: ['$checkout.total', '$price.total'] } },
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

/** สถิติของสมาชิกหนึ่งคน (ใช้ทั้ง /stats/me และหน้า admin "รายละเอียดสมาชิก") */
async function memberSummary(userId) {
  const uid = oid(userId);
  const [byStatus, favorites, favTables, lastVisit, next] = await Promise.all([
    Reservation.aggregate([
      { $match: { user: uid } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          hours: {
            $sum: {
              $ifNull: [{ $divide: ['$checkout.actualMinutes', 60] }, '$durationHours'],
            },
          },
          spent: { $sum: MONEY },
        },
      },
    ]),
    Reservation.aggregate([
      { $match: { user: uid, ...NOT_CANCELLED, game: { $ne: null } } },
      { $group: { _id: '$game', times: { $sum: 1 }, hours: { $sum: '$durationHours' } } },
      { $sort: { times: -1, hours: -1 } },
      { $limit: 3 },
      { $lookup: { from: 'games', localField: '_id', foreignField: '_id', as: 'game' } },
      { $unwind: '$game' },
      {
        $project: {
          _id: 0,
          game: {
            _id: '$game._id',
            name: '$game.name',
            thumbnail: '$game.thumbnail',
            categories: '$game.categories',
          },
          times: 1,
          hours: 1,
        },
      },
    ]),
    Reservation.aggregate([
      { $match: { user: uid, ...NOT_CANCELLED } },
      { $group: { _id: '$table', times: { $sum: 1 } } },
      { $sort: { times: -1 } },
      { $limit: 1 },
      { $lookup: { from: 'tables', localField: '_id', foreignField: '_id', as: 'table' } },
      { $unwind: '$table' },
      { $project: { _id: 0, times: 1, code: '$table.code', zone: '$table.zone' } },
    ]),
    Reservation.findOne({ user: uid, status: 'completed' }).sort({ startAt: -1 }).select('startAt'),
    Reservation.findOne({ user: uid, status: 'booked' })
      .sort({ startAt: 1 })
      .populate('table', 'code zone')
      .populate('game', 'name'),
  ]);

  const get = (s) => byStatus.find((r) => r._id === s);
  const served = byStatus.filter((r) => !NOT_SERVED.includes(r._id));
  const categories = new Map();
  for (const f of favorites) {
    for (const c of f.game.categories ?? []) categories.set(c, (categories.get(c) ?? 0) + f.times);
  }
  return {
    reservations: {
      total: byStatus.reduce((n, r) => n + r.count, 0),
      booked: get('booked')?.count ?? 0,
      playing: get('playing')?.count ?? 0,
      completed: get('completed')?.count ?? 0,
      cancelled: get('cancelled')?.count ?? 0,
      no_show: get('no_show')?.count ?? 0,
    },
    visits: get('completed')?.count ?? 0,
    hoursPlayed: round1(get('completed')?.hours),
    totalSpent: served.reduce((n, r) => n + r.spent, 0),
    lastVisitAt: lastVisit?.startAt ?? null,
    favoriteGames: favorites,
    favoriteTable: favTables[0] ?? null,
    favoriteCategories: [...categories.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, times]) => ({ name, times })),
    nextReservation: next,
  };
}

/** สถิติส่วนตัวของสมาชิกที่ login อยู่ */
export async function mine(userId) {
  await syncLifecycle();
  return memberSummary(userId);
}

/** หน้า 7 (admin): รายละเอียดบัญชีสมาชิก — profile + สถิติ (ประวัติใช้ /reservations/admin?user=) */
export async function member(userId) {
  await syncLifecycle();
  const user = await User.findById(userId).select('-passwordHash').lean();
  if (!user) throw notFound('user not found');
  const [summary, rules] = await Promise.all([memberSummary(userId), getRules()]);
  return { user, ...summary, noShowLimit: rules.NO_SHOW_SUSPEND_AFTER ?? null };
}

/** หน้า 3 (admin): สถิติและประวัติการเล่นของเกม */
export async function gameStats(gameId) {
  await syncLifecycle();
  const gid = oid(gameId);
  const game = await Game.findById(gid).lean();
  if (!game) throw notFound('game not found');

  const [agg, rating, recent, damages, tickets] = await Promise.all([
    Reservation.aggregate([
      { $match: { game: gid, ...NOT_CANCELLED } },
      {
        $group: {
          _id: null,
          sessions: { $sum: 1 },
          players: { $sum: '$players' },
          hours: { $sum: '$durationHours' },
          revenue: { $sum: MONEY },
          lastPlayedAt: { $max: '$startAt' },
        },
      },
    ]),
    Review.aggregate([
      { $match: { game: gid } },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
    Reservation.find({ game: gid })
      .sort({ startAt: -1 })
      .limit(10)
      .populate('table', 'code zone')
      .populate('user', 'username')
      .select('startAt endAt players status table user customer checkout.condition'),
    Reservation.countDocuments({ game: gid, 'checkout.condition': 'damaged' }),
    MaintenanceTicket.find({ game: gid }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);
  const a = agg[0] ?? {};
  return {
    game: { _id: game._id, name: game.name, status: game.status, thumbnail: game.thumbnail },
    sessions: a.sessions ?? 0,
    players: a.players ?? 0,
    hours: round1(a.hours),
    revenue: a.revenue ?? 0,
    lastPlayedAt: a.lastPlayedAt ?? null,
    rating: rating[0]
      ? { average: round1(rating[0].average), count: rating[0].count }
      : { average: null, count: 0 },
    damageReports: damages,
    maintenance: tickets,
    recentSessions: recent,
  };
}

async function kpis(start, end) {
  const [row, newMembers, perUser] = await Promise.all([
    Reservation.aggregate([
      { $match: { startAt: { $gte: start, $lt: end }, ...NOT_CANCELLED } },
      {
        $group: {
          _id: null,
          revenue: { $sum: MONEY },
          sessions: { $sum: 1 },
          players: { $sum: '$players' },
          hours: { $sum: '$durationHours' },
        },
      },
    ]),
    User.countDocuments({ createdAt: { $gte: start, $lt: end } }),
    Reservation.aggregate([
      { $match: { startAt: { $gte: start, $lt: end }, ...NOT_CANCELLED, user: { $ne: null } } },
      { $group: { _id: '$user', n: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          customers: { $sum: 1 },
          repeat: { $sum: { $cond: [{ $gte: ['$n', 2] }, 1, 0] } },
        },
      },
    ]),
  ]);
  const r = row[0] ?? {};
  const p = perUser[0] ?? {};
  return {
    revenue: r.revenue ?? 0,
    sessions: r.sessions ?? 0,
    players: r.players ?? 0,
    hours: round1(r.hours),
    avgPerSession: r.sessions ? Math.round(r.revenue / r.sessions) : 0,
    newMembers,
    repeatRatePct: p.customers ? Math.round((p.repeat / p.customers) * 1000) / 10 : 0,
  };
}

/** หน้า 13: KPI + เทียบช่วงก่อนหน้า + สัดส่วนหมวดหมู่เกม + เกมยอดนิยม */
export async function report(query) {
  const range = resolveRange(query, 7);
  const len = range.days.length;
  const prev = resolveRange({ from: addDays(range.from, -len), to: addDays(range.from, -1) });

  const [current, previous, trend, categories, topGames] = await Promise.all([
    kpis(range.start, range.end),
    kpis(prev.start, prev.end),
    daily({ from: range.from, to: range.to }),
    Reservation.aggregate([
      {
        $match: {
          startAt: { $gte: range.start, $lt: range.end },
          ...NOT_CANCELLED,
          game: { $ne: null },
        },
      },
      { $lookup: { from: 'games', localField: 'game', foreignField: '_id', as: 'g' } },
      { $unwind: '$g' },
      {
        $project: {
          money: MONEY,
          cats: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$g.categories', []] } }, 0] },
              '$g.categories',
              ['Uncategorized'],
            ],
          },
        },
      },
      { $unwind: '$cats' },
      { $group: { _id: '$cats', sessions: { $sum: 1 }, revenue: { $sum: '$money' } } },
      { $sort: { sessions: -1 } },
    ]),
    popularGames({ from: range.from, to: range.to, limit: 10 }),
  ]);

  const catTotal = categories.reduce((n, c) => n + c.sessions, 0);
  const change = Object.fromEntries(
    Object.keys(current).map((k) => [k, pct(current[k], previous[k])]),
  );
  return {
    from: range.from,
    to: range.to,
    previous: { from: prev.from, to: prev.to, ...previous },
    kpis: current,
    changePct: change,
    revenueTrend: trend.series,
    categories: categories.map((c) => ({
      category: c._id,
      sessions: c.sessions,
      revenue: c.revenue,
      pct: catTotal ? Math.round((c.sessions / catTotal) * 1000) / 10 : 0,
    })),
    topGames,
  };
}

/** Peak Hours Heatmap: วันในสัปดาห์ (0=อาทิตย์) × ชั่วโมง (0-23) */
export async function heatmap(query) {
  const { from, to, start, end } = resolveRange(query, 30);
  const rows = await Reservation.aggregate([
    { $match: { startAt: { $gte: start, $lt: end }, ...NOT_CANCELLED } },
    {
      $group: {
        _id: {
          dow: { $subtract: [{ $dayOfWeek: { date: '$startAt', timezone: TZ } }, 1] },
          hour: { $hour: { date: '$startAt', timezone: TZ } },
        },
        count: { $sum: 1 },
        players: { $sum: '$players' },
      },
    },
  ]);
  const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
  let max = 0;
  for (const r of rows) {
    matrix[r._id.dow][r._id.hour] = r.count;
    max = Math.max(max, r.count);
  }
  return {
    from,
    to,
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    max,
    matrix,
    cells: rows.map((r) => ({ ...r._id, reservations: r.count, players: r.players })),
  };
}

const csvCell = (v) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Export: การจองในช่วงวัน เป็น CSV (เปิดใน Excel ได้) */
export async function exportCsv(query) {
  const { from, to, start, end } = resolveRange(query, 30);
  const rows = await Reservation.find({ startAt: { $gte: start, $lt: end } })
    .sort({ startAt: 1 })
    .populate('table', 'code zone')
    .populate('game', 'name')
    .populate('user', 'username email')
    .lean();
  const header = [
    'date',
    'start',
    'end',
    'table',
    'zone',
    'customer',
    'phone',
    'players',
    'game',
    'status',
    'source',
    'package',
    'price',
    'overtime',
    'total',
    'payment',
    'method',
  ];
  const time = (d) => new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(11, 16);
  const lines = rows.map((r) =>
    [
      toLocalDateString(r.startAt),
      time(r.startAt),
      time(r.endAt),
      r.table?.code,
      r.table?.zone,
      r.user?.username ?? r.customer?.name,
      r.customer?.phone,
      r.players,
      r.game?.name,
      r.status,
      r.source ?? 'online',
      r.price?.package ?? 'hourly',
      r.price?.total,
      r.checkout?.overtimeCharge ?? 0,
      r.checkout?.total ?? r.price?.total,
      r.payment?.status ?? 'unpaid',
      r.payment?.method,
    ]
      .map(csvCell)
      .join(','),
  );
  return {
    filename: `reservations_${from}_${to}.csv`,
    // BOM ให้ Excel อ่านภาษาไทยถูก
    csv: '\uFEFF' + [header.join(','), ...lines].join('\r\n') + '\r\n',
  };
}
