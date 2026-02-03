'use client';

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface HeaderProps {
  onCreateClick?: () => void;
}

export function Header({ onCreateClick }: HeaderProps) {
  const t = useTranslations('common.header');
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const cycleTheme = () => {
    const next =
      theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  const themeIcon =
    mounted && resolvedTheme === 'dark' ? (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
      </svg>
    ) : (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    );

  const themeLabel = mounted
    ? theme === 'system'
      ? t('theme.auto')
      : theme === 'dark'
        ? t('theme.dark')
        : t('theme.light')
    : t('theme.light');

  return (
    <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="text-blue-600 dark:text-blue-400">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect
                x="2"
                y="2"
                width="28"
                height="28"
                rx="4"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx="10" cy="12" r="3" fill="currentColor" />
              <circle cx="22" cy="12" r="3" fill="currentColor" />
              <path
                d="M8 20h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M10 24h4M18 24h4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            onClick={cycleTheme}
            aria-label={t('theme.ariaLabel', { theme: themeLabel })}
            title={t('theme.tooltip', { theme: themeLabel })}
          >
            {themeIcon}
            <span className="hidden sm:inline">{themeLabel}</span>
          </button>

          {onCreateClick && (
            <button
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              onClick={onCreateClick}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M7 1v12M1 7h12" />
              </svg>
              <span>{t('newBot')}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
