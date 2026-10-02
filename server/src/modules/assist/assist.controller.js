import * as service from './assist.service.js';

export const create = async (req, res) =>
  res.status(201).json(await service.create(req.user, req.body));

export const listMine = async (req, res) =>
  res.json(await service.listMine(req.user._id, req.query));

export const cancel = async (req, res) => res.json(await service.cancel(req.params.id, req.user));

export const list = async (req, res) => res.json(await service.list(req.query));

export const update = async (req, res) =>
  res.json(await service.update(req.params.id, req.user, req.body));
