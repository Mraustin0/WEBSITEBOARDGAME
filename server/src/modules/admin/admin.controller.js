import * as service from './admin.service.js';

export const listUsers = async (req, res) => res.json(await service.listUsers(req.query));

export const updateRole = async (req, res) =>
  res.json(await service.updateRole(req.user._id, req.params.id, req.body.role));

export const remove = async (req, res) => {
  await service.remove(req.user._id, req.params.id);
  res.json({ ok: true });
};
