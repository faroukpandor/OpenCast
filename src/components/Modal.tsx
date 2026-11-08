import React, { useEffect, useRef } from 'react';
export function Modal({ children,onClose,label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow='hidden';
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select,[tabindex="0"]') || []);
    focusable()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') { const items=focusable(); const first=items[0]; const last=items[items.length-1]; if (e.shiftKey && document.activeElement===first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement===last) { e.preventDefault(); first?.focus(); } }
    };
    document.addEventListener('keydown',key);
    return () => { document.body.style.overflow=overflow; document.removeEventListener('keydown',key); previous?.focus(); };
  },[]);
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target===e.currentTarget) onClose(); }}><div ref={ref} role="dialog" aria-modal="true" aria-label={label} className="w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-6">{children}</div></div>;
}
