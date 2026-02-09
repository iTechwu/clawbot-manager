import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { RoutingEngineService } from './services/routing-engine.service';
import { FallbackEngineService } from './services/fallback-engine.service';
import { CostTrackerService } from './services/cost-tracker.service';
import { ConfigurationService } from './services/configuration.service';

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
 * 注意：此 API 应仅在内部网络中访问，不对外暴露
 */
@Controller('proxy/admin/routing')
export class RoutingAdminController {
  constructor(
    private readonly routingEngine: RoutingEngineService,
    private readonly fallbackEngine: FallbackEngineService,
    private readonly costTracker: CostTrackerService,
    private readonly configService: ConfigurationService,
  ) {}

  // ============================================================================
  // 配置状态
  // ============================================================================

  /**
   * 获取配置加载状态
   */
  @Get('status')
  async getConfigStatus() {
    return {
      success: true,
      data: this.configService.getLoadStatus(),
    };
  }

  /**
   * 手动刷新配置
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshConfig() {
    await this.configService.refreshConfigurations();
    return {
      success: true,
      message: 'Configuration refreshed',
      data: this.configService.getLoadStatus(),
    };
  }

  // ============================================================================
  // 能力标签管理
  // ============================================================================

  /**
   * 获取所有能力标签
   */
  @Get('capability-tags')
  async getCapabilityTags() {
    return {
      success: true,
      data: this.routingEngine.getAllCapabilityTags(),
    };
  }

  /**
   * 获取指定能力标签
   */
  @Get('capability-tags/:tagId')
  async getCapabilityTag(@Param('tagId') tagId: string) {
    const tag = this.routingEngine.getCapabilityTag(tagId);
    if (!tag) {
      return {
        success: false,
        error: 'Capability tag not found',
      };
    }
    return {
      success: true,
      data: tag,
    };
  }

  // ============================================================================
  // Fallback 链管理
  // ============================================================================

  /**
   * 获取所有 Fallback 链
   */
  @Get('fallback-chains')
  async getFallbackChains() {
    return {
      success: true,
      data: this.fallbackEngine.getAllFallbackChains(),
    };
  }

  /**
   * 获取指定 Fallback 链
   */
  @Get('fallback-chains/:chainId')
  async getFallbackChain(@Param('chainId') chainId: string) {
    const chain = this.fallbackEngine.getFallbackChain(chainId);
    if (!chain) {
      return {
        success: false,
        error: 'Fallback chain not found',
      };
    }
    return {
      success: true,
      data: chain,
    };
  }

  // ============================================================================
  // 成本策略管理
  // ============================================================================

  /**
   * 获取所有成本策略
   */
  @Get('cost-strategies')
  async getCostStrategies() {
    return {
      success: true,
      data: this.costTracker.getAllCostStrategies(),
    };
  }

  /**
   * 获取指定成本策略
   */
  @Get('cost-strategies/:strategyId')
  async getCostStrategy(@Param('strategyId') strategyId: string) {
    const strategy = this.costTracker.getCostStrategy(strategyId);
    if (!strategy) {
      return {
        success: false,
        error: 'Cost strategy not found',
      };
    }
    return {
      success: true,
      data: strategy,
    };
  }

  // ============================================================================
  // 模型定价管理
  // ============================================================================

  /**
   * 获取模型定价
   */
  @Get('model-pricing/:model')
  async getModelPricing(@Param('model') model: string) {
    const pricing = this.costTracker.getModelPricing(model);
    if (!pricing) {
      return {
        success: false,
        error: 'Model pricing not found',
      };
    }
    return {
      success: true,
      data: pricing,
    };
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

    return {
      success: true,
      data: cost,
    };
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
      return {
        success: true,
        data: {
          dailyCost: 0,
          monthlyCost: 0,
        },
      };
    }
    return {
      success: true,
      data: usage,
    };
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

    return {
      success: true,
      data: status,
    };
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

    return {
      success: true,
      data: {
        selectedModel: model,
        strategy: body.strategyId,
        scenario: body.scenario,
      },
    };
  }
}
