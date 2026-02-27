'use client';
import { THEMES } from '@/lib/themes';
import { useTheme } from '@/app/providers';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="px-3 py-2">
      <p className="text-[10px] font-semibold tracking-[0.08em] mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>THEME</p>
      <div className="flex gap-1.5 flex-wrap">
        {THEMES.map(t => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            title={t.label}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 ${
              theme === t.id
                ? 'bg-[rgba(245,197,24,0.2)] text-[#f5c518] ring-1 ring-[rgba(245,197,24,0.4)]'
                : 'hover:text-white'
            }`}
            style={theme !== t.id ? {
              background: 'var(--bg-fill-2)',
              color: 'var(--text-secondary)',
            } : undefined}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
