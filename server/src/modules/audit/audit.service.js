import { AuditLog } from '../../models/audit.model.js';
import { GENESIS, flushAudit, hashOf } from '../../lib/audit.js';
import { localDayRange, toLocalDateString } from '../../lib/time.js';

function buildFilter({ from, to, actor, action, module, q }) {
  const filter = {};
  if (actor) filter.actor = actor;
  if (action) filter.action = action;
  if (module) filter.module = module;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = localDayRange(from).start;
    if (to) filter.createdAt.$lt = localDayRange(to).end;
  }
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ summary: rx }, { actorName: rx }, { targetId: rx }];
  }
  return filter;
}

export async function list(query) {
  const { page, limit } = query;
  const filter = buildFilter(query);
  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actor', 'username email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function summary({ date } = {}) {
  const day = date || toLocalDateString(new Date());
  const { start, end } = localDayRange(day);
  const rows = await AuditLog.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $group: { _id: '$action', count: { $sum: 1 } } },
  ]);
  const byAction = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const total = rows.reduce((s, r) => s + r.count, 0);
  const topActors = await AuditLog.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end }, actor: { $ne: null } } },
    { $group: { _id: '$actor', name: { $first: '$actorName' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
  return { date: day, total, byAction, topActors };
}

export async function exportCsv(query) {
  const filter = buildFilter(query);
  const items = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(5000).lean();
  const header = [
    'createdAt',
    'actor',
    'role',
    'action',
    'module',
    'summary',
    'targetType',
    'targetId',
    'ip',
  ];
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [header.join(',')];
  for (const r of items) {
    lines.push(
      [
        r.createdAt?.toISOString?.() || '',
        r.actorName,
        r.actorRole,
        r.action,
        r.module,
        r.summary,
        r.targetType,
        r.targetId,
        r.ip,
      ]
        .map(escape)
        .join(','),
    );
  }
  const from = query.from || 'all';
  const to = query.to || 'all';
  return { filename: `audit_${from}_${to}.csv`, csv: `\uFEFF${lines.join('\n')}` }; // BOM สำหรับ Excel
}

/**
 * ตรวจ hash chain ทั้งหมด (Integrity Verification Badge)
 * valid = ทุกรายการ hash ถูกต้องและต่อกับรายการก่อนหน้า
 */
export async function verify() {
  await flushAudit();
  const cursor = AuditLog.find({ seq: { $exists: true } })
    .sort({ seq: 1 })
    .select('seq createdAt actor actorName action module targetType targetId summary prevHash hash')
    .lean()
    .cursor();
  let prev = GENESIS;
  let expectedSeq = null;
  let checked = 0;
  for await (const doc of cursor) {
    const broken =
      (expectedSeq !== null && doc.seq !== expectedSeq) ||
      doc.prevHash !== prev ||
      hashOf(doc, prev) !== doc.hash;
    if (broken && checked > 0) {
      return { valid: false, checked, brokenAt: { _id: doc._id, seq: doc.seq }, lastHash: prev };
    }
    // รายการแรกที่เจออาจต่อจากข้อมูลเก่าที่ถูกลบตาม retention → เริ่ม chain จากตัวมัน
    if (broken && hashOf(doc, doc.prevHash) !== doc.hash) {
      return { valid: false, checked, brokenAt: { _id: doc._id, seq: doc.seq }, lastHash: prev };
    }
    prev = doc.hash;
    expectedSeq = doc.seq + 1;
    checked += 1;
  }
  return { valid: true, checked, brokenAt: null, lastHash: prev };
}
