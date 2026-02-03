import { z } from 'zod';

/**
 * Meeting SSE Event Schema
 *
 * @description P1 优化：统一的会议相关 SSE 事件格式
 * 用于转写、摘要生成、知识提取等会议相关任务的实时状态推送
 */
export const MeetingSSEEventSchema = z.object({
  /** 事件类型 */
  type: z.enum(['transcription', 'summary']),
  /** 会议 ID */
  meetingId: z.string().uuid(),
  /** 任务状态 */
  status: z.enum(['processing', 'success', 'error']),
  /** 事件数据（可选） */
  data: z.any().optional(),
  /** 错误信息（可选，仅在 status='error' 时存在） */
  error: z.string().optional(),
  /** 时间戳（毫秒） */
  timestamp: z.number(),
  /** 任务 ID（可选，用于关联 Python Task） */
  taskId: z.string().uuid().optional(),
  /** 进度（0-100，可选） */
  progress: z.number().min(0).max(100).optional(),
  /** 当前步骤描述（可选） */
  currentStep: z.string().optional(),
});

export type MeetingSSEEvent = z.infer<typeof MeetingSSEEventSchema>;
