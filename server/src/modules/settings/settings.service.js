import { Settings } from '../../models/settings.model.js';
import { badRequest } from '../../lib/errors.js';
import { DEFAULT_DAYS, RULES } from '../reservations/reservations.rules.js';

const CACHE_MS = 10_000;
let cache = null;

export function clearSettingsCache() {
  cache = null;
}

/** โหลดการตั้งค่าร้าน (สร้างค่า default ถ้ายังไม่มี) — cache 10 วินาที */
export async function getSettings() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.doc;
  let doc = await Settings.findOne({ key: 'store' }).lean();
  if (!doc) {
    try {
      doc = (await Settings.create({ key: 'store' })).toObject();
    } catch (err) {
      if (err.code !== 11000) throw err; // มีอีก request สร้างไปพร้อมกัน
      doc = await Settings.findOne({ key: 'store' }).lean();
    }
  }
  cache = { at: Date.now(), doc };
  return doc;
}

/** แปลง settings → object กฎที่ reservations.rules.js ใช้ */
export function rulesFromSettings(s) {
  return {
    ...RULES,
    PRICE_PER_PERSON_HOUR: s?.pricing?.perPersonHour ?? RULES.PRICE_PER_PERSON_HOUR,
    FLAT_3H_PER_PERSON: s?.pricing?.flat3hPerPerson ?? RULES.FLAT_3H_PER_PERSON,
    MAX_ADVANCE_DAYS: s?.booking?.maxAdvanceDays ?? RULES.MAX_ADVANCE_DAYS,
    MIN_HOURS: s?.booking?.minHours ?? RULES.MIN_HOURS,
    MAX_HOURS: s?.booking?.maxHours ?? RULES.MAX_HOURS,
    OVERTIME_GRACE_MIN: s?.booking?.overtimeGraceMin ?? RULES.OVERTIME_GRACE_MIN,
    EXTRA_SEATS: s?.booking?.extraSeats ?? RULES.EXTRA_SEATS,
    CANCEL_CUTOFF_HOURS: s?.booking?.cancelCutoffHours ?? RULES.CANCEL_CUTOFF_HOURS,
    OPERATING: {
      enforce: s?.operatingHours?.enforce ?? false,
      days: s?.operatingHours?.days?.length ? s.operatingHours.days : DEFAULT_DAYS,
    },
    REVENUE_TARGET_PER_DAY: s?.pricing?.revenueTargetPerDay ?? 0,
    NO_SHOW_GRACE_MIN: s?.noShow?.graceMin ?? 30,
    NO_SHOW_SUSPEND_AFTER: s?.noShow?.suspendAfter ?? 3,
  };
}

export async function getRules() {
  return rulesFromSettings(await getSettings());
}

/** { a: { b: 1 } } → { 'a.b': 1 } (array แทนที่ทั้งก้อน) */
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      flatten(v, path, out);
    } else if (v !== undefined) {
      out[path] = v;
    }
  }
  return out;
}

export async function updateSettings(patch, adminId) {
  const current = await getSettings();
  const minHours = patch.booking?.minHours ?? current.booking?.minHours ?? RULES.MIN_HOURS;
  const maxHours = patch.booking?.maxHours ?? current.booking?.maxHours ?? RULES.MAX_HOURS;
  if (minHours > maxHours) throw badRequest('booking.minHours must be <= booking.maxHours');

  const doc = await Settings.findOneAndUpdate(
    { key: 'store' },
    { $set: { ...flatten(patch), updatedBy: adminId } },
    { new: true, runValidators: true },
  ).lean();
  clearSettingsCache();
  return doc;
}
