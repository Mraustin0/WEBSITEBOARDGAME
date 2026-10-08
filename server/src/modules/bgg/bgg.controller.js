import * as service from './bgg.service.js';

export const search = async (req, res) => res.json(await service.search(req.query.q));

export const detail = async (req, res) => res.json(await service.detail(req.params.bggId));

export const hot = async (_req, res) => res.json(await service.hot());
