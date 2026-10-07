import { AuditLog } from '../models/audit.model.js';

/**
 * บันทึก audit log — fire-and-forget (ไม่ block request)
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
    ip: req?.ip || req?.headers?.['x-forwarded-for'] || '',
    userAgent: req?.headers?.['user-agent'] || '',
  };
  AuditLog.create(doc).catch((err) => {
    // ไม่ให้ audit พัง request หลัก
    console.error('[audit]', err.message);
  });
}
