"use client";
import { useEffect, useState } from "react";

export const DarkModeToggle = () => {
  const [enabled, setEnabled] = useState(false);

  // 1. İlk render'da localStorage kontrolü yap
  useEffect(() => {
    const savedMode = localStorage.getItem("theme");
    if (savedMode === "dark") {
      setEnabled(true);
      document.documentElement.classList.add("dark");
    } else {
      setEnabled(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // 2. State değiştiğinde class ve localStorage güncelle
  useEffect(() => {
    const root = document.documentElement;
    if (enabled) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [enabled]);

  return (
    <button
      onClick={() => setEnabled((prev) => !prev)}
      className="mt-4 px-4 py-2 text-sm rounded-full border border-neutral-300 dark:border-neutral-700 shadow bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition text-neutral-700 dark:text-white"
    >
      {enabled ? "☀️" : "🌙"}
    </button>
  );
};
