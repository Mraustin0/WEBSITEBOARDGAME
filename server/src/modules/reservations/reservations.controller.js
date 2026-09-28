import * as service from './reservations.service.js';

export const rules = (_req, res) => res.json(service.rules());

export const availability = async (req, res) => res.json(await service.availability(req.query));

export const quote = async (req, res) => res.json(await service.quote(req.user._id, req.body));

export const create = async (req, res) =>
  res.status(201).json(await service.create(req.user._id, req.body));

export const listMine = async (req, res) =>
  res.json(await service.listMine(req.user._id, req.query));

export const detail = async (req, res) => res.json(await service.getById(req.params.id, req.user));

export const update = async (req, res) =>
  res.json(await service.update(req.params.id, req.user, req.body));

export const cancel = async (req, res) =>
  res.json(await service.cancel(req.params.id, req.user, req.body.reason));

export const returnGame = async (req, res) =>
  res.json(await service.returnGame(req.params.id, req.user, req.body));

export const checkoutPreview = async (req, res) =>
  res.json(await service.checkoutPreview(req.params.id, req.user));

export const setGame = async (req, res) =>
  res.json(await service.setGame(req.params.id, req.user, req.body.game));

export const pay = async (req, res) =>
  res.json(await service.pay(req.params.id, req.user, req.body.method));

export const adminCreate = async (req, res) =>
  res.status(201).json(await service.adminCreate(req.user, req.body));

export const adminList = async (req, res) => res.json(await service.adminList(req.query));

export const adminRemove = async (req, res) => {
  await service.adminRemove(req.params.id);
  res.json({ ok: true });
};
