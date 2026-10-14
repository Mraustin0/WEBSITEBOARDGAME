// ข้อความ error ใต้ช่องกรอก (แดงอิฐ + ไอคอน) — ใช้ id เดียวกับ aria-describedby ของช่องนั้น
// variant="member" ใช้ Tailwind (หน้าสมาชิก), variant="admin" ใช้คลาส .vf-error ใน index.css (หน้าหลังร้าน)

export default function FieldError({ id, msg, variant = 'member', className = '' }) {
  if (!msg) return null;
  const cls =
    variant === 'admin'
      ? 'vf-error'
      : 'mt-1.5 text-xs font-semibold text-brick-dark flex items-start gap-1.5';
  return (
    <p id={id} className={`${cls} ${className}`.trim()}>
      <i className="fa-solid fa-circle-exclamation mt-0.5" aria-hidden="true"></i>
      <span>{msg}</span>
    </p>
  );
}

/** บรรทัดคำแนะนำใต้ช่อง (เช่น กติการหัสผ่าน) */
export function FieldHint({ id, children, variant = 'member', className = '' }) {
  const cls = variant === 'admin' ? 'vf-hint' : 'mt-1.5 text-xs text-slate-500';
  return (
    <p id={id} className={`${cls} ${className}`.trim()}>
      {children}
    </p>
  );
}

export const PASSWORD_HINT = 'อย่างน้อย 8 ตัว มีตัวอักษรภาษาอังกฤษและตัวเลข';
