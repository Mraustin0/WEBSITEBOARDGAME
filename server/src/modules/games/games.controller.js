import * as service from './games.service.js';

export const list = async (req, res) => res.json(await service.list(req.query));

export const detail = async (req, res) => res.json(await service.findById(req.params.id));

export const create = async (req, res) => {
  const game = await service.create(req.body, req.user._id);
  res.status(201).json(game);
};

export const update = async (req, res) => res.json(await service.update(req.params.id, req.body));

export const remove = async (req, res) => {
  await service.remove(req.params.id);
  res.json({ ok: true });
};
