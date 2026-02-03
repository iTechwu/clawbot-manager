import { z } from 'zod';

/**
 * Analytics Event Types
 * 定义所有可追踪的事件类型
 */
export const AnalyticsEventTypeSchema = z.enum([
  // Page View Events
  'PAGE_VIEW',

  // User Engagement Events
  'SESSION_START', // 会话开始
  'SESSION_END', // 会话结束
  'APP_BACKGROUND', // 应用进入后台
  'APP_FOREGROUND', // 应用回到前台
]);

export type AnalyticsEventType = z.infer<typeof AnalyticsEventTypeSchema>;

/**
 * Base Analytics Event Properties
 * 所有事件的基础属性
 */
export const BaseEventPropertiesSchema = z.object({
  timestamp: z.number().optional(), // Unix timestamp (ms)
  sessionId: z.string().optional(), // 会话ID
  userId: z.string().optional(), // 用户ID
  locale: z.string().optional(), // 语言环境 (en, zh)
  platform: z.string().optional(), // 平台 (web, ios, android)
  userAgent: z.string().optional(), // User Agent
  referrer: z.string().optional(), // 来源页面
});

/**
 * Page View Event Properties
 */
export const PageViewPropertiesSchema = BaseEventPropertiesSchema.extend({
  path: z.string(), // 页面路径
  title: z.string().optional(), // 页面标题
});

/**
 * Union of all event properties
 */
export const EventPropertiesSchema = z.union([
  BaseEventPropertiesSchema,
  PageViewPropertiesSchema,
]);

export type EventProperties = z.infer<typeof EventPropertiesSchema>;

/**
 * Analytics Event Schema
 * 完整的事件数据结构
 */
export const AnalyticsEventSchema = z.object({
  event: AnalyticsEventTypeSchema,
  properties: EventPropertiesSchema.optional(),
});

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

/**
 * Batch Analytics Events Schema
 * 批量上报事件
 */
export const BatchAnalyticsEventsSchema = z.object({
  events: z.array(AnalyticsEventSchema),
});

export type BatchAnalyticsEvents = z.infer<typeof BatchAnalyticsEventsSchema>;

/**
 * Analytics Response Schema
 */
export const AnalyticsResponseSchema = z.object({
  success: z.boolean(),
  eventsProcessed: z.number().optional(),
});

export type AnalyticsResponse = z.infer<typeof AnalyticsResponseSchema>;
