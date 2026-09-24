import { CollectionItem } from '../../models/collection.model.js';
import { conflict, notFound } from '../../lib/errors.js';

export function listForUser(userId) {
  return CollectionItem.find({ user: userId }).populate('game').sort({ createdAt: -1 });
}

export async function add(userId, data) {
  try {
    const item = await CollectionItem.create({ user: userId, ...data });
    return item.populate('game');
  } catch (err) {
    if (err.code === 11000) throw conflict('game already in collection');
    throw err;
  }
}

export async function remove(userId, id) {
  const item = await CollectionItem.findOneAndDelete({ _id: id, user: userId });
  if (!item) throw notFound('collection item not found');
  return item;
}
