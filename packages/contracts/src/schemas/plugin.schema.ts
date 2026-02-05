import { z } from 'zod';
import { PaginationQuerySchema } from '../base';

/**
 * 插件分类枚举
 */
export const PluginCategorySchema = z.enum([
  'BROWSER',
  'FILESYSTEM',
  'DATABASE',
  'API',
  'COMMUNICATION',
  'DEVELOPMENT',
  'CUSTOM',
]);

export type PluginCategory = z.infer<typeof PluginCategorySchema>;

/**
 * 插件基础信息 Schema
 */
export const PluginItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  version: z.string(),
  author: z.string().nullable(),
  category: PluginCategorySchema,
  configSchema: z.record(z.string(), z.unknown()).nullable(),
  defaultConfig: z.record(z.string(), z.unknown()).nullable(),
  mcpConfig: z.record(z.string(), z.unknown()).nullable(),
  isOfficial: z.boolean(),
  isEnabled: z.boolean(),
  downloadUrl: z.string().nullable(),
  iconEmoji: z.string().nullable(),
  iconUrl: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type PluginItem = z.infer<typeof PluginItemSchema>;

/**
 * 插件列表查询参数
 */
export const PluginListQuerySchema = PaginationQuerySchema.extend({
  category: PluginCategorySchema.optional(),
  isOfficial: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export type PluginListQuery = z.infer<typeof PluginListQuerySchema>;

/**
 * Bot 插件安装信息 Schema
 */
export const BotPluginItemSchema = z.object({
  id: z.string().uuid(),
  botId: z.string().uuid(),
  pluginId: z.string().uuid(),
  config: z.record(z.string(), z.unknown()).nullable(),
  isEnabled: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  plugin: PluginItemSchema,
});

export type BotPluginItem = z.infer<typeof BotPluginItemSchema>;

/**
 * 安装插件请求 Schema
 */
export const InstallPluginRequestSchema = z.object({
  pluginId: z.string().uuid(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export type InstallPluginRequest = z.infer<typeof InstallPluginRequestSchema>;

/**
 * 更新插件配置请求 Schema
 */
export const UpdatePluginConfigRequestSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
  isEnabled: z.boolean().optional(),
});

export type UpdatePluginConfigRequest = z.infer<
  typeof UpdatePluginConfigRequestSchema
>;

/**
 * 创建插件请求 Schema（管理员）
 */
export const CreatePluginRequestSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().optional(),
  version: z.string().min(1).max(20),
  author: z.string().max(100).optional(),
  category: PluginCategorySchema,
  configSchema: z.record(z.string(), z.unknown()).optional(),
  defaultConfig: z.record(z.string(), z.unknown()).optional(),
  mcpConfig: z.record(z.string(), z.unknown()).optional(),
  isOfficial: z.boolean().optional(),
  downloadUrl: z.string().url().optional(),
  iconEmoji: z.string().max(10).optional(),
  iconUrl: z.string().url().optional(),
});

export type CreatePluginRequest = z.infer<typeof CreatePluginRequestSchema>;

/**
 * 更新插件请求 Schema（管理员）
 */
export const UpdatePluginRequestSchema = CreatePluginRequestSchema.partial();

export type UpdatePluginRequest = z.infer<typeof UpdatePluginRequestSchema>;
