'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type ThemeType = 'sunset' | 'ocean' | 'forest' | 'amethyst' | 'crimson' | 'dune' | 'frost' | 'cyber';
export type ModeType = 'dark' | 'light';

export interface ThemeOption {
  id: ThemeType;
  name: string;
  mood: string;
  base: string;
  surface: string;
  accent: string;
  lightBase: string;
  lightSurface: string;
}

export const THEMES: ThemeOption[] = [
  { id: 'sunset',   name: 'Sunset',   mood: 'Warm hotel operations', base: '#07100f', surface: '#111a18', accent: '#ffad73', lightBase: '#f5eee7', lightSurface: '#fffaf5' },
  { id: 'ocean',    name: 'Ocean',    mood: 'Calm coastal blue',      base: '#06111d', surface: '#0f1e2b', accent: '#60a5fa', lightBase: '#edf5fb', lightSurface: '#f8fcff' },
  { id: 'forest',   name: 'Forest',   mood: 'Quiet botanical green',  base: '#07130d', surface: '#111f17', accent: '#4ade80', lightBase: '#eef7ef', lightSurface: '#fbfffb' },
  { id: 'amethyst', name: 'Amethyst', mood: 'Soft executive violet',  base: '#120b18', surface: '#211728', accent: '#d8b4fe', lightBase: '#f5eff9', lightSurface: '#fffaff' },
  { id: 'crimson',  name: 'Crimson',  mood: 'Formal burgundy',        base: '#150b0c', surface: '#241516', accent: '#fca5a5', lightBase: '#f8eeee', lightSurface: '#fffafa' },
  { id: 'dune',     name: 'Dune',     mood: 'Neutral warm sand',      base: '#121009', surface: '#211e13', accent: '#eab308', lightBase: '#f7f1e3', lightSurface: '#fffdf7' },
  { id: 'frost',    name: 'Frost',    mood: 'Clean silver desk',      base: '#0d1117', surface: '#171d25', accent: '#94a3b8', lightBase: '#f3f6f8', lightSurface: '#ffffff' },
  { id: 'cyber',    name: 'Cyber',    mood: 'Precise teal console',   base: '#061112', surface: '#0f2022', accent: '#2dd4bf', lightBase: '#edf8f7', lightSurface: '#fbffff' },
];

function normalizeTheme(theme: string | null | undefined): ThemeType {
  return THEMES.some((item) => item.id === theme) ? (theme as ThemeType) : 'sunset';
}

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  mode: ModeType;
  setMode: (mode: ModeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, initialTheme = 'sunset' }: { children: ReactNode, initialTheme?: ThemeType | string }) {
  const [theme, setThemeState] = useState<ThemeType>(normalizeTheme(initialTheme));
  const [mode, setModeState] = useState<ModeType>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('wn-panel-mode') ?? localStorage.getItem('wn-customer-mode-v2');
    if (saved === 'dark' || saved === 'light') setModeState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleSetTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    try {
      await fetch('/api/settings/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme })
      });
    } catch (error) {
      console.error('Failed to save theme to DB:', error);
    }
  };

  const handleSetMode = (newMode: ModeType) => {
    setModeState(newMode);
    localStorage.setItem('wn-panel-mode', newMode);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, mode, setMode: handleSetMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
