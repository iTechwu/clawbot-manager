import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RoutingEngineService, CapabilityTag } from './routing-engine.service';
import {
  FallbackEngineService,
  FallbackChain,
  FallbackModel,
} from './fallback-engine.service';
import {
  CostTrackerService,
  CostStrategy,
  ModelPricing,
} from './cost-tracker.service';

/**
 * 配置加载状态
 */
export interface ConfigLoadStatus {
  modelPricing: { loaded: boolean; count: number; lastUpdate?: Date };
  capabilityTags: { loaded: boolean; count: number; lastUpdate?: Date };
  fallbackChains: { loaded: boolean; count: number; lastUpdate?: Date };
  costStrategies: { loaded: boolean; count: number; lastUpdate?: Date };
}

/**
 * ConfigurationService - 数据库驱动的配置管理服务
 *
 * 负责：
 * - 从数据库加载路由配置
 * - 定期刷新配置
 * - 配置变更通知
 * - 配置状态监控
 */
@Injectable()
export class ConfigurationService implements OnModuleInit {
  private loadStatus: ConfigLoadStatus = {
    modelPricing: { loaded: false, count: 0 },
    capabilityTags: { loaded: false, count: 0 },
    fallbackChains: { loaded: false, count: 0 },
    costStrategies: { loaded: false, count: 0 },
  };

