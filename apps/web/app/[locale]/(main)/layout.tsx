'use client';

import { AppShell } from '@/components/layout';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return <AppShell>{children}</AppShell>;
}
