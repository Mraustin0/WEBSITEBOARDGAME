import * as service from './plays.service.js';

export const list = async (req, res) => res.json(await service.listForUser(req.user._id));

export const create = async (req, res) => {
  const play = await service.create(req.user._id, req.body);
  res.status(201).json(play);
};

export const update = async (req, res) =>
  res.json(await service.update(req.user._id, req.params.id, req.body));

export const remove = async (req, res) => {
  await service.remove(req.user._id, req.params.id);
  res.json({ ok: true });
};
