import { Game } from '../../models/game.model.js';
import { notFound } from '../../lib/errors.js';

export function list({ q, limit }) {
  const filter = q ? { $text: { $search: q } } : {};
  return Game.find(filter).limit(limit).sort({ createdAt: -1 });
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
