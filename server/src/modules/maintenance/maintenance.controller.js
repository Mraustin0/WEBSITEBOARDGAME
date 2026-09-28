import * as service from './maintenance.service.js';

export const list = async (req, res) => res.json(await service.list(req.query));
export const summary = async (_req, res) => res.json(await service.summary());
export const detail = async (req, res) => res.json(await service.findById(req.params.id));

export const create = async (req, res) =>
  res.status(201).json(await service.create(req.body, req.user._id));

export const update = async (req, res) =>
  res.json(await service.update(req.params.id, req.body, req.user._id));

export const remove = async (req, res) => {
  await service.remove(req.params.id);
  res.json({ ok: true });
};
