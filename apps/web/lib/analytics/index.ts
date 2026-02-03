/**
 * Analytics Tracking Utility
 * 前端事件追踪工具
 *
 * Usage:
 * ```ts
 * import { analytics } from '@/lib/analytics';
 *
 * // Track a single event
 * // Track page view
 * analytics.pageView('/dashboard');
 * ```
 */

import type { AnalyticsEventType, EventProperties } from '@repo/contracts';
import { tsRestClient } from '@/lib/api/contracts/client';

class Analytics {
  private sessionId: string;
  private eventQueue: Array<{
    event: AnalyticsEventType;
    properties?: EventProperties;
  }> = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL_MS = 5000; // Flush every 5 seconds
  private readonly MAX_QUEUE_SIZE = 10; // Flush when queue reaches 10 events
  private currentPage: string | null = null;
  private pageStartTime: number | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startAutoFlush();
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get base event properties
   */
  private getBaseProperties(): Partial<EventProperties> {
    return {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      locale: typeof window !== 'undefined' ? navigator.language : 'en',
      platform: 'web',
      userAgent:
        typeof window !== 'undefined' ? navigator.userAgent : undefined,
      referrer: typeof window !== 'undefined' ? document.referrer : undefined,
      path: this.currentPage || undefined,
    };
  }

  /**
   * Set current page context
   */
  setPageContext(path: string) {
    // Track time spent on previous page
    if (this.currentPage && this.pageStartTime) {
      const timeSpent = Date.now() - this.pageStartTime;
      this.track('PAGE_VIEW', {
        path: this.currentPage,
        timeSpent: Math.floor(timeSpent / 1000), // Convert to seconds
      } as EventProperties);
    }

    this.currentPage = path;
    this.pageStartTime = Date.now();
  }

  /**
   * Get current page context
   */
  getPageContext() {
    return {
      currentPage: this.currentPage,
      timeOnPage: this.pageStartTime ? Date.now() - this.pageStartTime : 0,
    };
  }

  /**
   * Track a single event
   */
  track(event: AnalyticsEventType, properties?: Partial<EventProperties>) {
    const enrichedProperties = {
      ...this.getBaseProperties(),
      ...properties,
    };

    this.eventQueue.push({
      event,
      properties: enrichedProperties as EventProperties,
    });

    // Flush immediately if queue is full
    if (this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
      this.flush();
    }
  }

  /**
   * Track page view
   */
  pageView(path: string, title?: string) {
    // Update page context
    this.setPageContext(path);

    this.track('PAGE_VIEW', {
      path,
      title:
        title || (typeof document !== 'undefined' ? document.title : undefined),
    } as EventProperties);
  }

  /**
   * Flush events to backend
   */
  private async flush() {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Use ts-rest direct client to send events (imperative call, not hook)
      const result = await tsRestClient.analyticsClient.trackBatch({
        body: { events: eventsToSend },
      });

      if (result.status !== 200) {
        console.error('Analytics API returned non-200 status:', result.status);
      }
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      // Re-queue failed events (optional)
      // this.eventQueue.unshift(...eventsToSend);
    }
  }

  /**
   * Start auto-flush interval
   */
  private startAutoFlush() {
    if (typeof window === 'undefined') return;

    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL_MS);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  /**
   * Stop auto-flush interval
   */
  stopAutoFlush() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
}

// Export singleton instance
export const analytics = new Analytics();

// Export hooks and components
export {
  usePageTracking,
  useSectionTracking,
  useManualPageTracking,
} from './hooks/usePageTracking';
export { PageTracker, defaultPageNameMapper } from './components/PageTracker';
