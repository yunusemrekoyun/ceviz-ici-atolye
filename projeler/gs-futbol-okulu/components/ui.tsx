"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({ title, subtitle, step, children }: { title: string; subtitle?: string; step?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white shadow-sm">
      <header className="flex items-start gap-3 border-b border-line px-4 py-3 sm:px-5">
        {step ? (
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gs-red text-sm font-bold text-white">
            {step}
          </span>
        ) : null}
        <div>
          <h2 className="text-base font-bold uppercase tracking-wide text-gs-red [.admin-theme_&]:text-[15px] [.admin-theme_&]:font-semibold [.admin-theme_&]:normal-case [.admin-theme_&]:tracking-normal [.admin-theme_&]:text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
        </div>
      </header>
      <div className="grid gap-4 px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

const controlBase =
  "block w-full rounded-xl border bg-white px-3.5 text-[16px] leading-6 text-ink shadow-xs outline-none transition placeholder:text-stone-500 focus:border-gs-red focus:ring-2 focus:ring-gs-red/25 disabled:bg-gray-100 disabled:text-gray-500";

type FieldProps = {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, required, hint, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {required ? <span className="ml-0.5 text-gs-red" aria-hidden="true">*</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export function Input({ invalid, className, ...props }: InputProps) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && props.id ? `${props.id}-error` : undefined}
      className={cx(controlBase, "min-h-12", invalid ? "border-red-500" : "border-control", className)}
    />
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export function Textarea({ invalid, className, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && props.id ? `${props.id}-error` : undefined}
      className={cx(controlBase, "min-h-24 py-3", invalid ? "border-red-500" : "border-control", className)}
    />
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };

export function Select({ invalid, className, children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && props.id ? `${props.id}-error` : undefined}
      className={cx(controlBase, "min-h-12 appearance-none pr-10", invalid ? "border-red-500" : "border-control", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.9rem center",
      }}
    >
      {children}
    </select>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success";
  /** lg: formlar (varsayılan) · md: panel eylemleri · sm: satır içi. Dokunmatik ekranda en az 44 px kalır. */
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
};

export const BUTTON_SIZES = {
  sm: "min-h-9 whitespace-nowrap rounded-lg px-3 text-sm pointer-coarse:min-h-11",
  md: "min-h-10 whitespace-nowrap rounded-xl px-4 text-[15px] pointer-coarse:min-h-11",
  lg: "min-h-12 rounded-xl px-5",
} as const;

export function Button({ variant = "primary", size = "lg", loading, fullWidth, className, children, disabled, ...props }: ButtonProps) {
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-gs-red text-white hover:bg-gs-red-dark focus-visible:ring-gs-red/40",
    secondary: "border border-control bg-white text-ink shadow-xs hover:border-gray-400 hover:bg-gray-50 focus-visible:ring-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-300",
    ghost: "text-gs-red hover:bg-gs-red-soft focus-visible:ring-gs-red/30",
    success: "bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:ring-emerald-300",
  };
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex cursor-pointer items-center justify-center gap-2 font-semibold transition duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
        BUTTON_SIZES[size],
        variants[variant],
        fullWidth && "w-full",
        className,
      )}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx("h-5 w-5 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "border-red-300 bg-red-50 text-red-800",
    success: "border-green-300 bg-green-50 text-green-800",
    info: "border-gs-yellow bg-gs-yellow-soft text-ink",
  } as const;
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cx("rounded-xl border px-4 py-3 text-sm", styles[kind])}>
      {children}
    </div>
  );
}
