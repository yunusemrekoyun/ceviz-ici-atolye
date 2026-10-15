import React from "react";
import { FaChevronDown } from "react-icons/fa";

// Hesap sayfasının yapı taşları: başlıklı beyaz grup, bilgi satırı ve dokununca açılan satır.
export function AccountGroup({ title, children }) {
  return (
    <section>
      {title && (
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-dark2">{title}</h2>
      )}
      <div className="divide-y divide-light2 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        {children}
      </div>
    </section>
  );
}

export function AccountRow({ label, children, action }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-dark2">{label}</p>
        <div className="mt-0.5 break-words text-[15px] text-dark1">{children}</div>
      </div>
      {action}
    </div>
  );
}

export function AccountExpandable({ label, hint, tone, open, onToggle, children }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition hover:bg-light1/60 sm:px-5"
      >
        <div className="min-w-0">
          <p className={`text-[15px] font-medium ${tone === "danger" ? "text-red-700" : "text-dark1"}`}>{label}</p>
          {hint && !open && <p className="mt-0.5 text-xs text-dark2">{hint}</p>}
        </div>
        <FaChevronDown
          aria-hidden="true"
          className={`shrink-0 text-xs text-dark2 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="border-t border-light2 px-4 pb-5 pt-4 sm:px-5">{children}</div>}
    </div>
  );
}
