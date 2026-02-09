import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
  BotModelRoutingService,
  BotProviderKeyService,
  ProviderKeyService,
} from '@app/db';
import type { BotModelRouting, ModelRoutingType } from '@prisma/client';
import type {
  RoutingConfig,
  FunctionRouteConfig,
  LoadBalanceConfig,
  FailoverConfig,
  RoutingTarget,
} from '@repo/contracts';

/**
 * 模型路由结果
 */
export interface ModelRouteResult {
  /** Provider Key ID */
  providerKeyId: string;
  /** Provider vendor (e.g., 'openai', 'anthropic') */
  vendor: string;
  /** Model name */
  model: string;
  /** API type */
  apiType: string | null;
  /** Base URL */
  baseUrl: string | null;
  /** Routing reason (for logging) */
  reason: string;
  /** Matched rule pattern (for function routing) */
  matchedRule?: string;
}

/**
 * 路由请求参数
 */
export interface RouteRequest {
  /** Bot ID */
  botId: string;
  /** User message */
  message: string;
  /** Optional routing hint */
  routingHint?: string;
}

/**
 * 负载均衡状态（用于 round-robin）
 */
interface LoadBalanceState {
  currentIndex: number;
  lastUpdated: Date;
}

/**
 * ModelRouterService
 *
 * 负责根据路由配置选择合适的模型和 Provider
 * 支持三种路由策略：
 * 1. 功能路由 (FUNCTION_ROUTE) - 根据消息内容匹配规则
 * 2. 负载均衡 (LOAD_BALANCE) - 在多个模型之间分配流量
 * 3. 故障转移 (FAILOVER) - 主模型失败时切换到备用模型
 */
