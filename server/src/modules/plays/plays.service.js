import { PlaySession } from '../../models/play.model.js';
import { notFound } from '../../lib/errors.js';

export function listForUser(userId) {
  return PlaySession.find({ user: userId }).populate('game').sort({ playedAt: -1 });
}

export async function create(userId, data) {
  const play = await PlaySession.create({ user: userId, ...data });
  return play.populate('game');
}

export async function update(userId, id, data) {
  const play = await PlaySession.findOneAndUpdate(
    { _id: id, user: userId },
    data,
    { new: true, runValidators: true },
  ).populate('game');
  if (!play) throw notFound('play not found');
  return play;
}

export async function remove(userId, id) {
  const play = await PlaySession.findOneAndDelete({ _id: id, user: userId });
  if (!play) throw notFound('play not found');
  return play;
}
