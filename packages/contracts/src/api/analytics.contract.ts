import { initContract } from '@ts-rest/core';
import { createApiResponse } from '../base';
import {
  AnalyticsEventSchema,
  BatchAnalyticsEventsSchema,
  AnalyticsResponseSchema,
} from '../schemas/analytics.schema';

const c = initContract();

/**
 * Analytics API Contract
 * 用于追踪用户行为和产品指标
 */
export const analyticsContract = c.router({
  /**
   * Track a single analytics event
   * 追踪单个事件
   */
  track: {
    method: 'POST',
    path: '/analytics/track',
    body: AnalyticsEventSchema,
    responses: {
      200: createApiResponse(AnalyticsResponseSchema),
    },
    summary: '追踪单个事件',
    description: '记录单个用户行为事件',
  },

  /**
   * Track multiple analytics events in batch
   * 批量追踪事件
   */
  trackBatch: {
    method: 'POST',
    path: '/analytics/track/batch',
    body: BatchAnalyticsEventsSchema,
    responses: {
      200: createApiResponse(AnalyticsResponseSchema),
    },
    summary: '批量追踪事件',
    description: '批量记录多个用户行为事件，提高性能',
  },
});
