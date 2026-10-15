'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { SingleDatePickerModal, startOfDay } from '@/components/ui/CalendarPicker';

// ── Display helper (exported for reuse in display-only contexts) ───────────────

export function formatBirthDate(value: string | null | undefined, tr: boolean): string {
  if (!value) return '';
  try {
    // Handles both "YYYY-MM-DD" and ISO "2026-05-11T00:00:00.000Z"
    const date = value.includes('T')
      ? new Date(value)
      : new Date(value + 'T12:00:00');
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString(tr ? 'tr-TR' : 'en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

interface BirthDateInputProps {
  value: string;          // YYYY-MM-DD or empty
  onChange: (val: string) => void;
  className?: string;
  tr: boolean;
  disabled?: boolean;
  label?: string;
}

export function BirthDateInput({
  value,
  onChange,
  className = '',
  tr,
  disabled = false,
  label,
}: BirthDateInputProps) {
  const [open, setOpen] = useState(false);

  const today   = startOfDay(new Date());
  const dateObj = value ? new Date(value + 'T12:00:00') : null;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(true)}
        className={`control-base flex items-center gap-2 px-3 py-2.5 text-sm text-left disabled:opacity-50 ${className}`}
      >
        <Calendar size={13} className="text-subtle shrink-0" />
        {value ? (
          <span className="text-main">{formatBirthDate(value, tr)}</span>
        ) : (
          <span className="text-faint">{tr ? 'Seçin…' : 'Select…'}</span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <SingleDatePickerModal
            value={dateObj}
            onConfirm={d => {
              const yyyy = d.getFullYear();
              const mm   = String(d.getMonth() + 1).padStart(2, '0');
              const dd   = String(d.getDate()).padStart(2, '0');
              onChange(`${yyyy}-${mm}-${dd}`);
              setOpen(false);
            }}
            onClose={() => setOpen(false)}
            maxDate={today}
            tr={tr}
            label={label ?? (tr ? 'Doğum Tarihi' : 'Date of Birth')}
          />
        )}
      </AnimatePresence>
    </>
  );
}
