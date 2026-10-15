"use client";

import type { InputHTMLAttributes } from "react";

/** +90 5XX XXX XX XX formatına çeker */
export function formatPhone(raw: string): string {
  // Sadece rakamları al
  let d = raw.replace(/\D/g, "");

  // Kullanıcı +90 ya da 90 ya da 0 ile başlatmışsa temizle
  if (d.startsWith("90")) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);

  // Max 10 hane
  d = d.slice(0, 10);

  if (!d) return "";

  // 5XX XXX XX XX
  let out = d.slice(0, 3);
  if (d.length > 3) out += " " + d.slice(3, 6);
  if (d.length > 6) out += " " + d.slice(6, 8);
  if (d.length > 8) out += " " + d.slice(8, 10);

  return "+90 " + out;
}

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode" | "onChange" | "value"> & {
  value: string;
  onChange: (formatted: string) => void;
};

export function PhoneInput({ value, onChange, className, ...rest }: Props) {
  return (
    <input
      {...rest}
      type="tel"
      inputMode="numeric"
      value={value}
      placeholder="+90 5XX XXX XX XX"
      className={className}
      onChange={(e) => onChange(formatPhone(e.target.value))}
    />
  );
}
