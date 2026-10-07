import * as service from './games.service.js';

export const list = async (req, res) => res.json(await service.list(req.query));

export const inventoryStats = async (_req, res) => res.json(await service.inventoryStats());

export const detail = async (req, res) => res.json(await service.findById(req.params.id));

export const create = async (req, res) => {
  const game = await service.create(req.body, req.user._id, req);
  res.status(201).json(game);
};

export const update = async (req, res) =>
  res.json(await service.update(req.params.id, req.body, req));

export const updateCopies = async (req, res) =>
  res.json(await service.updateCopies(req.params.id, req.body, req));

export const remove = async (req, res) => {
  await service.remove(req.params.id, req);
  res.json({ ok: true });
};

export const exportCsv = async (req, res) => {
  const { filename, csv } = await service.exportCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
};
