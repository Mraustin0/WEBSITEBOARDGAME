import * as service from './stats.service.js';

export const overview = async (req, res) => res.json(await service.overview(req.query));
export const daily = async (req, res) => res.json(await service.daily(req.query));
export const hourly = async (req, res) => res.json(await service.hourly(req.query));
export const tablesUsage = async (req, res) => res.json(await service.tablesUsage(req.query));
export const popularGames = async (req, res) => res.json(await service.popularGames(req.query));
export const mine = async (req, res) => res.json(await service.mine(req.user._id));
