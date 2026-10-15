import * as service from './audit.service.js';

export const list = async (req, res) => res.json(await service.list(req.query));

export const summary = async (req, res) => res.json(await service.summary(req.query));

export const exportCsv = async (req, res) => {
  const { filename, csv } = await service.exportCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
};

export const verify = async (_req, res) => res.json(await service.verify());
