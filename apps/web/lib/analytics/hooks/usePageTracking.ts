/**
 * usePageTracking Hook
 * 自动追踪页面浏览事件的 React Hook
 *
 * Usage:
 * ```tsx
 * // Basic usage - auto-tracks page view on mount
 * usePageTracking();
 *
 * // With custom properties
 * usePageTracking({
 *   pageName: 'Daily Challenge',
 *   category: 'engagement',
 *   metadata: { questionId: 'xxx' }
 * });
 *
 * // With dependencies - re-track when dependencies change
 * usePageTracking({ pageName: 'Question Detail' }, [questionId]);
 * ```
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { analytics } from '../index';

interface PageTrackingOptions {
  /**
   * Custom page name (defaults to pathname)
   */
  pageName?: string;

  /**
   * Page category for grouping
   */
  category?: string;

  /**
   * Additional metadata to track
   */
  metadata?: Record<string, any>;

  /**
   * Whether to track on mount (default: true)
   */
  trackOnMount?: boolean;

  /**
   * Custom page title (defaults to document.title)
   */
  title?: string;
}

/**
 * Hook to automatically track page views
 */
export function usePageTracking(
  options: PageTrackingOptions = {},
  dependencies: any[] = [],
) {
  const pathname = usePathname();
  const {
    pageName,
    category,
    metadata,
    trackOnMount = true,
    title,
  } = options;

  // Track if we've already tracked this page view
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track if enabled and not already tracked (or dependencies changed)
    if (!trackOnMount && hasTracked.current) return;

    const path = pageName || pathname;
    const pageTitle = title || (typeof document !== 'undefined' ? document.title : undefined);

    // Track page view with enriched properties
    analytics.pageView(path, pageTitle);

    // Track additional metadata if provided
    if (category || metadata) {
      analytics.track('PAGE_VIEW', {
        path,
        title: pageTitle,
        category,
        ...metadata,
      } as any);
    }

    hasTracked.current = true;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, pageName, category, title, trackOnMount, ...dependencies]);
}

/**
 * Hook to track page section views (for single-page apps with sections)
 */
export function useSectionTracking(
  sectionName: string,
  options: Omit<PageTrackingOptions, 'pageName'> = {},
) {
  usePageTracking(
    {
      ...options,
      pageName: sectionName,
    },
    [sectionName],
  );
}

/**
 * Hook to manually trigger page tracking
 */
export function useManualPageTracking() {
  const pathname = usePathname();

  return {
    trackPage: (options: PageTrackingOptions = {}) => {
      const path = options.pageName || pathname;
      const pageTitle = options.title || (typeof document !== 'undefined' ? document.title : undefined);

      analytics.pageView(path, pageTitle);

      if (options.category || options.metadata) {
        analytics.track('PAGE_VIEW', {
          path,
          title: pageTitle,
          category: options.category,
          ...options.metadata,
        } as any);
      }
    },
  };
}
