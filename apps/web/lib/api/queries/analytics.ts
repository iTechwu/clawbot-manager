/**
 * Analytics API Queries
 * React Query hooks for analytics tracking
 */

import { tsRestClient } from '@/lib/api/contracts/client';
import type { AnalyticsEvent } from '@repo/contracts';

/**
 * Track a single analytics event
 */
export const useTrackEvent = () => {
  return tsRestClient.analytics.track.useMutation();
};

/**
 * Track multiple analytics events in batch
 */
export const useTrackEventsBatch = () => {
  return tsRestClient.analytics.trackBatch.useMutation();
};

/**
 * Helper hook to track events with automatic error handling
 */
export const useAnalytics = () => {
  const trackMutation = useTrackEvent();
  const trackBatchMutation = useTrackEventsBatch();

  const track = async (event: AnalyticsEvent) => {
    try {
      await trackMutation.mutateAsync({ body: event });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  };

  const trackBatch = async (events: AnalyticsEvent[]) => {
    try {
      await trackBatchMutation.mutateAsync({ body: { events } });
    } catch (error) {
      console.error('Failed to track batch events:', error);
    }
  };

  return {
    track,
    trackBatch,
    isTracking: trackMutation.isPending || trackBatchMutation.isPending,
  };
};
