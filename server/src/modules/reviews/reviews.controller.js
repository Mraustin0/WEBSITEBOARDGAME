import * as service from './reviews.service.js';

export const listForGame = async (req, res) =>
  res.json(await service.listForGame(req.params.gameId));

export const upsert = async (req, res) =>
  res.status(201).json(await service.upsert(req.user._id, req.body));

export const remove = async (req, res) => {
  await service.remove({
    id: req.params.id,
    userId: req.user._id,
    isAdmin: req.user.role === 'admin',
  });
  res.json({ ok: true });
};
