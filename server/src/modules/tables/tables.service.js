import { Table } from '../../models/table.model.js';
import { Reservation, ACTIVE_STATUSES } from '../../models/reservation.model.js';
import { conflict, notFound } from '../../lib/errors.js';
import { localDayRange, toLocalDateString } from '../../lib/time.js';
import { computeEnd } from '../reservations/reservations.rules.js';
import { findBusy, syncLifecycle } from '../reservations/reservations.lifecycle.js';

export function list({ zone, status }) {
  const filter = {};
  if (zone) filter.zone = zone;
  if (status) filter.status = status;
  return Table.find(filter).sort({ zone: 1, code: 1 });
}

export async function findById(id) {
  const table = await Table.findById(id);
  if (!table) throw notFound('table not found');
  return table;
}

export function create(data) {
  return Table.create(data);
}

export async function update(id, data) {
  const table = await Table.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!table) throw notFound('table not found');
  return table;
}

export const setStatus = (id, status) => update(id, { status });

export async function remove(id) {
  const active = await Reservation.countDocuments({ table: id, status: { $in: ACTIVE_STATUSES } });
  if (active) {
    throw conflict(`table has ${active} active reservation(s) — cancel them or close the table`);
  }
  const table = await Table.findByIdAndDelete(id);
  if (!table) throw notFound('table not found');
  return table;
}

/**
 * Interactive floor plan: สถานะแต่ละโต๊ะในช่วงเวลาที่เลือก (default = ตอนนี้ + 1 ชม.)
 *  - closed    ปิดปรับปรุง
 *  - occupied  มีคนกำลังเล่นอยู่ (status playing)
 *  - reserved  มีการจองทับช่วงเวลานี้
 *  - available ว่าง
 */
export async function floor({ startAt, durationHours }) {
  const now = new Date();
  await syncLifecycle(now);
  const start = startAt ?? now;
  const endAt = computeEnd(start, durationHours);

  const [tables, busy] = await Promise.all([
    Table.find().sort({ zone: 1, code: 1 }).lean(),
    findBusy({ startAt: start, endAt }, now),
  ]);

  const byTable = new Map();
  for (const r of busy) {
    const key = String(r.table);
    if (!byTable.has(key)) byTable.set(key, []);
    byTable.get(key).push(r);
  }

  const zones = [...new Set(tables.map((t) => t.zone))];

  return {
    startAt: start,
    endAt,
    zones,
    tables: tables.map((t) => {
      const rs = (byTable.get(String(t._id)) || []).sort((a, b) => a.startAt - b.startAt);
      const playing = rs.find((r) => r.status === 'playing');
      let state = 'available';
      if (t.status === 'closed') state = 'closed';
      else if (playing) state = 'occupied';
      else if (rs.length) state = 'reserved';

      return {
        ...t,
        state,
        current: playing
          ? {
              reservationId: playing._id,
              game: playing.game,
              players: playing.players,
              startAt: playing.startAt,
              endAt: playing.endAt,
            }
          : null,
        reservations: rs.map((r) => ({
          reservationId: r._id,
          status: r.status,
          startAt: r.startAt,
          endAt: r.endAt,
          game: r.game,
        })),
      };
    }),
  };
}

/**
 * ตารางเวลาจองโต๊ะของวัน (Timeline) แยกตามโซน — สำหรับหน้า Reservations Management ของ admin
 * ไม่รวมรายการที่ยกเลิก
 */
export async function schedule({ date }) {
  await syncLifecycle();
  const day = date ?? toLocalDateString(new Date());
  const { start, end } = localDayRange(day);

  const [tables, reservations] = await Promise.all([
    Table.find().sort({ zone: 1, code: 1 }).lean(),
    Reservation.find({
      status: { $ne: 'cancelled' },
      startAt: { $lt: end },
      endAt: { $gt: start },
    })
      .sort({ startAt: 1 })
      .populate('game', 'name thumbnail')
      .populate('user', 'username displayName phone')
      .lean(),
  ]);

  const byTable = new Map();
  for (const r of reservations) {
    const key = String(r.table);
    if (!byTable.has(key)) byTable.set(key, []);
    const u = r.user;
    const c = r.customer;
    const customerName = (u && (u.displayName || u.username)) || (c && (c.name || c.phone)) || '';
    byTable.get(key).push({
      reservationId: r._id,
      status: r.status,
      source: r.source ?? 'online',
      startAt: r.startAt,
      endAt: r.endAt,
      players: r.players,
      game: r.game,
      // string สำหรับตารางเวลา + object เผื่อ client ใช้ customerName()
      customer: customerName || (c && typeof c === 'object' ? c : null) || '',
      user: u || undefined,
      paid: r.payment?.status === 'paid',
    });
  }

  const zones = [];
  for (const t of tables) {
    let zone = zones.find((z) => z.zone === t.zone);
    if (!zone) {
      zone = { zone: t.zone, tables: [] };
      zones.push(zone);
    }
    zone.tables.push({
      _id: t._id,
      code: t.code,
      name: t.name,
      capacity: t.capacity,
      status: t.status,
      reservations: byTable.get(String(t._id)) || [],
    });
  }
  return { date: day, start, end, zones };
}
