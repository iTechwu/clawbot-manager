/**
 * Message API Schemas
 * 消息相关的 Zod Schema 定义
 */

import { z } from 'zod';
import { PaginationQuerySchema, PaginatedResponseSchema } from '../base';

// ============================================================================
// Message Schemas - 消息
// ============================================================================

/**
 * 消息内容 Schema
 */
export const MessageContentSchema = z.object({
    id: z.string(),
    type: z.string(),
    content: z.any(),
});

export type MessageContent = z.infer<typeof MessageContentSchema>;

/**
 * 消息接收者 Schema
 */
export const MessageReceiverSchema = z.object({
    id: z.string(),
    nickname: z.string().nullable(),
    headerImg: z.string().nullable(),
});

export type MessageReceiver = z.infer<typeof MessageReceiverSchema>;

/**
 * 消息接收记录 Schema
 */
export const MessageRecipientSchema = z.object({
    id: z.string(),
    createdAt: z.coerce.date(),
    isRead: z.boolean(),
    readAt: z.coerce.date().nullable(),
    message: MessageContentSchema,
    receiver: MessageReceiverSchema,
});

export type MessageRecipient = z.infer<typeof MessageRecipientSchema>;

/**
 * 消息列表响应 Schema - 使用标准 PaginatedResponseSchema
 */
export const MessageListResponseSchema = PaginatedResponseSchema(
    MessageRecipientSchema,
);

export type MessageListResponse = z.infer<typeof MessageListResponseSchema>;

/**
 * 消息列表查询参数 Schema
 */
export const MessageListQuerySchema = PaginationQuerySchema.extend({
    read: z.string().optional(),
});

export type MessageListQuery = z.infer<typeof MessageListQuerySchema>;

/**
 * 设置消息已读请求 Schema
 */
export const SetMessageReadRequestSchema = z.object({
    messageIds: z.array(z.string()),
});

export type SetMessageReadRequest = z.infer<typeof SetMessageReadRequestSchema>;

/**
 * 未读消息数量响应 Schema
 */
export const UnreadCountResponseSchema = z.object({
    total: z.number(),
});

export type UnreadCountResponse = z.infer<typeof UnreadCountResponseSchema>;
