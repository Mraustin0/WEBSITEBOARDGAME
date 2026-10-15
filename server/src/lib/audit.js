import crypto from 'node:crypto';
import { AuditLog } from '../models/audit.model.js';
import { logger } from './logger.js';

// Tamper-proof log: แต่ละรายการเก็บ hash ของตัวเอง + hash ของรายการก่อนหน้า (hash chain)
// ถ้ามีคนแก้/ลบรายการกลางทาง → hash ไม่ต่อกัน → /api/audit/verify จะเจอ
export const GENESIS = '0'.repeat(64);

/** hash ของรายการ (เฉพาะ field ที่ไม่เปลี่ยน) */
export function hashOf(doc, prevHash) {
  const payload = [
    prevHash,
    doc.seq,
    new Date(doc.createdAt).toISOString(),
    String(doc.actor ?? ''),
    doc.actorName,
    doc.action,
    doc.module,
    doc.targetType ?? '',
    doc.targetId ?? '',
    doc.summary,
  ].join('|');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// เขียนทีละรายการตามลำดับ (กัน chain แตกเมื่อมีหลาย request พร้อมกัน)
let queue = Promise.resolve();

/** อ่าน head จาก DB ทุกครั้ง — script อื่น (seed, bgg:refresh) อาจเขียน audit จาก process อื่นไปแล้ว */
async function lastHead() {
  const last = await AuditLog.findOne().sort({ seq: -1 }).select('seq hash').lean();
  return last?.hash ? { seq: last.seq, hash: last.hash } : { seq: 0, hash: GENESIS };
}

async function append(doc) {
  // seq เป็น unique → ถ้าอีก process เขียนตัดหน้า (E11000) อ่าน head ใหม่แล้วลองอีกครั้ง
  for (let attempt = 0; ; attempt++) {
    const prev = await lastHead();
    const entry = { ...doc, seq: prev.seq + 1, createdAt: new Date(), prevHash: prev.hash };
    entry.hash = hashOf(entry, prev.hash);
    try {
      await AuditLog.create(entry);
      return;
    } catch (err) {
      if (err?.code !== 11000 || attempt >= 4) throw err;
    }
  }
}

/** รอให้ audit ที่ค้างในคิวเขียนเสร็จ (ใช้ในเทส / ก่อน verify) */
export function flushAudit() {
  return queue;
}

/** (คงไว้ให้เทสเดิมเรียกได้) — ตอนนี้อ่าน head จาก DB ทุกครั้งแล้ว ไม่มี cache ให้ล้าง */
export function resetAuditHead() {}

/**
 * บันทึก audit log — fire-and-forget (ไม่ block request, error แค่ log)
 * @param {object} opts
 * @param {import('express').Request} [opts.req]
 * @param {object} [opts.actor] - user doc
 * @param {string} opts.action
 * @param {string} opts.module
 * @param {string} opts.summary
 * @param {string} [opts.targetType]
 * @param {string} [opts.targetId]
 * @param {object} [opts.meta]
 */
export function logAudit({
  req,
  actor,
  action,
  module,
  summary,
  targetType = '',
  targetId = '',
  meta = {},
}) {
  const user = actor || req?.user;
  const doc = {
    actor: user?._id ?? null,
    actorName: user?.username || user?.displayName || 'system',
    actorRole: user?.role || '',
    action,
    module,
    summary,
    targetType,
    targetId: targetId ? String(targetId) : '',
    meta,
    ip: req?.ip || '', // req.ip เคารพ TRUST_PROXY — ไม่อ่าน X-Forwarded-For ตรง ๆ (ปลอมได้)
    userAgent: req?.headers?.['user-agent'] || '',
  };
  queue = queue
    .then(() => append(doc))
    .catch((err) => {
      logger.warn({ err }, 'audit log failed'); // ไม่ให้ audit พัง request หลัก
    });
}
