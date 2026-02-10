import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AdminAuth } from '@app/auth';
import { RoutingEngineService } from './services/routing-engine.service';
import { FallbackEngineService } from './services/fallback-engine.service';
import { CostTrackerService } from './services/cost-tracker.service';
import { ConfigurationService } from './services/configuration.service';
import { ComplexityClassifierService } from '@app/clients/internal/complexity-classifier';
import { success, error } from '@/common/ts-rest/response.helper';
import { CommonErrorCode } from '@repo/contracts/errors';

// Helper to generate consistent UUIDs from string IDs
const generateUUID = (id: string): string => {
  // Use a simple hash-based approach for consistent UUIDs
  const hash = id.split('').reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
  return `00000000-0000-4000-8000-${Math.abs(hash).toString(16).padStart(12, '0')}`;
};

const now = new Date().toISOString();

/**
 * RoutingAdminController - 混合架构路由配置管理 API
 *
 * 内部管理 API，用于：
 * - 模型定价管理
 * - 能力标签管理
 * - Fallback 链管理
 * - 成本策略管理
 * - 配置刷新
 *
 * 注意：此 API 仅限管理员访问 (isAdmin=true)
 */
@Controller('proxy/admin/routing')
@AdminAuth()
export class RoutingAdminController {
  constructor(
    private readonly routingEngine: RoutingEngineService,
    private readonly fallbackEngine: FallbackEngineService,
    private readonly costTracker: CostTrackerService,
    private readonly configService: ConfigurationService,
    private readonly complexityClassifier: ComplexityClassifierService,
  ) {}

  // ============================================================================
  // 配置状态
  // ============================================================================

  /**
   * 获取配置加载状态
   */
  @Get('status')
  async getConfigStatus() {
    return success(this.configService.getLoadStatus());
  }

  /**
   * 手动刷新配置
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshConfig() {
    await this.configService.refreshConfigurations();
    return success({
      message: 'Configuration refreshed',
      ...this.configService.getLoadStatus(),
    });
  }

  // ============================================================================
  // 能力标签管理
  // ============================================================================

  /**
   * 获取所有能力标签
   */
  @Get('capability-tags')
  async getCapabilityTags() {
    const tags = this.routingEngine.getAllCapabilityTags();
    return success({
      list: tags.map((tag) => ({
        id: generateUUID(tag.tagId),
        ...tag,
        description: null,
        isActive: true,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
      })),
    });
  }

  /**
   * 获取指定能力标签
   */
  @Get('capability-tags/:tagId')
  async getCapabilityTag(@Param('tagId') tagId: string) {
    const tag = this.routingEngine.getCapabilityTag(tagId);
    if (!tag) {
      return error(CommonErrorCode.NotFound);
    }
    return success(tag);
  }

  // ============================================================================
  // Fallback 链管理
  // ============================================================================

  /**
   * 获取所有 Fallback 链
   */
  @Get('fallback-chains')
  async getFallbackChains() {
    const chains = this.fallbackEngine.getAllFallbackChains();
    return success({
      list: chains.map((chain) => ({
        id: generateUUID(chain.chainId),
        ...chain,
        description: null,
        isActive: true,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
      })),
    });
  }

  /**
   * 获取指定 Fallback 链
   */
  @Get('fallback-chains/:chainId')
  async getFallbackChain(@Param('chainId') chainId: string) {
    const chain = this.fallbackEngine.getFallbackChain(chainId);
    if (!chain) {
      return error(CommonErrorCode.NotFound);
    }
    return success(chain);
  }

  // ============================================================================
  // 成本策略管理
  // ============================================================================

  /**
   * 获取所有成本策略
   */
  @Get('cost-strategies')
  async getCostStrategies() {
    const strategies = this.costTracker.getAllCostStrategies();
    return success({
      list: strategies.map((strategy) => ({
        id: generateUUID(strategy.strategyId),
        ...strategy,
        description: null,
        isActive: true,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
      })),
    });
  }

  /**
   * 获取指定成本策略
   */
  @Get('cost-strategies/:strategyId')
  async getCostStrategy(@Param('strategyId') strategyId: string) {
    const strategy = this.costTracker.getCostStrategy(strategyId);
    if (!strategy) {
      return error(CommonErrorCode.NotFound);
    }
    return success(strategy);
  }

  // ============================================================================
  // 复杂度路由配置管理
  // ============================================================================

