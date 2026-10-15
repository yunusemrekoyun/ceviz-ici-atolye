"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  className?: string;
}

export function ThemeToggle({ className }: Props) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Aydınlık moda geç" : "Karanlık moda geç"}
      className={`w-9 h-9 grid place-items-center rounded-lg transition-colors hover:bg-subtle ${className ?? ""}`}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-body" />
      ) : (
        <Moon className="w-4 h-4 text-body" />
      )}
    </button>
  );
}
