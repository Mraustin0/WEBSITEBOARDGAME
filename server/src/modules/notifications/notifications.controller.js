import * as service from './notifications.service.js';

export const list = async (req, res) => res.json(await service.list(req.user, req.query));
export const unreadCount = async (req, res) => res.json(await service.unreadCount(req.user));
export const markRead = async (req, res) =>
  res.json(await service.markRead(req.params.id, req.user));
export const markAllRead = async (req, res) => res.json(await service.markAllRead(req.user));
export const getPrefs = async (req, res) => res.json(await service.getPrefs(req.user));
export const setPrefs = async (req, res) => res.json(await service.setPrefs(req.user, req.body));