@Injectable()
export class ModelRouterService {
  // 负载均衡状态缓存 (botId -> state)
  private loadBalanceStates = new Map<string, LoadBalanceState>();

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly botModelRoutingService: BotModelRoutingService,
    private readonly botProviderKeyService: BotProviderKeyService,
    private readonly providerKeyService: ProviderKeyService,
  ) {}

  /**
   * 根据路由配置选择模型
   */
  async routeRequest(request: RouteRequest): Promise<ModelRouteResult> {
    const { botId, message, routingHint } = request;

    // 1. 获取 Bot 的所有启用的路由配置，按优先级排序
    const { list: routingConfigs } = await this.botModelRoutingService.list(
      { botId, isEnabled: true },
      { orderBy: { priority: 'asc' } },
    );

    // 2. 依次尝试匹配路由
    for (const routing of routingConfigs) {
      const result = await this.tryRoute(routing, message, routingHint);
      if (result) {
        this.logger.info('Model route matched', {
          botId,
          routingId: routing.id,
          routingType: routing.routingType,
          result: {
            vendor: result.vendor,
            model: result.model,
            reason: result.reason,
          },
        });
        return result;
      }
    }

    // 3. 没有匹配的路由，使用默认（主 Provider）
    return this.getDefaultRoute(botId);
  }

  /**
   * 尝试匹配单个路由配置
   */
  private async tryRoute(
    routing: BotModelRouting,
    message: string,
    routingHint?: string,
  ): Promise<ModelRouteResult | null> {
    const config = routing.config as unknown as RoutingConfig;

    switch (routing.routingType) {
      case 'FUNCTION_ROUTE':
        return this.tryFunctionRoute(config as FunctionRouteConfig, message);
      case 'LOAD_BALANCE':
        return this.tryLoadBalance(routing.id, config as LoadBalanceConfig);
      case 'FAILOVER':
        // Failover 不在路由阶段处理，而是在执行阶段处理
        // 这里返回主要目标
        return this.resolveTarget(
          (config as FailoverConfig).primary,
          'Failover primary target',
        );
      default:
        return null;
    }
  }

  /**
   * 功能路由匹配
   */
  private async tryFunctionRoute(
    config: FunctionRouteConfig,
    message: string,
  ): Promise<ModelRouteResult | null> {
    for (const rule of config.rules) {
      const matched = this.matchRule(rule.pattern, rule.matchType, message);
      if (matched) {
        const result = await this.resolveTarget(
          rule.target,
          `Function route matched: ${rule.pattern}`,
        );
        if (result) {
          result.matchedRule = rule.pattern;
        }
        return result;
      }
    }

    // 没有匹配的规则，使用默认目标
    return this.resolveTarget(
      config.defaultTarget,
      'Function route default target',
    );
  }

  /**
   * 匹配规则
   */
  private matchRule(
    pattern: string,
    matchType: 'regex' | 'keyword' | 'intent',
    message: string,
  ): boolean {
    switch (matchType) {
      case 'regex':
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(message);
        } catch {
          this.logger.warn('Invalid regex pattern', { pattern });
          return false;
        }
      case 'keyword':
        // 关键词匹配：支持 | 分隔的多个关键词
        const keywords = pattern.split('|').map((k) => k.trim().toLowerCase());
        const lowerMessage = message.toLowerCase();
        return keywords.some((keyword) => lowerMessage.includes(keyword));
      case 'intent':
        // Intent 匹配：简单实现，后续可以接入 NLU 服务
        // 目前使用关键词匹配作为 fallback
        const intentKeywords = pattern
          .split('|')
          .map((k) => k.trim().toLowerCase());
        const lowerMsg = message.toLowerCase();
        return intentKeywords.some((keyword) => lowerMsg.includes(keyword));
      default:
        return false;
    }
  }

  /**
   * 负载均衡选择
   */
  private async tryLoadBalance(
    routingId: string,
    config: LoadBalanceConfig,
  ): Promise<ModelRouteResult | null> {
    const { strategy, targets } = config;

    if (targets.length === 0) {
      return null;
    }

    let selectedTarget: RoutingTarget;
    let reason: string;

    switch (strategy) {
      case 'round_robin':
        const index = this.getNextRoundRobinIndex(routingId, targets.length);
        selectedTarget = targets[index];
        reason = `Load balance (round-robin): index ${index}`;
        break;

      case 'weighted':
        selectedTarget = this.selectByWeight(targets);
        reason = `Load balance (weighted): weight ${(selectedTarget as any).weight}`;
        break;

      case 'least_latency':
        // 最低延迟策略：需要延迟统计数据
        // 目前使用 round-robin 作为 fallback
        const leastLatencyIndex = this.getNextRoundRobinIndex(
          routingId,
          targets.length,
        );
        selectedTarget = targets[leastLatencyIndex];
        reason = `Load balance (least_latency fallback): index ${leastLatencyIndex}`;
        break;

      default:
        selectedTarget = targets[0];
        reason = 'Load balance (default): first target';
    }

    return this.resolveTarget(selectedTarget, reason);
  }

  /**
   * 获取下一个 round-robin 索引
   */
  private getNextRoundRobinIndex(
    routingId: string,
    targetCount: number,
  ): number {
    let state = this.loadBalanceStates.get(routingId);
    if (!state) {
      state = { currentIndex: 0, lastUpdated: new Date() };
      this.loadBalanceStates.set(routingId, state);
    }

    const index = state.currentIndex;
    state.currentIndex = (state.currentIndex + 1) % targetCount;
    state.lastUpdated = new Date();

    return index;
  }

  /**
   * 按权重选择目标
   */
  private selectByWeight(
    targets: Array<RoutingTarget & { weight: number }>,
  ): RoutingTarget {
    const totalWeight = targets.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;

    for (const target of targets) {
      random -= target.weight;
      if (random <= 0) {
        return target;
      }
    }

    return targets[targets.length - 1];
  }

  /**
   * 解析路由目标，获取完整的 Provider 信息
   */
  private async resolveTarget(
    target: RoutingTarget,
    reason: string,
  ): Promise<ModelRouteResult | null> {
    const providerKey = await this.providerKeyService.getById(
      target.providerKeyId,
    );

    if (!providerKey) {
      this.logger.warn('Provider key not found', {
        providerKeyId: target.providerKeyId,
      });
      return null;
    }

    return {
      providerKeyId: target.providerKeyId,
      vendor: providerKey.vendor,
      model: target.model,
      apiType: providerKey.apiType,
      baseUrl: providerKey.baseUrl,
      reason,
    };
  }

  /**
   * 获取默认路由（主 Provider）
   */
  private async getDefaultRoute(botId: string): Promise<ModelRouteResult> {
    // 获取主要 Provider
    const primaryBotProviderKey = await this.botProviderKeyService.get({
      botId,
      isPrimary: true,
    });

    if (!primaryBotProviderKey) {
      // 尝试获取任意一个 Provider
      const { list: allProviderKeys } = await this.botProviderKeyService.list(
        { botId },
        { limit: 1 },
      );

      if (allProviderKeys.length === 0) {
        throw new Error(`No provider configured for bot ${botId}`);
      }

      const providerKey = await this.providerKeyService.getById(
        allProviderKeys[0].providerKeyId,
      );

      if (!providerKey) {
        throw new Error(`Provider key not found for bot ${botId}`);
      }

      return {
        providerKeyId: allProviderKeys[0].providerKeyId,
        vendor: providerKey.vendor,
        model:
          allProviderKeys[0].primaryModel ||
          allProviderKeys[0].allowedModels[0] ||
          '',
        apiType: providerKey.apiType,
        baseUrl: providerKey.baseUrl,
        reason: 'Default route (first available provider)',
      };
    }

    const providerKey = await this.providerKeyService.getById(
      primaryBotProviderKey.providerKeyId,
    );

    if (!providerKey) {
      throw new Error(`Provider key not found for bot ${botId}`);
    }

    return {
      providerKeyId: primaryBotProviderKey.providerKeyId,
      vendor: providerKey.vendor,
      model:
        primaryBotProviderKey.primaryModel ||
        primaryBotProviderKey.allowedModels[0] ||
        '',
      apiType: providerKey.apiType,
      baseUrl: providerKey.baseUrl,
      reason: 'Default route (primary provider)',
    };
  }

  /**
   * 执行带故障转移的操作
   */
  async executeWithFailover<T>(
    botId: string,
    routingId: string,
    operation: (route: ModelRouteResult) => Promise<T>,
  ): Promise<T> {
    const routing = await this.botModelRoutingService.getById(routingId);

    if (!routing || routing.routingType !== 'FAILOVER') {
      // 不是故障转移配置，直接执行
      const route = await this.getDefaultRoute(botId);
      return operation(route);
    }

    const config = routing.config as unknown as FailoverConfig;
    const allTargets = [config.primary, ...config.fallbackChain];
    const { maxAttempts, delayMs } = config.retry;

    for (let targetIndex = 0; targetIndex < allTargets.length; targetIndex++) {
      const target = allTargets[targetIndex];

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const route = await this.resolveTarget(
            target,
            `Failover target ${targetIndex}, attempt ${attempt + 1}`,
          );

          if (!route) {
            this.logger.warn('Failed to resolve failover target', {
              targetIndex,
              target,
            });
            break; // 跳到下一个目标
          }

          return await operation(route);
        } catch (error) {
          this.logger.warn('Failover attempt failed', {
            targetIndex,
            attempt: attempt + 1,
            maxAttempts,
            error: error instanceof Error ? error.message : String(error),
          });

          if (attempt < maxAttempts - 1) {
            await this.delay(delayMs);
          }
        }
      }

      this.logger.warn('All attempts failed for target, trying next', {
        targetIndex,
        target,
      });
    }

    throw new Error('All failover targets exhausted');
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 测试路由（不实际执行，只返回会选择哪个模型）
   */
  async testRoute(request: RouteRequest): Promise<ModelRouteResult> {
    return this.routeRequest(request);
  }

  /**
   * 获取 Bot 的所有路由配置
   */
  async getRoutingConfigs(botId: string): Promise<BotModelRouting[]> {
    const { list } = await this.botModelRoutingService.list(
      { botId },
      { orderBy: { priority: 'asc' } },
    );
    return list;
  }

  /**
   * 清除负载均衡状态缓存
   */
  clearLoadBalanceState(routingId?: string): void {
    if (routingId) {
      this.loadBalanceStates.delete(routingId);
    } else {
      this.loadBalanceStates.clear();
    }
  }
}
