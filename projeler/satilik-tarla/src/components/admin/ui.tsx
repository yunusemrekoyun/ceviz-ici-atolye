'use client';

import type {
  ReactNode,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
} from 'react';
import { useFormStatus } from 'react-dom';
import { Save } from 'lucide-react';
import { cn } from '@/lib/utils';

/* Eski panelin görsel dili aynen korunur: krem kartlar (#FAF7EF), çam yeşili
 * aksiyonlar (#3d5638), adaçayı kaydet butonu (#85AB8B), #D9E3D5 çerçeveler. */

export function Card({
  title,
  children,
  actions,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn('rounded-2xl border border-[#D9E3D5] bg-[#FAF7EF] p-5 sm:p-6', className)}
    >
      {title ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium text-[#1f2a1d]">{title}</h2>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export const inputClass =
  'w-full rounded-xl border border-[#D9E3D5] bg-white px-3 py-2 text-sm text-[#1f2a1d] outline-none focus:border-[#3d5638]';

export function Field({
  label,
  htmlFor,
  children,
  error,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  error?: string[];
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-1 block text-xs font-medium text-[#4b5b47]">{label}</span>
      {children}
      {error?.length ? <span className="mt-1 block text-xs text-red-600">{error[0]}</span> : null}
    </label>
  );
}

export function AdminInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function AdminTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, props.className)} />;
}

export function AdminSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputClass, props.className)} />;
}

/** Adaçayı "Kaydet" — form içinde bekleme durumunu kendisi gösterir. */
export function SubmitButton({
  children = 'Kaydet',
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-[#85AB8B] px-4 py-1.5 text-sm font-medium text-[#1f2a1d] transition-colors hover:bg-[#9bbfa0] disabled:opacity-60',
        className,
      )}
    >
      <Save size={15} />
      {pending ? 'Kaydediliyor…' : children}
    </button>
  );
}

/** Çam yeşili birincil aksiyon (Yeni İlan, Onayla…). */
export const primaryBtn =
  'inline-flex items-center gap-2 rounded-full bg-[#3d5638] px-4 py-2 text-sm text-[#FAF7EF] transition-colors hover:bg-[#2d4228] disabled:opacity-60';

export const outlineBtn =
  'inline-flex items-center gap-2 rounded-full border border-[#D9E3D5] px-4 py-2 text-sm text-[#1f2a1d] transition-colors hover:bg-[#F4EFE6] disabled:opacity-60';

export const dangerBtn =
  'inline-flex items-center gap-1.5 rounded-full border border-red-300 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60';

const STATUS_PILL: Record<string, string> = {
  muted: 'bg-[#1f2a1d]/10 text-[#2d3a2a]',
  info: 'bg-[hsl(210_60%_90%)] text-[hsl(210_50%_25%)]',
  warning: 'bg-[hsl(40_80%_88%)] text-[hsl(35_60%_28%)]',
  success: 'bg-[hsl(150_45%_86%)] text-[hsl(154_42%_20%)]',
  danger: 'bg-[hsl(4_70%_92%)] text-[hsl(4_60%_35%)]',
};

export function StatusPill({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em]',
        STATUS_PILL[tone] ?? STATUS_PILL.muted,
      )}
    >
      {label}
    </span>
  );
}
