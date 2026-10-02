import * as service from './settings.service.js';

export const get = async (_req, res) => res.json(await service.getSettings());

export const update = async (req, res) =>
  res.json(await service.updateSettings(req.body, req.user._id));
