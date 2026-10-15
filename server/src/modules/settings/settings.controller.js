import * as service from './settings.service.js';
import { logAudit } from '../../lib/audit.js';

export const get = async (_req, res) => res.json(await service.getSettings());

export const update = async (req, res) => {
  const doc = await service.updateSettings(req.body, req.user._id);
  logAudit({
    req,
    action: 'settings',
    module: 'settings',
    summary: `แก้ตั้งค่าร้าน: ${Object.keys(req.body).join(', ')}`,
    targetType: 'Settings',
    meta: req.body,
  });
  res.json(doc);
};
