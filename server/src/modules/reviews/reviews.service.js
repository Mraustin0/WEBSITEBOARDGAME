import mongoose from 'mongoose';
import { Review } from '../../models/review.model.js';
import { Game } from '../../models/game.model.js';
import { notFound } from '../../lib/errors.js';

export function listForGame(gameId) {
  return Review.find({ game: gameId }).populate('user', 'username').sort({ createdAt: -1 });
}

export function listMine(userId) {
  return Review.find({ user: userId })
    .populate('game', 'name thumbnail status')
    .sort({ updatedAt: -1 });
}

/** คะแนนเฉลี่ย + จำนวนรีวิว + distribution 1-10 ของเกม */
export async function summary(gameId) {
  const [row] = await Review.aggregate([
    { $match: { game: new mongoose.Types.ObjectId(gameId) } },
    {
      $group: {
        _id: '$game',
        average: { $avg: '$rating' },
        count: { $sum: 1 },
        ratings: { $push: '$rating' },
      },
    },
  ]);
  const distribution = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, 0]));
  for (const r of row?.ratings ?? []) distribution[r] += 1;
  return {
    game: gameId,
    average: row ? Math.round(row.average * 10) / 10 : null,
    count: row?.count ?? 0,
    distribution,
  };
}

export async function upsert(userId, { game, rating, comment }) {
  if (!(await Game.exists({ _id: game }))) throw notFound('game not found');
  const review = await Review.findOneAndUpdate(
    { user: userId, game },
    { rating, comment },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).populate('user', 'username');
  return review;
}

export async function remove({ id, userId, isAdmin }) {
  const filter = isAdmin ? { _id: id } : { _id: id, user: userId };
  const review = await Review.findOneAndDelete(filter);
  if (!review) throw notFound('review not found');
  return review;
}

/** admin moderation: ดูรีวิวทั้งหมด (กรองตามเกม / คะแนนต่ำ) */
export async function adminList({ game, maxRating, page, limit }) {
  const query = {};
  if (game) query.game = game;
  if (maxRating) query.rating = { $lte: maxRating };
  const [items, total] = await Promise.all([
    Review.find(query)
      .populate('user', 'username email')
      .populate('game', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Review.countDocuments(query),
  ]);
  return { items, total, page, limit };
}
