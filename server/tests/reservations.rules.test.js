import { describe, expect, it } from 'vitest';
import {
  RULES,
  bookingWindowError,
  calcCheckout,
  calcPrice,
  computeEnd,
  conflictFilter,
  overlaps,
} from '../src/modules/reservations/reservations.rules.js';
import { eachLocalDate, localDayRange, toLocalDateString } from '../src/lib/time.js';

const H = 60 * 60 * 1000;

describe('reservation rules (unit)', () => {
  it('computes end time from duration', () => {
    const start = new Date('2026-10-01T10:00:00Z');
    expect(computeEnd(start, 2.5).toISOString()).toBe('2026-10-01T12:30:00.000Z');
  });

  it('calculates price = hours × (players × rate + table extra)', () => {
    const p = calcPrice({ players: 4, durationHours: 2, tableExtraPerHour: 100 });
    expect(p.total).toBe(2 * (4 * RULES.PRICE_PER_PERSON_HOUR + 100));
    expect(p.players).toBe(4);
    expect(p.hours).toBe(2);
  });

  it('rejects bookings in the past or more than 3 days ahead', () => {
    const now = new Date('2026-10-01T10:00:00Z');
    expect(bookingWindowError(new Date(now.getTime() - 60 * 60 * 1000), now)).toMatch(/past/);
    expect(bookingWindowError(new Date(now.getTime() - 5 * 60 * 1000), now)).toBeNull();
    expect(bookingWindowError(new Date(now.getTime() + 3 * 24 * H), now)).toBeNull();
    expect(bookingWindowError(new Date(now.getTime() + 3 * 24 * H + 1), now)).toMatch(/3 days/);
  });

  it('detects overlapping intervals (touching edges are not overlap)', () => {
    const t = (h) => new Date(Date.UTC(2026, 9, 1, h));
    expect(overlaps(t(10), t(12), t(11), t(13))).toBe(true);
    expect(overlaps(t(10), t(12), t(12), t(14))).toBe(false);
    expect(overlaps(t(10), t(12), t(8), t(10))).toBe(false);
  });

  it('conflict filter blocks overdue "playing" only for slots starting soon', () => {
    const now = new Date('2026-10-01T10:00:00Z');
    const soon = conflictFilter({ startAt: now, endAt: new Date(now.getTime() + H) }, now);
    expect(soon.$or).toContainEqual({ status: 'playing' });
    const later = new Date(now.getTime() + 5 * H);
    const far = conflictFilter({ startAt: later, endAt: new Date(later.getTime() + H) }, now);
    expect(far.$or).toHaveLength(1);
  });
});

describe('time helpers (Asia/Bangkok)', () => {
  it('local day starts at 17:00Z of the previous UTC day', () => {
    const { start, end } = localDayRange('2026-10-12');
    expect(start.toISOString()).toBe('2026-10-11T17:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-12T17:00:00.000Z');
  });

  it('formats a UTC instant as Thai local date', () => {
    expect(toLocalDateString(new Date('2026-10-11T18:00:00Z'))).toBe('2026-10-12');
  });

  it('lists every day in a range inclusive', () => {
    expect(eachLocalDate('2026-09-29', '2026-10-02')).toEqual([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
  });
});

describe('packages + checkout (unit)', () => {
  it('flat3h package = players × 130 + 3 × table extra', () => {
    const p = calcPrice({ players: 4, durationHours: 3, tableExtraPerHour: 100, pkg: 'flat3h' });
    expect(p.total).toBe(4 * RULES.FLAT_3H_PER_PERSON + 3 * 100);
    expect(p.package).toBe('flat3h');
  });

  const base = { durationHours: 2, players: 3, tableExtraPerHour: 0, bookedTotal: 300 };
  const start = new Date('2026-10-01T10:00:00Z');
  const at = (min) => new Date(start.getTime() + min * 60 * 1000);

  it('no overtime when finishing early or within grace period', () => {
    expect(calcCheckout({ ...base, startedAt: start, now: at(60) }).total).toBe(300);
    expect(calcCheckout({ ...base, startedAt: start, now: at(130) }).overtimeCharge).toBe(0);
  });

  it('overtime rounds up to half hours at hourly rate', () => {
    const bill = calcCheckout({ ...base, startedAt: start, now: at(135) }); // เกิน 15 นาที
    expect(bill.actualMinutes).toBe(135);
    expect(bill.overtimeHours).toBe(0.5);
    expect(bill.overtimeCharge).toBe(0.5 * 3 * RULES.PRICE_PER_PERSON_HOUR);
    expect(bill.total).toBe(300 + 75);
    expect(calcCheckout({ ...base, startedAt: start, now: at(185) }).overtimeHours).toBe(1.5);
  });
});
