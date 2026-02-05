import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { createApiResponse, PaginatedResponseSchema } from '../base';
import {
  PluginItemSchema,
  PluginListQuerySchema,
  BotPluginItemSchema,
  InstallPluginRequestSchema,
  UpdatePluginConfigRequestSchema,
  CreatePluginRequestSchema,
  UpdatePluginRequestSchema,
} from '../schemas/plugin.schema';

const c = initContract();

/**
 * 插件 API 契约
 */
export const pluginContract = c.router(
  {
    /**
     * 获取插件列表（插件市场）
     */
    list: {
      method: 'GET',
      path: '/plugins',
      query: PluginListQuerySchema,
      responses: {
        200: createApiResponse(PaginatedResponseSchema(PluginItemSchema)),
      },
      summary: '获取插件列表',
      description: '获取插件市场中的所有可用插件，支持分类筛选和搜索',
    },

    /**
     * 获取插件详情
     */
    getById: {
      method: 'GET',
      path: '/plugins/:pluginId',
      pathParams: z.object({ pluginId: z.string().uuid() }),
      responses: {
        200: createApiResponse(PluginItemSchema),
      },
      summary: '获取插件详情',
      description: '获取指定插件的详细信息',
    },

    /**
     * 创建插件（管理员）
     */
    create: {
      method: 'POST',
      path: '/plugins',
      body: CreatePluginRequestSchema,
      responses: {
        200: createApiResponse(PluginItemSchema),
      },
      summary: '创建插件',
      description: '创建新插件（仅管理员）',
    },

    /**
     * 更新插件（管理员）
     */
    update: {
      method: 'PUT',
      path: '/plugins/:pluginId',
      pathParams: z.object({ pluginId: z.string().uuid() }),
      body: UpdatePluginRequestSchema,
      responses: {
        200: createApiResponse(PluginItemSchema),
      },
      summary: '更新插件',
      description: '更新插件信息（仅管理员）',
    },

    /**
     * 删除插件（管理员）
     */
    delete: {
      method: 'DELETE',
      path: '/plugins/:pluginId',
      pathParams: z.object({ pluginId: z.string().uuid() }),
      body: z.object({}),
      responses: {
        200: createApiResponse(z.object({ success: z.boolean() })),
      },
      summary: '删除插件',
      description: '删除插件（仅管理员）',
    },
  },
  { pathPrefix: '' },
);

/**
 * Bot 插件管理 API 契约
 */
export const botPluginContract = c.router(
  {
    /**
     * 获取 Bot 已安装的插件列表
     */
    list: {
      method: 'GET',
      path: '/:hostname/plugins',
      pathParams: z.object({ hostname: z.string() }),
      responses: {
        200: createApiResponse(z.array(BotPluginItemSchema)),
      },
      summary: '获取 Bot 插件列表',
      description: '获取指定 Bot 已安装的所有插件',
    },

    /**
     * 安装插件到 Bot
     */
    install: {
      method: 'POST',
      path: '/:hostname/plugins',
      pathParams: z.object({ hostname: z.string() }),
      body: InstallPluginRequestSchema,
      responses: {
        200: createApiResponse(BotPluginItemSchema),
      },
      summary: '安装插件',
      description: '为指定 Bot 安装插件',
    },

    /**
     * 更新 Bot 插件配置
     */
    updateConfig: {
      method: 'PUT',
      path: '/:hostname/plugins/:pluginId',
      pathParams: z.object({
        hostname: z.string(),
        pluginId: z.string().uuid(),
      }),
      body: UpdatePluginConfigRequestSchema,
      responses: {
        200: createApiResponse(BotPluginItemSchema),
      },
      summary: '更新插件配置',
      description: '更新 Bot 已安装插件的配置',
    },

    /**
     * 卸载 Bot 插件
     */
    uninstall: {
      method: 'DELETE',
      path: '/:hostname/plugins/:pluginId',
      pathParams: z.object({
        hostname: z.string(),
        pluginId: z.string().uuid(),
      }),
      body: z.object({}),
      responses: {
        200: createApiResponse(z.object({ success: z.boolean() })),
      },
      summary: '卸载插件',
      description: '从 Bot 卸载指定插件',
    },
  },
  { pathPrefix: '/bot' },
);

export type PluginContract = typeof pluginContract;
export type BotPluginContract = typeof botPluginContract;
