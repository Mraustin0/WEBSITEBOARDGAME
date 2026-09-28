import { Game } from '../../models/game.model.js';
import { notFound } from '../../lib/errors.js';

const SORT_FIELDS = {
  name: 'name',
  year: 'yearPublished',
  createdAt: 'createdAt',
  bggRating: 'bggRating',
};

function buildFilter({ q, minPlayers, maxPlayers, year, status, category, mechanic }) {
  const filter = {};
  if (q) {
    // regex fallback so partial matches work without requiring text index warm-up
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { description: rx }];
  }
  if (status) filter.status = status;
  if (year) filter.yearPublished = year;
  if (category) filter.categories = category;
  if (mechanic) filter.mechanics = mechanic;
  if (minPlayers) filter.maxPlayers = { ...(filter.maxPlayers || {}), $gte: minPlayers };
  if (maxPlayers) filter.minPlayers = { ...(filter.minPlayers || {}), $lte: maxPlayers };
  return filter;
}

export async function list(query) {
  const { sort, order, page, limit } = query;
  const filter = buildFilter(query);
  const sortField = SORT_FIELDS[sort] || 'createdAt';
  const sortDir = order === 'asc' ? 1 : -1;

  const [items, total] = await Promise.all([
    Game.find(filter)
      .sort({ [sortField]: sortDir })
      .skip((page - 1) * limit)
      .limit(limit),
    Game.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function findById(id) {
  const game = await Game.findById(id);
  if (!game) throw notFound('game not found');
  return game;
}

export function create(data, userId) {
  return Game.create({ ...data, createdBy: userId });
}

export async function update(id, data) {
  const game = await Game.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!game) throw notFound('game not found');
  return game;
}

export async function remove(id) {
  const game = await Game.findByIdAndDelete(id);
  if (!game) throw notFound('game not found');
  return game;
}