  /**
   * 获取所有复杂度路由配置
   */
  @Get('complexity-configs')
  async getComplexityRoutingConfigs() {
    const config = this.routingEngine.getComplexityRoutingConfig();
    // 返回默认配置列表
    const configs = [
      {
        id: generateUUID('default'),
        configId: 'default',
        name: '默认复杂度路由',
        description: '根据消息复杂度自动选择模型',
        isEnabled: config.enabled,
        models: config.models,
        classifierModel: 'deepseek-v3-250324',
        classifierVendor: 'deepseek',
        toolMinComplexity: config.toolMinComplexity,
        isBuiltin: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
    return success({ list: configs });
  }

  /**
   * 获取指定复杂度路由配置
   */
  @Get('complexity-configs/:configId')
  async getComplexityRoutingConfig(@Param('configId') configId: string) {
    if (configId !== 'default') {
      return error(CommonErrorCode.NotFound);
    }
    const config = this.routingEngine.getComplexityRoutingConfig();
    return success({
      id: generateUUID('default'),
      configId: 'default',
      name: '默认复杂度路由',
      description: '根据消息复杂度自动选择模型',
      isEnabled: config.enabled,
      models: config.models,
      classifierModel: 'deepseek-v3-250324',
      classifierVendor: 'deepseek',
      toolMinComplexity: config.toolMinComplexity,
      isBuiltin: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * 测试复杂度分类
   */
  @Post('classify-complexity')
  @HttpCode(HttpStatus.OK)
  async classifyComplexity(
    @Body()
    body: {
      message: string;
      context?: string;
      hasTools?: boolean;
    },
  ) {
    const result = await this.complexityClassifier.classify({
      message: body.message,
      context: body.context,
      hasTools: body.hasTools,
    });
    return success(result);
  }

  // ============================================================================
  // 模型定价管理
  // ============================================================================

  /**
   * 获取所有模型定价
   */
  @Get('model-pricing')
  async getModelPricingList() {
    const pricingList = this.costTracker.getAllModelPricing();
    return success({
      list: pricingList.map((pricing) => ({
        id: generateUUID(pricing.model),
        ...pricing,
        displayName: null,
        description: null,
        contextLength: 128,
        supportsExtendedThinking: pricing.thinkingPrice !== undefined,
        supportsCacheControl: pricing.cacheReadPrice !== undefined,
        supportsVision: false,
        supportsFunctionCalling: true,
        supportsStreaming: true,
        recommendedScenarios: null,
        isEnabled: true,
        isDeprecated: false,
        deprecationDate: null,
        priceUpdatedAt: now,
        notes: null,
        metadata: null,
        createdAt: now,
        updatedAt: now,
      })),
    });
  }

  /**
   * 获取模型定价
   */
  @Get('model-pricing/:model')
  async getModelPricing(@Param('model') model: string) {
    const pricing = this.costTracker.getModelPricing(model);
    if (!pricing) {
      return error(CommonErrorCode.NotFound);
    }
    return success(pricing);
  }

  // ============================================================================
  // 成本计算
  // ============================================================================

  /**
   * 计算请求成本
   */
  @Post('calculate-cost')
  @HttpCode(HttpStatus.OK)
  async calculateCost(
    @Body()
    body: {
      model: string;
      inputTokens: number;
      outputTokens: number;
      thinkingTokens?: number;
      cacheReadTokens?: number;
      cacheWriteTokens?: number;
    },
  ) {
    const cost = this.costTracker.calculateCost(body.model, {
      inputTokens: body.inputTokens,
      outputTokens: body.outputTokens,
      thinkingTokens: body.thinkingTokens,
      cacheReadTokens: body.cacheReadTokens,
      cacheWriteTokens: body.cacheWriteTokens,
    });

    return success(cost);
  }

  // ============================================================================
  // Bot 使用量查询
  // ============================================================================

  /**
   * 获取 Bot 使用量
   */
  @Get('bot-usage/:botId')
  async getBotUsage(@Param('botId') botId: string) {
    const usage = this.costTracker.getBotUsage(botId);
    if (!usage) {
      return success({
        dailyCost: 0,
        monthlyCost: 0,
      });
    }
    return success(usage);
  }

  /**
   * 检查 Bot 预算状态
   */
  @Get('bot-budget/:botId')
  async checkBotBudget(
    @Param('botId') botId: string,
    @Query('dailyLimit') dailyLimit?: string,
    @Query('monthlyLimit') monthlyLimit?: string,
    @Query('alertThreshold') alertThreshold?: string,
  ) {
    const status = this.costTracker.checkBudgetStatus(
      botId,
      dailyLimit ? parseFloat(dailyLimit) : undefined,
      monthlyLimit ? parseFloat(monthlyLimit) : undefined,
      alertThreshold ? parseFloat(alertThreshold) : 0.8,
    );

    return success(status);
  }

  // ============================================================================
  // 模型选择
  // ============================================================================

  /**
   * 根据成本策略选择最优模型
   */
  @Post('select-model')
  @HttpCode(HttpStatus.OK)
  async selectOptimalModel(
    @Body()
    body: {
      strategyId: string;
      availableModels: string[];
      scenario?: 'reasoning' | 'coding' | 'creativity' | 'speed';
    },
  ) {
    const model = this.costTracker.selectOptimalModel(
      body.strategyId,
      body.availableModels,
      body.scenario,
    );

    return success({
      selectedModel: model,
      strategy: body.strategyId,
      scenario: body.scenario,
    });
  }
}
