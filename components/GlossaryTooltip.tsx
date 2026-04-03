'use client';

import { useState, useRef, useEffect } from 'react';
import { glossary } from '@/lib/glossary';

interface GlossaryTooltipProps {
  termKey: string;
  children: React.ReactNode;
}

export default function GlossaryTooltip({ termKey, children }: GlossaryTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  const entry = glossary[termKey];
  if (!entry) return <>{children}</>;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex items-center gap-1">
      {children}
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-full border border-[#EEEDEB] text-[#73726C] hover:text-[#1A1A18] hover:border-[#C2C0B6] transition-colors"
        aria-label={`Définition de ${entry.term}`}
      >
        i
      </button>
      {open && (
        <span className="absolute z-50 left-0 top-full mt-1 w-64 bg-white border border-[#EEEDEB] rounded-[8px] p-3 text-[13px] font-normal text-[#1A1A18] shadow-[0_1px_4px_rgba(0,0,0,.06)]">
          <span className="font-medium text-[#1A1A18] block mb-1">{entry.term}</span>
          <span className="text-[#73726C]">{entry.definition}</span>
        </span>
      )}
    </span>
  );
}
