import * as service from './reviews.service.js';
import { can } from '../../lib/permissions.js';

export const listForGame = async (req, res) =>
  res.json(await service.listForGame(req.params.gameId));

export const summary = async (req, res) => res.json(await service.summary(req.params.gameId));

export const listMine = async (req, res) => res.json(await service.listMine(req.user._id));

export const adminList = async (req, res) => res.json(await service.adminList(req.query));

export const upsert = async (req, res) =>
  res.status(201).json(await service.upsert(req.user._id, req.body));

export const remove = async (req, res) => {
  await service.remove({
    id: req.params.id,
    userId: req.user._id,
    isAdmin: await can(req.user, 'inventory', 'del'),
  });
  res.json({ ok: true });
};
