import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  ApiResponseSchema,
  SuccessResponseSchema,
  withVersion,
  API_VERSION,
} from '../base';
import {
  AvailableModelsResponseSchema,
  BotModelsResponseSchema,
  UpdateBotModelsInputSchema,
  RefreshModelsInputSchema,
  RefreshModelsResponseSchema,
  VerifySingleModelInputSchema,
  VerifySingleModelResponseSchema,
  BatchVerifyInputSchema,
  BatchVerifyResponseSchema,
  ModelAvailabilityListResponseSchema,
  RefreshAllModelsResponseSchema,
  BatchVerifyAllResponseSchema,
  CapabilityTagsResponseSchema,
  ModelCapabilityTagsResponseSchema,
  AddModelCapabilityTagInputSchema,
  RemoveModelCapabilityTagInputSchema,
} from '../schemas/model.schema';

const c = initContract();

/**
 * Model API Contract
 * 模型管理相关的 API 契约定义
 *
 * 设计原则：
 * - 普通用户只看到"可用模型列表"，无需了解 Provider 概念
 * - Admin 用户可以管理 API 密钥、查看 Provider 详情
 * - Bot 模型绑定：新建 Bot 默认绑定所有可用模型，用户可自定义
 */
export const modelContract = c.router(
  {
    // ============================================================================
    // 可用模型列表 (所有用户)
    // ============================================================================

    /**
     * GET /model - 获取所有可用模型列表
     * 返回系统中所有可用的模型，包括可用性状态
     */
    list: {
      method: 'GET',
      path: '',
      responses: {
        200: ApiResponseSchema(AvailableModelsResponseSchema),
      },
      summary: '获取所有可用模型列表',
    },

    // ============================================================================
    // 管理员模型管理
    // ============================================================================

    /**
     * GET /model/availability - 获取 ModelAvailability 列表
     * 返回所有 ModelAvailability 记录（管理员视图）
     * 仅限管理员访问
     */
    getAvailability: {
      method: 'GET',
      path: '/availability',
      query: z
        .object({
          providerKeyId: z.string().uuid().optional(),
        })
        .optional(),
      responses: {
        200: ApiResponseSchema(ModelAvailabilityListResponseSchema),
      },
      summary: '获取 ModelAvailability 列表',
    },

    /**
     * POST /model/refresh - 刷新模型列表
     * 从 Provider 端点获取最新的模型列表并写入 ModelAvailability（不进行验证）
     * 仅限管理员访问
     */
    refresh: {
      method: 'POST',
      path: '/refresh',
      body: RefreshModelsInputSchema,
      responses: {
        200: ApiResponseSchema(RefreshModelsResponseSchema),
        404: ApiResponseSchema(z.object({ error: z.string() })),
      },
      summary: '刷新模型列表（从端点获取并写入数据库）',
    },

    /**
     * POST /model/verify - 验证单个模型可用性
     * 通过实际调用模型 API 验证单个模型是否可用
     * 仅限管理员访问
     */
    verify: {
      method: 'POST',
      path: '/verify',
      body: VerifySingleModelInputSchema,
      responses: {
        200: ApiResponseSchema(VerifySingleModelResponseSchema),
        404: ApiResponseSchema(z.object({ error: z.string() })),
      },
      summary: '验证单个模型可用性',
    },

    /**
     * POST /model/batch-verify - 批量验证未验证的模型
     * 增量验证：只验证 errorMessage 为 'Not verified yet' 的模型
     * 仅限管理员访问
     */
    batchVerify: {
      method: 'POST',
      path: '/batch-verify',
      body: BatchVerifyInputSchema,
      responses: {
        200: ApiResponseSchema(BatchVerifyResponseSchema),
        404: ApiResponseSchema(z.object({ error: z.string() })),
      },
      summary: '批量验证未验证的模型（增量验证）',
    },

    /**
     * POST /model/refresh-all - 刷新所有 ProviderKeys 的模型列表
     * 遍历所有 ProviderKeys，从各自的端点获取最新的模型列表（不进行验证）
     * 仅限管理员访问
     */
    refreshAll: {
      method: 'POST',
      path: '/refresh-all',
      body: z.object({}).optional(),
      responses: {
        200: ApiResponseSchema(RefreshAllModelsResponseSchema),
      },
      summary: '刷新所有 ProviderKeys 的模型列表',
    },

    /**
     * POST /model/batch-verify-all - 批量验证所有不可用的模型
     * 遍历所有 ProviderKeys，验证 isAvailable=false 的模型
     * 仅限管理员访问
     */
    batchVerifyAll: {
      method: 'POST',
      path: '/batch-verify-all',
      body: z.object({}).optional(),
      responses: {
        200: ApiResponseSchema(BatchVerifyAllResponseSchema),
      },
      summary: '批量验证所有不可用的模型',
    },

    // ============================================================================
    // 能力标签管理 (管理员)
    // ============================================================================

    /**
     * GET /model/capability-tags - 获取所有能力标签
     * 返回系统中所有可用的能力标签
     * 仅限管理员访问
     */
    getCapabilityTags: {
      method: 'GET',
      path: '/capability-tags',
      responses: {
        200: ApiResponseSchema(CapabilityTagsResponseSchema),
      },
      summary: '获取所有能力标签',
    },

    /**
     * GET /model/:modelAvailabilityId/tags - 获取模型的能力标签
     * 返回指定模型的所有能力标签关联
     * 仅限管理员访问
     */
    getModelTags: {
      method: 'GET',
      path: '/:modelAvailabilityId/tags',
      pathParams: z.object({ modelAvailabilityId: z.string().uuid() }),
      responses: {
        200: ApiResponseSchema(ModelCapabilityTagsResponseSchema),
        404: ApiResponseSchema(z.object({ error: z.string() })),
      },
      summary: '获取模型的能力标签',
    },

    /**
     * POST /model/tags - 为模型添加能力标签
     * 手动为模型添加能力标签
     * 仅限管理员访问
     */
    addModelTag: {
      method: 'POST',
      path: '/tags',
      body: AddModelCapabilityTagInputSchema,
      responses: {
        200: ApiResponseSchema(SuccessResponseSchema),
        400: ApiResponseSchema(z.object({ error: z.string() })),
        404: ApiResponseSchema(z.object({ error: z.string() })),
      },
      summary: '为模型添加能力标签',
    },

    /**
     * DELETE /model/tags - 移除模型的能力标签
     * 移除模型的指定能力标签
     * 仅限管理员访问
     */
    removeModelTag: {
      method: 'DELETE',
      path: '/tags',
      body: RemoveModelCapabilityTagInputSchema,
      responses: {
        200: ApiResponseSchema(SuccessResponseSchema),
        404: ApiResponseSchema(z.object({ error: z.string() })),
      },
      summary: '移除模型的能力标签',
    },
  },
  {
    pathPrefix: '/model',
  },
);

