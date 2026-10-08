import * as service from './roles.service.js';

export const list = async (_req, res) => res.json(await service.list());

export const detail = async (req, res) => res.json(await service.detail(req.params.id));

export const create = async (req, res) => {
  const role = await service.create(req.body, req.user, req);
  res.status(201).json(role);
};

export const update = async (req, res) =>
  res.json(await service.update(req.params.id, req.body, req.user, req));

export const setPermissions = async (req, res) =>
  res.json(await service.setPermissions(req.params.id, req.body.permissions, req.user, req));

export const remove = async (req, res) => {
  await service.remove(req.params.id, req.user, req);
  res.json({ ok: true });
};

export const addMembers = async (req, res) =>
  res.json(await service.addMembers(req.params.id, req.body.userIds, req.user, req));

export const removeMember = async (req, res) =>
  res.json(await service.removeMember(req.params.id, req.params.userId, req.user, req));
