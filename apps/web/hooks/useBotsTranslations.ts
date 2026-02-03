'use client';

import { useState, useEffect } from 'react';

// Default locale
const DEFAULT_LOCALE = 'zh-CN';

// Cache for loaded translations
const translationCache: Record<string, Record<string, any>> = {};

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, any>, path: string): string {
  const keys = path.split('.');
  let result: any = obj;
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return path; // Return the key if not found
    }
  }
  return typeof result === 'string' ? result : path;
}

/**
 * Hook for loading bot translations
 * Supports both Chinese and English locales
 */
export function useBotsTranslations(locale: string = DEFAULT_LOCALE) {
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTranslations = async () => {
      const cacheKey = `bots-${locale}`;

      // Check cache first
      if (translationCache[cacheKey]) {
        setTranslations(translationCache[cacheKey]);
        setLoading(false);
        return;
      }

      try {
        // Dynamic import based on locale
        const messages = await import(`@/locales/${locale}/bots.json`);
        translationCache[cacheKey] = messages.default;
        setTranslations(messages.default);
      } catch (error) {
        // Fallback to default locale
        try {
          const fallbackMessages = await import(`@/locales/${DEFAULT_LOCALE}/bots.json`);
          translationCache[cacheKey] = fallbackMessages.default;
          setTranslations(fallbackMessages.default);
        } catch {
          console.error('Failed to load translations');
          setTranslations({});
        }
      }
      setLoading(false);
    };

    loadTranslations();
  }, [locale]);

  /**
   * Get translation by key (supports dot notation)
   * @param key - Translation key (e.g., 'wizard.title' or 'actions.createBot')
   * @param fallback - Fallback value if key not found
   */
  const t = (key: string, fallback?: string): string => {
    if (loading || !translations) {
      return fallback || key;
    }
    const value = getNestedValue(translations, key);
    return value !== key ? value : (fallback || key);
  };

  return { t, loading, translations };
}

/**
 * Get browser locale
 */
export function getBrowserLocale(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const browserLang = navigator.language;
  if (browserLang.startsWith('zh')) {
    return 'zh-CN';
  }
  if (browserLang.startsWith('en')) {
    return 'en';
  }
  return DEFAULT_LOCALE;
}
