import * as service from './tables.service.js';
import { logAudit } from '../../lib/audit.js';

const audit = (req, action, summary, t, meta) =>
  logAudit({ req, action, module: 'tables', summary, targetType: 'Table', targetId: t?._id, meta });

export const list = async (req, res) => res.json(await service.list(req.query));

export const schedule = async (req, res) => res.json(await service.schedule(req.query));

export const floor = async (req, res) => res.json(await service.floor(req.query));

export const detail = async (req, res) => res.json(await service.findById(req.params.id));

export const create = async (req, res) => {
  const t = await service.create(req.body);
  audit(req, 'create', `เพิ่มโต๊ะ ${t.code}`, t);
  res.status(201).json(t);
};

export const update = async (req, res) => {
  const t = await service.update(req.params.id, req.body);
  audit(req, 'update', `แก้ไขโต๊ะ ${t.code}`, t, req.body);
  res.json(t);
};

export const setStatus = async (req, res) => {
  const t = await service.setStatus(req.params.id, req.body.status);
  audit(req, 'update', `${req.body.status === 'closed' ? 'ปิด' : 'เปิด'}โต๊ะ ${t.code}`, t);
  res.json(t);
};

export const remove = async (req, res) => {
  const t = await service.remove(req.params.id);
  audit(req, 'delete', `ลบโต๊ะ ${t?.code ?? req.params.id}`, t ?? { _id: req.params.id });
  res.json({ ok: true });
};
