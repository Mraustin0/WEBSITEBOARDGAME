// กล่อง modal กลางจอ (มือถือ = แผ่นเลื่อนขึ้นจากล่าง) — ปิดด้วย Esc / คลิกพื้นหลัง / ปุ่ม ×
// busy = กำลังส่งข้อมูล → ไม่ให้ปิดระหว่างรอ
import { useEffect, useId, useRef } from 'react';

export default function Modal({
  title,
  eyebrow,
  subtitle,
  onClose,
  busy = false,
  size = 'max-w-lg',
  children,
  footer,
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);

  useEffect(() => {
    closeRef.current = onClose;
    busyRef.current = busy;
  }, [onClose, busy]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && !busyRef.current) closeRef.current?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full ${size} flex-col rounded-t-3xl border border-slate-100 bg-white text-emerald-950 shadow-2xl outline-none sm:rounded-3xl`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pb-3 pt-5 sm:px-6">
          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                {eyebrow}
              </p>
            )}
            <h2 id={titleId} className="text-lg font-bold leading-snug">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="ปิดหน้าต่าง"
            className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
          >
            <i className="fa-solid fa-xmark text-lg" aria-hidden="true"></i>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
