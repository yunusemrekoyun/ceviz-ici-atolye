'use client';

// ── Display helpers ────────────────────────────────────────────────────────────

/** Format raw 11-digit TC string to "123 456 789 12" */
export function formatTc(raw: string | null | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  // Groups: 3-3-3-2
  const parts: string[] = [];
  if (digits.length >  0) parts.push(digits.slice(0,  3));
  if (digits.length >  3) parts.push(digits.slice(3,  6));
  if (digits.length >  6) parts.push(digits.slice(6,  9));
  if (digits.length >  9) parts.push(digits.slice(9, 11));
  return parts.join(' ');
}

/** Mask TC for display: show first 3 and last 2, hide middle: "123 *** *** 12" */
export function maskTc(raw: string | null | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length !== 11) return formatTc(digits);
  return `${digits.slice(0, 3)} *** *** ${digits.slice(9)}`;
}

// ── Component ──────────────────────────────────────────────────────────────────

interface TcInputProps {
  value: string;          // raw digits only, 11 max
  onChange: (raw: string) => void;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

export function TcInput({ value, onChange, className = '', disabled = false, error = false }: TcInputProps) {
  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    onChange(digits);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={formatTc(value)}
      onChange={e => handleChange(e.target.value)}
      disabled={disabled}
      maxLength={14}  // 11 digits + 3 spaces = 14 chars
      placeholder="123 456 789 12"
      className={`control-base font-mono tracking-widest px-3 py-2.5 text-sm disabled:opacity-50 ${
        error ? 'border-red-400/40 focus:border-red-400/60' : 'border-white/10 focus:border-brand-accent/35'
      } ${className}`}
    />
  );
}
