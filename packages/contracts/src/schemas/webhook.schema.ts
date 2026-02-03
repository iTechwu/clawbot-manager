import { z } from 'zod';

/**
 * Webhook-related Zod schemas
 */

// Transcode webhook request
export const TranscodeWebhookRequestSchema = z.object({
  TopicOwner: z.string().min(1),
  Message: z.string().min(1),
  TopicName: z.string().min(1),
  MessageId: z.string().min(1),
  PublishTime: z.string().min(1),
  SubscriptionName: z.string().min(1),
  Body: z.string().min(1),
  Subscriber: z.string().min(1),
});

// Audio transcribe webhook request (vendor-specific, flexible schema)
export const AudioTranscribeWebhookRequestSchema = z.any();

// Volcengine transcode webhook request (flexible schema)
export const VolcengineTranscodeWebhookRequestSchema = z.any();

/**
 * Python Task 统一数据格式
 *
 * 用于：
 * 1. Webhook 回调数据格式 (PythonTaskWebhookRequestSchema)
 * 2. AgentX getTaskStatus 返回格式 (TaskStatusResponseSchema)
 * 3. SSE 推送数据格式
 *
 * 注意：此 Schema 是所有 Python Task 的统一数据格式
 */
export const PythonTaskDataSchema = z.object({
  /** 任务 ID */
  id: z.string().min(1),
  /** 是否完成 */
  ready: z.boolean(),
  /** 任务状态: SUCCESS, FAILURE, PENDING, STARTED, RETRY, REVOKED */
  state: z.enum(['SUCCESS', 'FAILURE', 'PENDING', 'STARTED', 'RETRY', 'REVOKED']),
  /** 进度 0-100 */
  progress: z.number().min(0).max(100).optional().nullable(),
  /** 当前步骤描述 */
  current_step: z.string().optional().nullable(),
  /** 任务结果 */
  result: z.any().optional().nullable(),
  /** 日期 */
  date: z.string().optional().nullable(),
  /** 错误信息 */
  error: z.string().optional().nullable(),
  /** 是否正在处理 */
  processing: z.boolean().optional().nullable(),
  /** 预计剩余时间 */
  estimated_remaining_time: z.number().optional().nullable(),
  /** 处理时间 */
  processing_timestamp: z.number().optional().nullable(),
  /** 元信息 (兼容旧字段名) */
  meta: z.any().optional().nullable(),
});

export type PythonTaskResponse = z.infer<typeof PythonTaskDataSchema>;

// Python task webhook request (使用统一格式)
export const PythonTaskWebhookRequestSchema = PythonTaskDataSchema;
export type PythonTaskWebhookRequest = PythonTaskResponse;

// Success response
export const WebhookSuccessResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});
