import * as service from './collection.service.js';

export const list = async (req, res) => res.json(await service.listForUser(req.user._id));

export const add = async (req, res) => {
  const item = await service.add(req.user._id, req.body);
  res.status(201).json(item);
};

export const remove = async (req, res) => {
  await service.remove(req.user._id, req.params.id);
  res.json({ ok: true });
};
