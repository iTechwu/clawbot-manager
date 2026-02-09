import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { ApiResponseSchema, SuccessResponseSchema } from '../base';
import {
  ModelPricingSchema,
  CapabilityTagSchema,
  FallbackChainSchema,
  CostStrategySchema,
  ConfigLoadStatusSchema,
  CostCalculationSchema,
  BudgetStatusSchema,
} from '../schemas/routing.schema';

const c = initContract();

// ============================================================================
// Request Schemas
// ============================================================================

export const CalculateCostInputSchema = z.object({
  model: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  thinkingTokens: z.number().optional(),
  cacheReadTokens: z.number().optional(),
  cacheWriteTokens: z.number().optional(),
});

export type CalculateCostInput = z.infer<typeof CalculateCostInputSchema>;

export const SelectModelInputSchema = z.object({
  strategyId: z.string(),
  availableModels: z.array(z.string()),
  scenario: z.enum(['reasoning', 'coding', 'creativity', 'speed']).optional(),
});

export type SelectModelInput = z.infer<typeof SelectModelInputSchema>;

export const BotBudgetQuerySchema = z.object({
  dailyLimit: z.coerce.number().optional(),
  monthlyLimit: z.coerce.number().optional(),
  alertThreshold: z.coerce.number().optional(),
});

export type BotBudgetQuery = z.infer<typeof BotBudgetQuerySchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const ModelPricingListResponseSchema = z.object({
  list: z.array(ModelPricingSchema),
});

export const CapabilityTagListResponseSchema = z.object({
  list: z.array(CapabilityTagSchema),
});

export const FallbackChainListResponseSchema = z.object({
  list: z.array(FallbackChainSchema),
});

export const CostStrategyListResponseSchema = z.object({
  list: z.array(CostStrategySchema),
});

export const BotUsageResponseSchema = z.object({
  dailyCost: z.number(),
  monthlyCost: z.number(),
});

export const SelectModelResponseSchema = z.object({
  selectedModel: z.string().nullable(),
  strategy: z.string(),
  scenario: z.string().optional(),
});

// ============================================================================
// Routing Admin Contract
// ============================================================================

/**
 * Routing Admin API Contract
 * 混合架构路由配置管理 API 契约定义
 */
export const routingAdminContract = c.router(
  {
    // ========================================================================
    // 配置状态
    // ========================================================================

    /**
     * GET /proxy/admin/routing/status - 获取配置加载状态
     */
    getConfigStatus: {
      method: 'GET',
      path: '/status',
      responses: {
        200: ApiResponseSchema(ConfigLoadStatusSchema),
      },
      summary: '获取配置加载状态',
    },

    /**
     * POST /proxy/admin/routing/refresh - 手动刷新配置
     */
    refreshConfig: {
      method: 'POST',
      path: '/refresh',
      body: z.object({}).optional(),
      responses: {
        200: ApiResponseSchema(
          z.object({
            message: z.string(),
            status: ConfigLoadStatusSchema,
          }),
        ),
      },
      summary: '手动刷新配置',
    },

    // ========================================================================
    // 能力标签管理
    // ========================================================================

    /**
     * GET /proxy/admin/routing/capability-tags - 获取所有能力标签
     */
    getCapabilityTags: {
      method: 'GET',
      path: '/capability-tags',
      responses: {
        200: ApiResponseSchema(CapabilityTagListResponseSchema),
      },
      summary: '获取所有能力标签',
    },
