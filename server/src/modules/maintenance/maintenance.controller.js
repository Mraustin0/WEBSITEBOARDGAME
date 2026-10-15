import * as service from './maintenance.service.js';
import { logAudit } from '../../lib/audit.js';

const name = (t) => (t.itemType === 'game' ? t.game?.name : `โต๊ะ ${t.table?.code}`) ?? '';
const audit = (req, action, summary, t, meta) =>
  logAudit({
    req,
    action,
    module: 'maintenance',
    summary,
    targetType: 'MaintenanceTicket',
    targetId: t?._id,
    meta,
  });

export const list = async (req, res) => res.json(await service.list(req.query));
export const summary = async (_req, res) => res.json(await service.summary());
export const detail = async (req, res) => res.json(await service.findById(req.params.id));

export const create = async (req, res) => {
  const t = await service.create(req.body, req.user._id);
  audit(req, 'create', `แจ้งซ่อม ${name(t)}: ${t.title}`, t);
  res.status(201).json(t);
};

export const update = async (req, res) => {
  const t = await service.update(req.params.id, req.body, req.user._id);
  audit(req, 'update', `อัปเดตงานซ่อม ${name(t)} (${t.status})`, t, req.body);
  res.json(t);
};

export const remove = async (req, res) => {
  const t = await service.remove(req.params.id);
  audit(req, 'delete', `ลบใบแจ้งซ่อม: ${t.title}`, t);
  res.json({ ok: true });
};
