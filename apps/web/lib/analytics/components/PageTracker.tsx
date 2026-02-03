/**
 * PageTracker Component
 * 页面追踪组件 - 用于在 Layout 层级自动追踪页面浏览
 *
 * Usage:
 * ```tsx
 * // In layout.tsx
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <PageTracker />
 *         {children}
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */

'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analytics } from '../index';

interface PageTrackerProps {
  /**
   * Whether to track search params changes
   */
  trackSearchParams?: boolean;

  /**
   * Custom page name mapper
   */
  pageNameMapper?: (pathname: string) => string;

  /**
   * Paths to exclude from tracking
   */
  excludePaths?: string[];
}

export function PageTracker({
  trackSearchParams = true,
  pageNameMapper,
  excludePaths = [],
}: PageTrackerProps = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if path should be excluded
    if (excludePaths.some((path) => pathname.startsWith(path))) {
      return;
    }

    // Build full path with search params if enabled
    const fullPath =
      trackSearchParams && searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;

    // Get page name (custom or pathname)
    const pageName = pageNameMapper ? pageNameMapper(pathname) : pathname;

    // Track page view
    analytics.pageView(fullPath, pageName);

    // Track session start on first page view
    if (
      typeof window !== 'undefined' &&
      !sessionStorage.getItem('session_started')
    ) {
      analytics.track('SESSION_START', {
        path: fullPath,
      } as any);
      sessionStorage.setItem('session_started', 'true');
    }
  }, [pathname, searchParams, trackSearchParams, pageNameMapper, excludePaths]);

  // Track session end on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      analytics.track('SESSION_END', {
        path: pathname,
      } as any);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pathname]);

  // Track app visibility changes (background/foreground)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        analytics.track('APP_BACKGROUND', {
          path: pathname,
        } as any);
      } else {
        analytics.track('APP_FOREGROUND', {
          path: pathname,
        } as any);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname]);

  return null;
}

/**
 * Page name mapper for common routes
 */
export const defaultPageNameMapper = (pathname: string): string => {
  const routes: Record<string, string> = {
    '/': 'Home',
    '/home': 'Home',
    '/settings': 'Settings',
    '/login': 'Login',
    '/register': 'Register',
    '/upload': 'Upload',
  };

  // Remove locale prefix if present
  const cleanPath = pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?/, '');

  return routes[cleanPath] || cleanPath;
};
