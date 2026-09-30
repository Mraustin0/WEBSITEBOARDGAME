import { z } from 'zod';
import { PAYMENT_METHODS, RESERVATION_STATUSES, SOURCES } from '../../models/reservation.model.js';
import { PACKAGES, RULES } from './reservations.rules.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');

// ขอบเขตจริง (min/max ชม.) ตั้งได้ในหน้าตั้งค่าร้าน → ตรวจใน service อีกชั้น
const hours = z.coerce
  .number()
  .min(0.5)
  .max(12)
  .refine((v) => Number.isInteger(v * 2), 'durationHours must be in 0.5 hour steps');

const players = z.coerce.number().int().min(1).max(30);
const pkg = z.enum(PACKAGES);
const note = z.string().trim().max(300);

// แพ็กเกจเหมา 3 ชม. ต้องจอง 3 ชม. พอดี
const flatNeeds3h = (o) =>
  o.package !== 'flat3h' || o.durationHours === undefined || o.durationHours === RULES.FLAT_HOURS;
const flatMsg = {
  message: `flat3h package must be ${RULES.FLAT_HOURS} hours`,
  path: ['durationHours'],
};

export const bookingBody = z
  .object({
    table: objectId,
    game: objectId.nullish(),
    players,
    startAt: z.coerce.date(),
    durationHours: hours,
    package: pkg.default('hourly'),
    note: note.default(''),
  })
  .refine(flatNeeds3h, flatMsg);

export const updateBody = z
  .object({
    table: objectId,
    game: objectId.nullable(),
    players,
    startAt: z.coerce.date(),
    durationHours: hours,
    package: pkg,
    note,
  })
  .partial()
  .refine((o) => Object.values(o).some((v) => v !== undefined), 'nothing to update')
  .refine(flatNeeds3h, flatMsg);

/**
 * Admin เปิดโต๊ะ / เพิ่มการจองแทนลูกค้า
 * - ไม่ส่ง startAt = เริ่มเดี๋ยวนี้ (walk-in)
 * - ลูกค้าเป็นสมาชิก → ส่ง user, ไม่ใช่สมาชิก → ส่ง customer.name (และ phone)
 */
export const adminBookingBody = z
  .object({
    table: objectId,
    game: objectId.nullish(),
    players,
    startAt: z.coerce.date().optional(),
    durationHours: hours,
    package: pkg.default('hourly'),
    user: objectId.optional(),
    customer: z
      .object({
        name: z.string().trim().max(80).default(''),
        phone: z.string().trim().max(30).default(''),
      })
      .default({}),
    note: note.default(''),
  })
  .refine(flatNeeds3h, flatMsg)
  .refine((o) => o.user || o.customer.name || o.customer.phone, {
    message: 'need user or customer name/phone',
    path: ['customer'],
  });

export const setGameBody = z.object({ game: objectId.nullable() });

export const returnBody = z.object({
  condition: z.enum(['good', 'damaged']).default('good'),
  damageNote: z.string().trim().max(500).default(''),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(), // admin เก็บเงินพร้อมคืนเกม
});

export const payBody = z.object({ method: z.enum(PAYMENT_METHODS) });

export const cancelBody = z.object({ reason: note.default('') });

export const idParam = z.object({ id: objectId });

const pagination = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
};

export const listQuery = z.object({
  scope: z.enum(['active', 'upcoming', 'past', 'all']).default('all'),
  q: z.string().trim().min(1).max(80).optional(), // ค้นรหัส/ชื่อโต๊ะ หรือชื่อเกม
  ...pagination,
});

export const adminListQuery = z
  .object({
    date: dateStr.optional(), // วันเดียว
    from: dateStr.optional(), // หรือช่วงวัน (สัปดาห์ / เดือน)
    to: dateStr.optional(),
    status: z.enum(RESERVATION_STATUSES).optional(),
    table: objectId.optional(),
    zone: z.string().trim().max(40).optional(),
    user: objectId.optional(),
    game: objectId.optional(),
    source: z.enum(SOURCES).optional(),
    payment: z.enum(['unpaid', 'paid']).optional(),
    q: z.string().trim().min(1).max(80).optional(), // ค้นชื่อ/เบอร์ลูกค้า walk-in
    ...pagination,
  })
  .refine((o) => !o.from || !o.to || o.from <= o.to, 'from must be <= to');

export const availabilityQuery = z.object({
  startAt: z.coerce.date(),
  durationHours: hours.default(1),
  players: players.optional(),
});
