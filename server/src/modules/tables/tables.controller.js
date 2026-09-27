import * as service from './tables.service.js';

export const list = async (req, res) => res.json(await service.list(req.query));

export const floor = async (req, res) => res.json(await service.floor(req.query));

export const detail = async (req, res) => res.json(await service.findById(req.params.id));

export const create = async (req, res) => res.status(201).json(await service.create(req.body));

export const update = async (req, res) => res.json(await service.update(req.params.id, req.body));

export const setStatus = async (req, res) =>
  res.json(await service.setStatus(req.params.id, req.body.status));

export const remove = async (req, res) => {
  await service.remove(req.params.id);
  res.json({ ok: true });
};
