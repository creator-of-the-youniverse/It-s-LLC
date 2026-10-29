import { useEffect, useState } from 'react';
import { AppTheme } from '../types';

export const THEME_STORAGE_KEY = 'which_shitty_pitch_theme_v1';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  tagline: string;
  dotColor: string;
  accentColor: string;
  bgHex: string;
}

export const THEME_CONFIGS: ThemeConfig[] = [
  {
    id: 'dark',
    name: 'Dark',
    tagline: 'High-Ticket Slate & Sky',
    dotColor: '#38bdf8',
    accentColor: '#0ea5e9',
    bgHex: '#020617',
  },
  {
    id: 'light',
    name: 'Light',
    tagline: 'Executive Crisp White',
    dotColor: '#0284c7',
    accentColor: '#0284c7',
    bgHex: '#f8fafc',
  },
  {
    id: 'morning',
    name: 'Morning',
    tagline: 'Warm Sunrise Amber & Gold',
    dotColor: '#f59e0b',
    accentColor: '#d97706',
    bgHex: '#fefce8',
  },
  {
    id: 'night',
    name: 'Night',
    tagline: 'OLED Midnight Obsidian & Violet',
    dotColor: '#a855f7',
    accentColor: '#8b5cf6',
    bgHex: '#030305',
  },
];

export function getSavedTheme(): AppTheme {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null;
  if (saved && ['dark', 'light', 'morning', 'night'].includes(saved)) {
    return saved;
  }
  return 'dark';
}

export function applyTheme(theme: AppTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);

  // Update theme-color meta tag for mobile browsers and PWA titlebar
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  const config = THEME_CONFIGS.find((c) => c.id === theme) || THEME_CONFIGS[0];
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', config.bgHex);
  }
}

export function useAppTheme() {
  const [theme, setTheme] = useState<AppTheme>(getSavedTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const changeTheme = (next: AppTheme) => {
    setTheme(next);
    applyTheme(next);
  };

  return { theme, setTheme: changeTheme, configs: THEME_CONFIGS };
}
