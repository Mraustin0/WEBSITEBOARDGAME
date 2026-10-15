// ข้อความแจ้งผลแบบลอย (แทน alert()) — ใช้ร่วมกันทุกหน้าฝั่งสมาชิก
// const [toastEl, showToast] = useToast(); showToast('บันทึกแล้ว'); showToast('ผิดพลาด', false)
// มือถือ: ลอยด้านล่าง (สูงกว่าแถบปุ่มของ modal) · จอใหญ่: มุมบนใต้ header — กดทะลุได้ ไม่บังปุ่ม
import { useCallback, useEffect, useRef, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null); // { msg, ok }
  const timer = useRef(null);

  const show = useCallback((msg, ok = true) => {
    clearTimeout(timer.current);
    setToast({ msg, ok });
    timer.current = setTimeout(() => setToast(null), ok ? 3000 : 5000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const el = toast ? (
    <div
      role={toast.ok ? 'status' : 'alert'}
      className={`pointer-events-none fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[100] mx-auto flex max-w-sm items-start gap-2.5 rounded-2xl border px-4 py-2.5 text-[13px] font-semibold leading-snug shadow-card sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-20 sm:w-max sm:-translate-x-1/2 ${
        toast.ok
          ? 'border-forest-dark bg-forest text-white'
          : 'border-[#8f3535] bg-brick-dark text-white'
      }`}
    >
      <i
        className={`fa-solid ${toast.ok ? 'fa-circle-check text-mustard' : 'fa-circle-exclamation text-brick-light'} mt-0.5 shrink-0`}
        aria-hidden="true"
      ></i>
      <span className="line-clamp-3 min-w-0">{toast.msg}</span>
    </div>
  ) : null;

  return [el, show];
}
