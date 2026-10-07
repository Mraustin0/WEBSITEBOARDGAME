import { Game } from '../../models/game.model.js';
import { notFound } from '../../lib/errors.js';
import { logAudit } from '../../lib/audit.js';

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

  const [items, total, counts] = await Promise.all([
    Game.find(filter)
      .sort({ [sortField]: sortDir })
      .skip((page - 1) * limit)
      .limit(limit),
    Game.countDocuments(filter),
    Game.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalCopies: { $sum: { $ifNull: ['$copies', 1] } },
          available: {
            $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] },
          },
          inUse: {
            $sum: { $cond: [{ $eq: ['$status', 'in_use'] }, 1, 0] },
          },
          maintenance: {
            $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] },
          },
          availableCopies: {
            $sum: {
              $cond: [{ $eq: ['$status', 'available'] }, { $ifNull: ['$copies', 1] }, 0],
            },
          },
        },
      },
    ]),
  ]);

  const c = counts[0] || {
    total: 0,
    totalCopies: 0,
    available: 0,
    inUse: 0,
    maintenance: 0,
    availableCopies: 0,
  };
  return {
    items,
    total,
    page,
    limit,
    counts: {
      total: c.total,
      totalCopies: c.totalCopies,
      available: c.available,
      inUse: c.inUse,
      maintenance: c.maintenance,
      availableCopies: c.availableCopies,
    },
  };
}

export async function inventoryStats() {
  const [agg] = await Game.aggregate([
    {
      $group: {
        _id: null,
        titles: { $sum: 1 },
        totalCopies: { $sum: { $ifNull: ['$copies', 1] } },
        available: {
          $sum: {
            $cond: [{ $eq: ['$status', 'available'] }, { $ifNull: ['$copies', 1] }, 0],
          },
        },
        inUse: {
          $sum: {
            $cond: [{ $eq: ['$status', 'in_use'] }, { $ifNull: ['$copies', 1] }, 0],
          },
        },
        maintenance: {
          $sum: {
            $cond: [{ $eq: ['$status', 'maintenance'] }, { $ifNull: ['$copies', 1] }, 0],
          },
        },
      },
    },
  ]);
  return (
    agg || {
      titles: 0,
      totalCopies: 0,
      available: 0,
      inUse: 0,
      maintenance: 0,
    }
  );
}

export async function findById(id) {
  const game = await Game.findById(id);
  if (!game) throw notFound('game not found');
  return game;
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
  const game = await Game.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!game) throw notFound('game not found');
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
  return { filename: 'games_inventory.csv', csv: lines.join('\n') };
}
