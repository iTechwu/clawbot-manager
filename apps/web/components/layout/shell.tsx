'use client';

import type { ReactNode } from 'react';
import { Header } from './header';
import { TabNav } from './tab-nav';

interface ShellProps {
  children: ReactNode;
  onCreateClick?: () => void;
}

export function Shell({ children, onCreateClick }: ShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <Header onCreateClick={onCreateClick} />
      <TabNav />
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
