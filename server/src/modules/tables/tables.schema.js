import { z } from 'zod';
import { TABLE_STATUSES } from '../../models/table.model.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');
const pct = z.coerce.number().min(0).max(100);

const position = z.object({
  x: pct.default(0),
  y: pct.default(0),
  w: pct.default(10),
  h: pct.default(10),
});

const fields = {
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().max(60),
  zone: z.string().trim().min(1).max(40),
  capacity: z.coerce.number().int().min(1).max(30),
  status: z.enum(TABLE_STATUSES),
  extraPerHour: z.coerce.number().min(0).max(10000),
  shape: z.enum(['rect', 'round']),
  position,
  notes: z.string().max(300),
};

export const tableBody = z.object({
  ...fields,
  name: fields.name.default(''),
  zone: fields.zone.default('Main'),
  status: fields.status.default('active'),
  extraPerHour: fields.extraPerHour.default(0),
  shape: fields.shape.default('rect'),
  position: position.default({}),
  notes: fields.notes.default(''),
});

export const tableBodyPartial = z
  .object(fields)
  .partial()
  .refine((o) => Object.values(o).some((v) => v !== undefined), 'nothing to update');

export const statusBody = z.object({ status: z.enum(TABLE_STATUSES) });

export const idParam = z.object({ id: objectId });

export const listQuery = z.object({
  zone: z.string().trim().max(40).optional(),
  status: z.enum(TABLE_STATUSES).optional(),
});

export const floorQuery = z.object({
  startAt: z.coerce.date().optional(),
  durationHours: z.coerce.number().min(0.5).max(12).default(1),
});
