import * as service from './admin.service.js';

export const listUsers = async (req, res) => res.json(await service.listUsers(req.query));

export const userStats = async (_req, res) => res.json(await service.userStats());

export const createUser = async (req, res) => {
  const user = await service.createUser(req.body, req.user, req);
  res.status(201).json(user);
};

export const updateUser = async (req, res) =>
  res.json(await service.updateUser(req.user._id, req.params.id, req.body, req.user, req));

export const updateRole = async (req, res) =>
  res.json(await service.updateRole(req.user._id, req.params.id, req.body.role, req.user, req));

export const suspend = async (req, res) =>
  res.json(await service.suspend(req.user._id, req.params.id, req.body.reason, req.user, req));

export const unsuspend = async (req, res) =>
  res.json(await service.unsuspend(req.params.id, req.user, req));

export const approve = async (req, res) =>
  res.json(await service.approve(req.params.id, req.user, req));

export const remove = async (req, res) => {
  await service.remove(req.user._id, req.params.id, req.user, req);
  res.json({ ok: true });
};
