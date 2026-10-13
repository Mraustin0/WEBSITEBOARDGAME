// คลาส Tailwind ของแบรนด์ (The Meeple Guild) ที่ใช้ร่วมกันทุกหน้าฝั่งสมาชิก
// ปุ่ม = pill: forest (หลัก) / brick (CTA เด่น, ลบ/ยกเลิก) / cream (รอง) · การ์ด = ขาว/ครีม ขอบหมึกจาง
// สีบนพื้นเข้มใช้ brick-dark เพื่อให้ตัวหนังสือขาวอ่านง่าย (contrast ≥ 4.5:1)

const FOCUS =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-cream-light';
const PILL = `inline-flex items-center justify-center gap-2 rounded-full transition ${FOCUS} disabled:cursor-not-allowed disabled:opacity-50`;

export const BTN = {
  /** ปุ่มหลัก — เขียวป่า */
  primary: `${PILL} bg-forest px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-forest-dark`,
  /** CTA เด่น (จองโต๊ะ / ยืนยัน) — แดงอิฐ */
  cta: `${PILL} bg-brick-dark px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#963a3a]`,
  /** ปุ่มรอง — ครีมขอบหมึก */
  secondary: `${PILL} border border-ink/15 bg-cream-light px-4 py-2 text-xs font-semibold text-forest hover:border-forest/40 hover:bg-cream`,
  /** ปุ่มเงียบ (ยกเลิก/ปิด ใน footer) */
  ghost: `${PILL} px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-cream hover:text-ink`,
  /** ทำลาย/ยกเลิกการจอง — แดงอิฐเต็ม */
  danger: `${PILL} bg-brick-dark px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#963a3a]`,
  /** ทำลายแบบเบา */
  dangerSoft: `${PILL} border border-brick/30 bg-brick-light/50 px-4 py-2 text-xs font-semibold text-brick-dark hover:bg-brick-light`,
};

/** ชิป/ตัวกรอง: เลือก = forest, ไม่เลือก = ครีมขอบหมึกจาง */
export const chip = (on, disabled = false) =>
  `rounded-full border px-3.5 py-2 text-xs font-semibold transition ${FOCUS} ${
    disabled
      ? 'cursor-not-allowed border-ink/5 bg-cream-light text-slate-400'
      : on
        ? 'border-forest bg-forest text-white shadow-sm'
        : 'border-ink/15 bg-cream-light text-slate-700 hover:border-forest/50 hover:bg-cream'
  }`;

/** การ์ดมาตรฐาน */
export const CARD = 'rounded-2xl border border-ink/10 bg-white shadow-card';
/** การ์ดย่อย/กล่องข้อมูลบนพื้นครีม */
export const PANEL = 'rounded-2xl border border-ink/10 bg-cream-light';

/** ช่องกรอก / select / textarea */
export const INPUT =
  'w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400 transition focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20 disabled:cursor-not-allowed disabled:opacity-50';

/** หัวข้อเล็กเหนือฟิลด์ */
export const LABEL = 'text-[11px] font-bold uppercase tracking-wider text-slate-500';

/** badge สถานะ (มีข้อความเสมอ ไม่ใช้สีอย่างเดียว) */
export const BADGE = {
  bgg: 'bg-mustard text-ink border border-ink/20',
  available: 'bg-teal text-white',
  reserved: 'bg-mustard text-ink',
  inPlay: 'bg-brick-dark text-white',
  closed: 'bg-slate-500 text-white',
};

/** กล่องแจ้งเตือน */
export const ALERT = {
  error: 'rounded-2xl border border-brick/30 bg-brick-light/60 text-brick-dark',
  warn: 'rounded-xl border border-mustard/50 bg-mustard-light/60 text-slate-800',
  ok: 'rounded-2xl border border-forest-200 bg-forest-50 text-forest-800',
};

/** ตัวหนังสือ error สั้น ๆ */
export const ERROR_TEXT = 'text-xs font-semibold text-brick-dark';
