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
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/55 backdrop-blur-sm sm:items-center sm:p-4"
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
        className={`relative flex max-h-[92vh] w-full ${size} flex-col overflow-hidden rounded-t-3xl border border-ink/15 bg-white text-ink shadow-2xl outline-none sm:rounded-3xl`}
      >
        {/* หัว modal: แถบลายบอร์ดเกม + พื้นครีม */}
        <div aria-hidden="true" className="board-border h-1.5 w-full shrink-0" />
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 bg-cream px-5 pb-3 pt-4 sm:px-6">
          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-brick-dark">
                {eyebrow}
              </p>
            )}
            <h2 id={titleId} className="font-heading text-xl leading-snug text-forest">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="ปิดหน้าต่าง"
            className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-cream-light text-slate-500 transition hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-forest disabled:opacity-40"
          >
            <i className="fa-solid fa-xmark text-lg" aria-hidden="true"></i>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink/10 bg-cream-light px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
