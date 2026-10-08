import { Game } from '../../models/game.model.js';
import { conflict, notFound } from '../../lib/errors.js';
import { logAudit } from '../../lib/audit.js';
import { Reservation } from '../../models/reservation.model.js';
import { copyBreakdown, onGameCopiesChanged } from '../reservations/reservations.lifecycle.js';

/** รวมสถานะรายกล่องของทั้งร้าน */
async function inventoryTotals() {
  const all = await Game.find().select('copies status').lean();
  const map = await copyBreakdown(all);
  const t = {
    titles: all.length,
    totalCopies: 0,
    inVault: 0,
    inPlay: 0,
    inRepair: 0,
    titlesAvailable: 0,
    titlesInUse: 0,
    titlesMaintenance: 0,
  };
  for (const g of all) {
    const b = map.get(String(g._id));
    t.totalCopies += b.copies;
    t.inVault += b.inVault;
    t.inPlay += b.inPlay;
    t.inRepair += b.inRepair;
    if (b.inVault > 0) t.titlesAvailable += 1;
    else if (b.inRepair >= b.copies) t.titlesMaintenance += 1;
    else t.titlesInUse += 1;
  }
  return t;
}

const SORT_FIELDS = {
  name: 'name',
  year: 'yearPublished',
  createdAt: 'createdAt',
  bggRating: 'bggRating',
  copies: 'copies',
};

function buildFilter({
  q,
  minPlayers,
  maxPlayers,
  year,
  status,
  category,
  mechanic,
  shelf,
  minWeight,
  maxWeight,
}) {
  const filter = {};
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { description: rx }, { sku: rx }, { barcode: rx }, { shelf: rx }];
  }
  if (status) filter.status = status;
  if (year) filter.yearPublished = year;
  if (category) filter.categories = category;
  if (mechanic) filter.mechanics = mechanic;
  if (shelf) filter.shelf = new RegExp(shelf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (minPlayers) filter.maxPlayers = { ...(filter.maxPlayers || {}), $gte: minPlayers };
  if (maxPlayers) filter.minPlayers = { ...(filter.minPlayers || {}), $lte: maxPlayers };
  if (minWeight != null || maxWeight != null) {
    filter.bggWeight = {};
    if (minWeight != null) filter.bggWeight.$gte = minWeight;
    if (maxWeight != null) filter.bggWeight.$lte = maxWeight;
  }
  return filter;
}

export async function list(query) {
  const { sort, order, page, limit } = query;
  const filter = buildFilter(query);
  const sortField = SORT_FIELDS[sort] || 'createdAt';
  const sortDir = order === 'asc' ? 1 : -1;

  const [games, total, t] = await Promise.all([
    Game.find(filter)
      .sort({ [sortField]: sortDir })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Game.countDocuments(filter),
    inventoryTotals(),
  ]);
  // สถานะรายกล่องของแต่ละเกม (บนชั้น / กำลังเล่น / ซ่อม)
  const map = await copyBreakdown(games);
  const items = games.map((g) => {
    const b = map.get(String(g._id));
    return { ...g, copiesInVault: b.inVault, copiesInPlay: b.inPlay, copiesInRepair: b.inRepair };
  });
  return {
    items,
    total,
    page,
    limit,
    counts: {
      total: t.titles,
      totalCopies: t.totalCopies,
      available: t.titlesAvailable, // จำนวนเกมที่ยังมีกล่องบนชั้น
      inUse: t.titlesInUse, // เกมที่กล่องที่ใช้ได้ถูกเล่นอยู่ครบ
      maintenance: t.titlesMaintenance, // เกมที่ซ่อมครบทุกกล่อง
      availableCopies: t.inVault,
      inPlayCopies: t.inPlay,
      inRepairCopies: t.inRepair,
    },
  };
}

/** การ์ดสรุปหน้า Inventory (นับเป็นกล่อง) */
export async function inventoryStats() {
  const t = await inventoryTotals();
  return {
    titles: t.titles,
    totalCopies: t.totalCopies,
    inVault: t.inVault,
    inPlay: t.inPlay,
    maintenance: t.inRepair,
    // ชื่อเดิม (ใช้ได้ต่อ)
    available: t.inVault,
    inUse: t.inPlay,
  };
}

export async function findById(id) {
  const game = await Game.findById(id);
  if (!game) throw notFound('game not found');
  return game;
}

/** รายละเอียดเกม + สถานะรายกล่อง */
export async function detail(id) {
  const game = await Game.findById(id).lean();
  if (!game) throw notFound('game not found');
  const b = (await copyBreakdown([game])).get(String(game._id));
  return { ...game, copiesInVault: b.inVault, copiesInPlay: b.inPlay, copiesInRepair: b.inRepair };
}

export async function create(data, userId, req) {
  const game = await Game.create({ ...data, createdBy: userId });
  logAudit({
    req,
    actor: req?.user,
    action: 'create',
    module: 'games',
    summary: `เพิ่มเกม "${game.name}"`,
    targetType: 'Game',
    targetId: game._id,
  });
  return game;
}

export async function update(id, data, req) {
  let game = await Game.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!game) throw notFound('game not found');
  if (data.copies !== undefined) {
    // จำนวนกล่องเปลี่ยน → คำนวณสถานะเกมใหม่ (available / in_use / maintenance)
    await onGameCopiesChanged(game._id);
    game = await Game.findById(game._id);
  }
  logAudit({
    req,
    actor: req?.user,
    action: 'update',
    module: 'games',
    summary: `แก้ไขเกม "${game.name}"`,
    targetType: 'Game',
    targetId: game._id,
  });
  return game;
}

export async function updateCopies(id, data, req) {
  return update(id, data, req);
}

export async function remove(id, req) {
  const active = await Reservation.countDocuments({
    game: id,
    status: { $in: ['booked', 'playing'] },
  });
  if (active) throw conflict(`game has ${active} active reservation(s)`);
  const game = await Game.findByIdAndDelete(id);
  if (!game) throw notFound('game not found');
  logAudit({
    req,
    actor: req?.user,
    action: 'delete',
    module: 'games',
    summary: `ลบเกม "${game.name}"`,
    targetType: 'Game',
    targetId: game._id,
  });
  return game;
}

export async function exportCsv(query) {
  const filter = buildFilter(query || {});
  const items = await Game.find(filter).sort({ name: 1 }).limit(5000).lean();
  const header = [
    'name',
    'sku',
    'barcode',
    'shelf',
    'copies',
    'status',
    'minPlayers',
    'maxPlayers',
    'playtimeMin',
    'bggWeight',
    'bggAverage',
    'categories',
  ];
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [header.join(',')];
  for (const g of items) {
    lines.push(
      [
        g.name,
        g.sku,
        g.barcode,
        g.shelf,
        g.copies ?? 1,
        g.status,
        g.minPlayers,
        g.maxPlayers,
        g.playtimeMin,
        g.bggWeight,
        g.bggAverage,
        (g.categories || []).join('|'),
      ]
        .map(escape)
        .join(','),
    );
  }
  return { filename: 'games_inventory.csv', csv: `\uFEFF${lines.join('\n')}` }; // BOM → Excel อ่านไทยได้
}
