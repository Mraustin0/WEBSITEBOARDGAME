import { Review } from '../../models/review.model.js';
import { notFound } from '../../lib/errors.js';

export function listForGame(gameId) {
  return Review.find({ game: gameId }).populate('user', 'username').sort({ createdAt: -1 });
}

export async function upsert(userId, { game, rating, comment }) {
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
