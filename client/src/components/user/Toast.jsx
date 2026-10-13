// ข้อความแจ้งผลแบบลอยมุมจอ (แทน alert()) — ใช้ร่วมกันทุกหน้าฝั่งสมาชิก
// const [toastEl, showToast] = useToast(); showToast('บันทึกแล้ว'); showToast('ผิดพลาด', false)
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
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] max-w-[calc(100vw-32px)] px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-2 ${
        toast.ok ? 'bg-emerald-700 text-white' : 'bg-red-600 text-white'
      }`}
    >
      <i className={`fa-solid ${toast.ok ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
      <span>{toast.msg}</span>
    </div>
  ) : null;

  return [el, show];
}
