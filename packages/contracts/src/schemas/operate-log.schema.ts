/**
 * OperateLog API Schemas
 * 操作日志相关的 Zod Schema 定义
 */

import { z } from 'zod';
import { PaginationQuerySchema, PaginatedResponseSchema } from '../base';

// ============================================================================
// OperateLog Enums - 操作日志枚举
// ============================================================================

/**
 * 操作类型枚举
 */
export const OperateTypeSchema = z.enum([
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'START',
  'STOP',
  'EXPORT',
  'IMPORT',
]);

export type OperateType = z.infer<typeof OperateTypeSchema>;

/**
 * 操作目标枚举
 */
export const OperateTargetSchema = z.enum([
  'BOT',
  'PROVIDER_KEY',
  'USER',
  'PERSONA_TEMPLATE',
  'SYSTEM',
]);

export type OperateTarget = z.infer<typeof OperateTargetSchema>;

// ============================================================================
// OperateLog Schemas - 操作日志
// ============================================================================

/**
 * 操作日志用户信息 Schema
 */
export const OperateLogUserSchema = z.object({
  id: z.string(),
  nickname: z.string().nullable(),
  avatarFileId: z.string().nullable(),
});

export type OperateLogUser = z.infer<typeof OperateLogUserSchema>;

/**
 * 操作日志项 Schema
 */
export const OperateLogItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  operateType: OperateTypeSchema,
  target: OperateTargetSchema,
  targetId: z.string().nullable(),
  targetName: z.string().nullable(),
  detail: z.any().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.coerce.date(),
  user: OperateLogUserSchema.optional(),
});

export type OperateLogItem = z.infer<typeof OperateLogItemSchema>;

/**
 * 操作日志列表查询参数 Schema
 */
export const OperateLogListQuerySchema = PaginationQuerySchema.extend({
  operateType: OperateTypeSchema.optional(),
  target: OperateTargetSchema.optional(),
  targetId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type OperateLogListQuery = z.infer<typeof OperateLogListQuerySchema>;

/**
 * 操作日志列表响应 Schema
 */
export const OperateLogListResponseSchema = PaginatedResponseSchema(
  OperateLogItemSchema,
);

export type OperateLogListResponse = z.infer<typeof OperateLogListResponseSchema>;
