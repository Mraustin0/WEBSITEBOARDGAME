import * as service from './stats.service.js';

export const popularGames = async (req, res) => res.json(await service.popularGames(req.query));
export const mine = async (req, res) => res.json(await service.mine(req.user._id));
export const overview = async (req, res) => res.json(await service.overview(req.query));
export const daily = async (req, res) => res.json(await service.daily(req.query));
export const hourly = async (req, res) => res.json(await service.hourly(req.query));
export const tablesUsage = async (req, res) => res.json(await service.tablesUsage(req.query));
export const member = async (req, res) => res.json(await service.member(req.params.userId));
export const gameStats = async (req, res) => res.json(await service.gameStats(req.params.gameId));
export const report = async (req, res) => res.json(await service.report(req.query));
export const heatmap = async (req, res) => res.json(await service.heatmap(req.query));
export const dashboard = async (req, res) => res.json(await service.dashboard(req.query));
export const alerts = async (_req, res) => res.json(await service.alerts());
export const exportCsv = async (req, res) => {
  const { filename, csv } = await service.exportCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
};
