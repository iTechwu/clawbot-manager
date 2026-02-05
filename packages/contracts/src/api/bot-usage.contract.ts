import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { createApiResponse, PaginatedResponseSchema } from '../base';
import {
  UsageStatsQuerySchema,
  UsageStatsResponseSchema,
  UsageTrendQuerySchema,
  UsageTrendResponseSchema,
  UsageBreakdownQuerySchema,
  UsageBreakdownResponseSchema,
  UsageLogListQuerySchema,
  UsageLogItemSchema,
} from '../schemas/bot-usage.schema';

const c = initContract();

/**
 * Bot 用量统计 API 契约
 */
export const botUsageContract = c.router(
  {
    /**
     * 获取 Bot 用量统计
     */
    getStats: {
      method: 'GET',
      path: '/:hostname/usage/stats',
      pathParams: z.object({ hostname: z.string() }),
      query: UsageStatsQuerySchema,
      responses: {
        200: createApiResponse(UsageStatsResponseSchema),
      },
      summary: '获取 Bot 用量统计',
      description: '获取指定时间段内的 Token 使用量、请求次数、错误率等统计数据',
    },

    /**
     * 获取 Bot 用量趋势
     */
    getTrend: {
      method: 'GET',
      path: '/:hostname/usage/trend',
      pathParams: z.object({ hostname: z.string() }),
      query: UsageTrendQuerySchema,
      responses: {
        200: createApiResponse(UsageTrendResponseSchema),
      },
      summary: '获取 Bot 用量趋势',
      description: '获取指定时间范围内的用量趋势数据，支持按小时、天、周聚合',
    },

    /**
     * 获取 Bot 用量分组统计
     */
    getBreakdown: {
      method: 'GET',
      path: '/:hostname/usage/breakdown',
      pathParams: z.object({ hostname: z.string() }),
      query: UsageBreakdownQuerySchema,
      responses: {
        200: createApiResponse(UsageBreakdownResponseSchema),
      },
      summary: '获取 Bot 用量分组统计',
      description: '按 vendor、model 或 status 分组统计用量数据',
    },

    /**
     * 获取 Bot 用量日志列表
     */
    getLogs: {
      method: 'GET',
      path: '/:hostname/usage/logs',
      pathParams: z.object({ hostname: z.string() }),
      query: UsageLogListQuerySchema,
      responses: {
        200: createApiResponse(PaginatedResponseSchema(UsageLogItemSchema)),
      },
      summary: '获取 Bot 用量日志列表',
      description: '获取 Bot 的详细用量日志记录，支持分页和过滤',
    },
  },
  { pathPrefix: '/bot' },
);

export type BotUsageContract = typeof botUsageContract;
