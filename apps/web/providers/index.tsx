'use client';

/**
 * Providers Index - Combined Providers
 * 统一的 Providers 组合
 */

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import NextTopLoader from 'nextjs-toploader';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';
import { AppProvider } from './app-provider';

export { QueryProvider } from './query-provider';
export { ThemeProvider } from './theme-provider';
export { AppProvider, useApp } from './app-provider';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Root Providers Component
 * 根 Providers 组件
 *
 * Combines all providers in the correct order:
 * 1. AppProvider - Application context
 * 2. ThemeProvider - Theme management
 * 3. QueryProvider - React Query
 * 4. UI components (Toaster, TopLoader)
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <AppProvider>
      <ThemeProvider>
        <NextTopLoader color="#000" showSpinner={false} height={2} />
        <Toaster position="top-center" richColors />
        <QueryProvider>{children}</QueryProvider>
      </ThemeProvider>
    </AppProvider>
  );
}

export default Providers;