/**
 * Bot Model API Contract
 * Bot 模型管理相关的 API 契约定义
 */
export const botModelContract = c.router(
  {
    // ============================================================================
    // Bot 模型管理 (所有用户)
    // ============================================================================

    /**
     * GET /bot/:hostname/models - 获取 Bot 的模型列表
     */
    list: {
      method: 'GET',
      path: '/:hostname/models',
      pathParams: z.object({ hostname: z.string() }),
      responses: {
        200: ApiResponseSchema(BotModelsResponseSchema),
        404: ApiResponseSchema(z.object({ error: z.string() })),
      },
      summary: '获取 Bot 的模型列表',
    },

    /**
     * PUT /bot/:hostname/models - 更新 Bot 的模型配置
     */
    update: {
      method: 'PUT',
      path: '/:hostname/models',
      pathParams: z.object({ hostname: z.string() }),
      body: UpdateBotModelsInputSchema,
      responses: {
        200: ApiResponseSchema(SuccessResponseSchema),
        400: ApiResponseSchema(z.object({ error: z.string() })),
        404: ApiResponseSchema(z.object({ error: z.string() })),
      },
      summary: '更新 Bot 的模型配置',
    },
  },
  {
    pathPrefix: '/bot',
  },
);

/**
 * 带版本元数据的 Model Contract
 */
export const modelContractVersioned = withVersion(modelContract, {
  version: API_VERSION.V1,
  pathPrefix: '/model',
});

/**
 * 带版本元数据的 Bot Model Contract
 */
export const botModelContractVersioned = withVersion(botModelContract, {
  version: API_VERSION.V1,
  pathPrefix: '/bot',
});

export type ModelContract = typeof modelContract;
export type BotModelContract = typeof botModelContract;
