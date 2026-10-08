import { Shift } from '../../models/shift.model.js';
import { User } from '../../models/user.model.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { logAudit } from '../../lib/audit.js';
import { localDayRange, toLocalDateString } from '../../lib/time.js';

const POPULATE = { path: 'user', select: 'username displayName role avatar' };

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** ช่วงเวลาจริงของกะ [start, end) (end ≤ start = เลิกหลังเที่ยงคืน) */
export function shiftRange({ date, start, end }) {
  const day = localDayRange(date).start.getTime();
  const s = day + toMin(start) * 60_000;
  let e = day + toMin(end) * 60_000;
  if (e <= s) e += 24 * 60 * 60_000;
  return { startAt: new Date(s), endAt: new Date(e) };
}

const decorate = (shift, now = new Date()) => {
  const doc = shift.toObject ? shift.toObject() : shift;
  const { startAt, endAt } = shiftRange(doc);
  return { ...doc, startAt, endAt, onDuty: startAt <= now && now < endAt };
};

async function assertStaff(userId) {
  const user = await User.findById(userId).select('role').lean();
  if (!user) throw notFound('user not found');
  if (user.role === 'user') throw badRequest('shift user must be staff (not a member)');
}

/** กะของวัน (default วันนี้) หรือช่วงวัน from..to */
export async function list({ date, from, to }) {
  const filter = {};
  if (from || to) filter.date = { $gte: from ?? to, $lte: to ?? from };
  else filter.date = date ?? toLocalDateString(new Date());
  const rows = await Shift.find(filter).populate(POPULATE).sort({ date: 1, start: 1 }).lean();
  const now = new Date();
  const items = rows.map((r) => decorate(r, now));
  return { items, onDutyNow: items.filter((s) => s.onDuty).length };
}

export async function create(data, actor) {
  await assertStaff(data.user);
  const shift = await Shift.create({ ...data, createdBy: actor._id });
  logAudit({
    actor,
    action: 'create',
    module: 'users',
    summary: `เพิ่มกะ ${data.date} ${data.start}-${data.end}`,
    targetType: 'Shift',
    targetId: shift._id,
  });
  return decorate(await shift.populate(POPULATE));
}

export async function update(id, data, actor) {
  if (data.user) await assertStaff(data.user);
  const shift = await Shift.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!shift) throw notFound('shift not found');
  logAudit({
    actor,
    action: 'update',
    module: 'users',
    summary: `แก้กะ ${shift.date} ${shift.start}-${shift.end}`,
    targetType: 'Shift',
    targetId: shift._id,
  });
  return decorate(await shift.populate(POPULATE));
}

export async function remove(id, actor) {
  const shift = await Shift.findByIdAndDelete(id);
  if (!shift) throw notFound('shift not found');
  logAudit({
    actor,
    action: 'delete',
    module: 'users',
    summary: `ลบกะ ${shift.date} ${shift.start}-${shift.end}`,
    targetType: 'Shift',
    targetId: shift._id,
  });
  return { ok: true };
}
