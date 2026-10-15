import React from "react";

// Botların doldurduğu gizli alan. Ekranda ve ekran okuyucularda görünmez, klavyeyle
// odaklanılmaz; dolu gelirse sunucu isteği sessizce yok sayar.
export default function HoneypotField({ id, value, onChange }) {
  return (
    <div aria-hidden="true" className="absolute left-[-5000px] top-auto h-px w-px overflow-hidden">
      <label htmlFor={id}>Website</label>
      <input
        id={id}
        name="website"
        type="text"
        value={value}
        onChange={onChange}
        autoComplete="off"
        tabIndex={-1}
      />
    </div>
  );
}