  private refreshInterval: NodeJS.Timeout | null = null;
  private readonly REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 分钟

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly routingEngine: RoutingEngineService,
    private readonly fallbackEngine: FallbackEngineService,
    private readonly costTracker: CostTrackerService,
  ) {}

  /**
   * 模块初始化时加载配置
   */
  async onModuleInit(): Promise<void> {
    this.logger.info('[ConfigurationService] Initializing...');

    // 首次加载配置
    await this.loadAllConfigurations();

    // 启动定期刷新
    this.startPeriodicRefresh();

    this.logger.info('[ConfigurationService] Initialization completed');
  }

  /**
   * 加载所有配置
   */
  async loadAllConfigurations(): Promise<void> {
    this.logger.info('[ConfigurationService] Loading all configurations...');

    try {
      // 并行加载所有配置
      await Promise.all([
        this.loadModelPricing(),
        this.loadCapabilityTags(),
        this.loadFallbackChains(),
        this.loadCostStrategies(),
      ]);

      this.logger.info(
        '[ConfigurationService] All configurations loaded successfully',
      );
    } catch (error) {
      this.logger.error(
        '[ConfigurationService] Failed to load configurations',
        { error },
      );
    }
  }

  /**
   * 加载模型定价配置
   * TODO: 实际实现需要注入 PrismaService 并从数据库读取
   */
  async loadModelPricing(): Promise<void> {
    try {
      // TODO: 从数据库加载
      // const pricing = await this.prisma.modelPricing.findMany({
      //   where: { isDeleted: false, isEnabled: true },
      // });

      // 暂时使用默认配置
      const pricing: ModelPricing[] = [
        {
          model: 'claude-opus-4-20250514',
          vendor: 'anthropic',
          inputPrice: 15,
          outputPrice: 75,
          cacheReadPrice: 1.5,
          cacheWritePrice: 18.75,
          thinkingPrice: 15,
          reasoningScore: 100,
          codingScore: 98,
          creativityScore: 95,
          speedScore: 60,
        },
        {
          model: 'claude-sonnet-4-20250514',
          vendor: 'anthropic',
          inputPrice: 3,
          outputPrice: 15,
          cacheReadPrice: 0.3,
          cacheWritePrice: 3.75,
          thinkingPrice: 3,
          reasoningScore: 92,
          codingScore: 95,
          creativityScore: 90,
          speedScore: 80,
        },
        {
          model: 'gpt-4o',
          vendor: 'openai',
          inputPrice: 2.5,
          outputPrice: 10,
          reasoningScore: 90,
          codingScore: 92,
          creativityScore: 88,
          speedScore: 85,
        },
        {
          model: 'deepseek-chat',
          vendor: 'deepseek',
          inputPrice: 0.14,
          outputPrice: 0.28,
          reasoningScore: 85,
          codingScore: 92,
          creativityScore: 80,
          speedScore: 90,
        },
      ];

      await this.costTracker.loadModelPricingFromDb(pricing);

      this.loadStatus.modelPricing = {
        loaded: true,
        count: pricing.length,
        lastUpdate: new Date(),
      };

      this.logger.info(
        `[ConfigurationService] Loaded ${pricing.length} model pricing entries`,
      );
    } catch (error) {
      this.logger.error(
        '[ConfigurationService] Failed to load model pricing',
        { error },
      );
      this.loadStatus.modelPricing.loaded = false;
    }
  }

  /**
   * 加载能力标签配置
   */
  async loadCapabilityTags(): Promise<void> {
    try {
      // TODO: 从数据库加载
      // const tags = await this.prisma.capabilityTag.findMany({
      //   where: { isDeleted: false, isActive: true },
      // });

      // 暂时使用默认配置
      const tags: CapabilityTag[] = [
        {
          tagId: 'deep-reasoning',
          name: '深度推理',
          category: 'reasoning',
          priority: 100,
          requiredProtocol: 'anthropic-native',
          requiredModels: ['claude-opus-4-20250514', 'claude-sonnet-4-20250514'],
          requiresExtendedThinking: true,
        },
        {
          tagId: 'web-search',
          name: '网络搜索',
          category: 'search',
          priority: 80,
          requiredSkills: ['web_search'],
        },
        {
          tagId: 'cost-optimized',
          name: '成本优化',
          category: 'cost',
          priority: 90,
          requiredModels: ['deepseek-chat', 'gpt-4o-mini'],
          requiresCacheControl: true,
        },
      ];

      await this.routingEngine.loadCapabilityTagsFromDb(tags);

      this.loadStatus.capabilityTags = {
        loaded: true,
        count: tags.length,
        lastUpdate: new Date(),
      };

      this.logger.info(
        `[ConfigurationService] Loaded ${tags.length} capability tags`,
      );
    } catch (error) {
      this.logger.error(
        '[ConfigurationService] Failed to load capability tags',
        { error },
      );
      this.loadStatus.capabilityTags.loaded = false;
    }
  }

  /**
   * 加载 Fallback 链配置
   */
  async loadFallbackChains(): Promise<void> {
    try {
      // TODO: 从数据库加载
      // const chains = await this.prisma.fallbackChain.findMany({
      //   where: { isDeleted: false, isActive: true },
      // });

      // 暂时使用默认配置
      const chains: FallbackChain[] = [
        {
          chainId: 'default',
          name: '默认 Fallback 链',
          models: [
            {
              vendor: 'anthropic',
              model: 'claude-sonnet-4-20250514',
              protocol: 'openai-compatible',
            },
            { vendor: 'openai', model: 'gpt-4o', protocol: 'openai-compatible' },
            {
              vendor: 'deepseek',
              model: 'deepseek-chat',
              protocol: 'openai-compatible',
            },
          ] as FallbackModel[],
          triggerStatusCodes: [429, 500, 502, 503, 504],
          triggerErrorTypes: ['rate_limit', 'overloaded', 'timeout'],
          triggerTimeoutMs: 60000,
          maxRetries: 3,
          retryDelayMs: 2000,
          preserveProtocol: false,
        },
        {
          chainId: 'deep-reasoning',
          name: '深度推理 Fallback 链',
          models: [
            {
              vendor: 'anthropic',
              model: 'claude-sonnet-4-20250514',
              protocol: 'anthropic-native',
              features: { extendedThinking: true },
            },
            { vendor: 'openai', model: 'o1', protocol: 'openai-compatible' },
          ] as FallbackModel[],
          triggerStatusCodes: [429, 500, 502, 503, 504],
          triggerErrorTypes: ['rate_limit', 'overloaded', 'timeout'],
          triggerTimeoutMs: 120000,
          maxRetries: 3,
          retryDelayMs: 3000,
          preserveProtocol: false,
        },
      ];

      await this.fallbackEngine.loadFallbackChainsFromDb(chains);

      this.loadStatus.fallbackChains = {
        loaded: true,
        count: chains.length,
        lastUpdate: new Date(),
      };

      this.logger.info(
        `[ConfigurationService] Loaded ${chains.length} fallback chains`,
      );
    } catch (error) {
      this.logger.error(
        '[ConfigurationService] Failed to load fallback chains',
        { error },
      );
      this.loadStatus.fallbackChains.loaded = false;
    }
  }

  /**
   * 加载成本策略配置
   */
  async loadCostStrategies(): Promise<void> {
    try {
      // TODO: 从数据库加载
      // const strategies = await this.prisma.costStrategy.findMany({
      //   where: { isDeleted: false, isActive: true },
      // });

      // 暂时使用默认配置
      const strategies: CostStrategy[] = [
        {
          strategyId: 'lowest-cost',
          name: '最低成本',
          costWeight: 0.8,
          performanceWeight: 0.1,
          capabilityWeight: 0.1,
          maxCostPerRequest: 0.01,
        },
        {
          strategyId: 'best-value',
          name: '最佳性价比',
          costWeight: 0.5,
          performanceWeight: 0.2,
          capabilityWeight: 0.3,
        },
        {
          strategyId: 'performance-first',
          name: '性能优先',
          costWeight: 0.1,
          performanceWeight: 0.3,
          capabilityWeight: 0.6,
          minCapabilityScore: 85,
        },
      ];

      await this.costTracker.loadCostStrategiesFromDb(strategies);

      this.loadStatus.costStrategies = {
        loaded: true,
        count: strategies.length,
        lastUpdate: new Date(),
      };

      this.logger.info(
        `[ConfigurationService] Loaded ${strategies.length} cost strategies`,
      );
    } catch (error) {
      this.logger.error(
        '[ConfigurationService] Failed to load cost strategies',
        { error },
      );
      this.loadStatus.costStrategies.loaded = false;
    }
  }

  /**
   * 启动定期刷新
   */
  private startPeriodicRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(async () => {
      this.logger.debug('[ConfigurationService] Periodic refresh triggered');
      await this.loadAllConfigurations();
    }, this.REFRESH_INTERVAL_MS);

    this.logger.info(
      `[ConfigurationService] Periodic refresh started (interval: ${this.REFRESH_INTERVAL_MS / 1000}s)`,
    );
  }

  /**
   * 停止定期刷新
   */
  stopPeriodicRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      this.logger.info('[ConfigurationService] Periodic refresh stopped');
    }
  }

  /**
   * 手动触发配置刷新
   */
  async refreshConfigurations(): Promise<void> {
    this.logger.info('[ConfigurationService] Manual refresh triggered');
    await this.loadAllConfigurations();
  }

  /**
   * 获取配置加载状态
   */
  getLoadStatus(): ConfigLoadStatus {
    return { ...this.loadStatus };
  }

  /**
   * 检查配置是否已加载
   */
  isConfigLoaded(): boolean {
    return (
      this.loadStatus.modelPricing.loaded &&
      this.loadStatus.capabilityTags.loaded &&
      this.loadStatus.fallbackChains.loaded &&
      this.loadStatus.costStrategies.loaded
    );
  }
}
