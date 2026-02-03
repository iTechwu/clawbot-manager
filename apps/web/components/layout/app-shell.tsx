'use client';

import { SidebarProvider, SidebarInset } from '@repo/ui';
import { AppSidebar } from './app-sidebar';
import { AppNavbar } from './app-navbar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col">
      {/* Full-width navbar at top */}
      <AppNavbar />

      {/* Sidebar and content below navbar */}
      <div className="flex flex-1 overflow-hidden [&_[data-slot=sidebar-container]]:top-14 [&_[data-slot=sidebar-container]]:h-[calc(100svh-3.5rem)] [&_[data-slot=sidebar-wrapper]]:min-h-0">
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <SidebarInset className="bg-background">
            <main className="flex-1 overflow-auto">
              <div className="container mx-auto max-w-6xl p-6">{children}</div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  );
}
