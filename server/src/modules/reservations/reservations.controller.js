import * as service from './reservations.service.js';
import { logAudit } from '../../lib/audit.js';
import { isStaffRole } from '../../lib/permissions.js';

const label = (r) => `${r.table?.code ?? ''} ${r.user?.username ?? r.customer?.name ?? ''}`.trim();

/** บันทึกกิจกรรมของพนักงาน (หน้า 9 Audit Trail) */
const audit = (req, action, summary, r, meta) =>
  logAudit({
    req,
    action,
    module: 'reservations',
    summary,
    targetType: 'Reservation',
    targetId: r?._id,
    meta,
  });

export const rules = async (_req, res) => res.json(await service.rules());

export const markNoShow = async (req, res) => {
  const r = await service.markNoShow(req.params.id, req.user);
  audit(req, 'no_show', `ลูกค้าไม่มา (no-show) ${label(r)}`, r);
  res.json(r);
};

export const availability = async (req, res) => res.json(await service.availability(req.query));

export const quote = async (req, res) => res.json(await service.quote(req.user._id, req.body));

export const create = async (req, res) =>
  res.status(201).json(await service.create(req.user._id, req.body));

export const listMine = async (req, res) =>
  res.json(await service.listMine(req.user._id, req.query));

export const detail = async (req, res) => res.json(await service.getById(req.params.id, req.user));

export const update = async (req, res) =>
  res.json(await service.update(req.params.id, req.user, req.body));

export const cancel = async (req, res) => {
  const r = await service.cancel(req.params.id, req.user, req.body.reason);
  if (isStaffRole(req.user)) audit(req, 'cancel', `ยกเลิกการจอง ${label(r)}`, r, req.body);
  res.json(r);
};

export const returnGame = async (req, res) => {
  const r = await service.returnGame(req.params.id, req.user, req.body);
  if (isStaffRole(req.user)) {
    audit(req, 'return', `รับคืนเกม/เช็คบิล ${label(r)} ฿${r.checkout?.total ?? ''}`, r, req.body);
  }
  res.json(r);
};

export const checkoutPreview = async (req, res) =>
  res.json(await service.checkoutPreview(req.params.id, req.user));

export const setGame = async (req, res) =>
  res.json(await service.setGame(req.params.id, req.user, req.body.game));

export const pay = async (req, res) => {
  const r = await service.pay(req.params.id, req.user, req.body.method);
  audit(req, 'pay', `รับชำระ ฿${r.payment?.amount} (${r.payment?.method}) ${label(r)}`, r);
  res.json(r);
};

export const adminCreate = async (req, res) => {
  const r = await service.adminCreate(req.user, req.body);
  audit(req, 'create', `เปิดโต๊ะ/จองแทนลูกค้า ${label(r)}`, r);
  res.status(201).json(r);
};

export const adminList = async (req, res) => res.json(await service.adminList(req.query));

export const adminRemove = async (req, res) => {
  const r = await service.adminRemove(req.params.id);
  audit(req, 'delete', `ลบการจอง ${r._id}`, r);
  res.json({ ok: true });
};

export const extend = async (req, res) => {
  const r = await service.extend(req.params.id, req.user, req.body.hours);
  if (isStaffRole(req.user)) audit(req, 'update', `ต่อเวลา ${req.body.hours} ชม. ${label(r)}`, r);
  res.json(r);
};

export const confirm = async (req, res) => {
  const r = await service.confirm(req.params.id, req.user);
  audit(req, 'confirm', `ยืนยันการจอง ${label(r)}`, r);
  res.json(r);
};
