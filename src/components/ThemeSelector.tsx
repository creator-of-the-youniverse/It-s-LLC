import React from 'react';
import { useAppTheme, ThemeConfig } from '../utils/theme';
import { Sun, Moon, Sunrise, Sparkles } from 'lucide-react';

interface ThemeSelectorProps {
  className?: string;
  variant?: 'compact' | 'expanded';
}

const THEME_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dark: Moon,
  light: Sun,
  morning: Sunrise,
  night: Sparkles,
};

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { theme, setTheme, configs } = useAppTheme();

  const cycleTheme = () => {
    const currentIndex = configs.findIndex((c) => c.id === theme);
    const nextIndex = (currentIndex + 1) % configs.length;
    setTheme(configs[nextIndex].id);
  };

  const currentConfig = configs.find((c) => c.id === theme) || configs[0];
  const CurrentIcon = THEME_ICONS[currentConfig.id] || Sparkles;

  if (variant === 'expanded') {
    return (
      <div className={`space-y-2 ${className}`} data-testid="theme-selector-expanded">
        <label className="text-xs font-mono uppercase tracking-wider text-slate-400 block">
          Interface Theme (4-Palette System)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {configs.map((cfg) => {
            const Icon = THEME_ICONS[cfg.id] || Sparkles;
            const isSelected = theme === cfg.id;
            return (
              <button
                key={cfg.id}
                type="button"
                onClick={() => setTheme(cfg.id)}
                data-testid={`theme-option-${cfg.id}`}
                className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-sky-400 bg-sky-500/15 shadow-md ring-1 ring-sky-400/40'
                    : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: cfg.dotColor }}
                    />
                    <span className="text-xs font-bold capitalize">{cfg.name}</span>
                  </div>
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <span className="text-[10px] text-slate-400 leading-tight">
                  {cfg.tagline}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 ${className}`}>
      {/* Mobile-Friendly Theme Button: Fits cleanly and never hangs off screen */}
      <button
        type="button"
        onClick={cycleTheme}
        data-testid="theme-btn-mobile-toggle"
        title={`Theme: ${currentConfig.name} (${currentConfig.tagline}). Tap to switch theme.`}
        aria-label={`Theme: ${currentConfig.name}. Tap to switch theme.`}
        className="sm:hidden px-2 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-200 hover:text-white flex items-center gap-1.5 text-xs font-medium cursor-pointer shrink-0 transition-colors"
      >
        <span
          className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
          style={{ backgroundColor: currentConfig.dotColor }}
        />
        <CurrentIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
      </button>

      {/* Desktop / Tablet 4-Palette Control */}
      <div
        className="hidden sm:inline-flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-xl"
        data-testid="theme-selector-compact"
        role="radiogroup"
        aria-label="Color theme selector"
      >
        {configs.map((cfg: ThemeConfig) => {
          const isSelected = theme === cfg.id;
          return (
            <button
              key={cfg.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setTheme(cfg.id)}
              data-testid={`theme-btn-${cfg.id}`}
              title={`Switch to ${cfg.name} theme (${cfg.tagline})`}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-sky-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-black/20"
                style={{ backgroundColor: cfg.dotColor }}
              />
              <span className="capitalize">{cfg.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
