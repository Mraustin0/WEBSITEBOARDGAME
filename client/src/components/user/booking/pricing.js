// ราคาประมาณฝั่ง client (ใช้ตอนยังไม่ login / ยังไม่เลือกโต๊ะ) — รูปแบบเดียวกับ price จาก POST /reservations/quote
// ไม่คิดช่วง peak (server เป็นตัวคิดราคาจริง)

export const baht = (n) => `฿${Math.round(Number(n) || 0).toLocaleString('th-TH')}`;

export function estimatePrice({
  rules,
  players,
  hours,
  pkg = 'hourly',
  extraPerHour = 0,
  student,
}) {
  if (!rules) return null;
  const perPerson = rules.PRICE_PER_PERSON_HOUR ?? 0;
  const flat = pkg === 'flat3h';
  const subtotal = Math.round(
    flat
      ? players * (rules.FLAT_3H_PER_PERSON ?? 0) + (rules.FLAT_HOURS ?? 3) * extraPerHour
      : players * perPerson * hours + extraPerHour * hours,
  );
  const pct = student && rules.STUDENT?.enabled ? (rules.STUDENT.percent ?? 0) : 0;
  const discount = Math.round((subtotal * pct) / 100);
  const total = subtotal - discount;
  const deposit = Math.min(
    total,
    Math.round(players * (rules.DEPOSIT?.perPerson ?? 0) + (rules.DEPOSIT?.perTable ?? 0)),
  );
  return {
    total,
    package: pkg,
    perPersonHour: perPerson,
    tableExtraPerHour: extraPerHour,
    players,
    hours,
    ...(discount ? { subtotal, studentDiscountPercent: pct, discount } : {}),
    ...(deposit ? { deposit, dueAtCounter: total - deposit } : {}),
  };
}
