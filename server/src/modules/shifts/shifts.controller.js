import * as service from './shifts.service.js';

export const list = async (req, res) => res.json(await service.list(req.query));
export const create = async (req, res) =>
  res.status(201).json(await service.create(req.body, req.user));
export const update = async (req, res) =>
  res.json(await service.update(req.params.id, req.body, req.user));
export const remove = async (req, res) => res.json(await service.remove(req.params.id, req.user));
