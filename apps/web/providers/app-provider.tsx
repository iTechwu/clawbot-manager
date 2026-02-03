'use client';

/**
 * App Provider - Application Context
 * 应用 Context Provider
 */

import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { BRAND_CONFIG } from '@/lib/config';

interface AppContextType {
  title: string;
  version: string;
  brandName: string;
  brandLogo: string;
}

const defaultContext: AppContextType = {
  title: BRAND_CONFIG.name,
  version: '0.1.0',
  brandName: BRAND_CONFIG.name,
  brandLogo: BRAND_CONFIG.logo,
};

const AppContext = createContext<AppContextType>(defaultContext);

interface AppProviderProps {
  children: ReactNode;
  config?: Partial<AppContextType>;
}

export function AppProvider({ children, config }: AppProviderProps) {
  const value = { ...defaultContext, ...config };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
