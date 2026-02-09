import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

/**
 * 能力标签定义
 */
export interface CapabilityTag {
  tagId: string;
  name: string;
  category: string;
  priority: number;
  requiredProtocol?: 'openai-compatible' | 'anthropic-native';
  requiredSkills?: string[];
  requiredModels?: string[];
  requiresExtendedThinking?: boolean;
  requiresCacheControl?: boolean;
  requiresVision?: boolean;
}

/**
 * 路由决策结果
 */
export interface RouteDecision {
  protocol: 'openai-compatible' | 'anthropic-native';
  vendor: string;
  model: string;
  features: {
    extendedThinking?: boolean;
    thinkingBudget?: number;
    cacheControl?: boolean;
  };
  fallbackChainId?: string;
  costStrategyId?: string;
}

/**
 * 代理请求体（用于解析能力需求）
 */
export interface ProxyRequestBody {
  model?: string;
  messages?: Array<{
    role: string;
    content: unknown;
    cache_control?: { type: string };
  }>;
  tools?: Array<{
    type?: string;
    name?: string;
    function?: { name: string };
  }>;
  thinking?: {
    type: string;
    budget_tokens?: number;
  };
  stream?: boolean;
}

/**
 * Bot 配置（用于路由决策）
 */
export interface BotRoutingContext {
  botId: string;
  installedSkills: string[];
  routingConfig?: {
    routingEnabled: boolean;
    routingMode: 'auto' | 'manual' | 'cost-optimized';
    fallbackChainId?: string;
    costStrategyId?: string;
  };
}

/**
 * RoutingEngineService - 能力标签路由引擎
 *
 * 负责：
 * - 解析请求的能力需求
 * - 检查 Skills 可用性
 * - 选择最优路由（协议、模型）
 * - 返回路由决策
 */
@Injectable()
export class RoutingEngineService {
  // 预定义能力标签（后续从数据库加载）
  private capabilityTags: Map<string, CapabilityTag> = new Map();

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.initializeDefaultTags();
  }

  /**
   * 初始化默认能力标签
   */
  private initializeDefaultTags(): void {
    const defaultTags: CapabilityTag[] = [
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
        tagId: 'fast-reasoning',
        name: '快速推理',
        category: 'reasoning',
        priority: 50,
        requiredProtocol: 'openai-compatible',
        requiredModels: [
          'gpt-4o',
          'claude-sonnet-4-20250514',
          'deepseek-chat',
          'o3-mini',
        ],
      },
      {
        tagId: 'web-search',
        name: '网络搜索',
        category: 'search',
        priority: 80,
        requiredSkills: ['web_search'],
      },
      {
        tagId: 'code-execution',
        name: '代码执行',
        category: 'code',
        priority: 70,
        requiredSkills: ['code_runner'],
      },
      {
        tagId: 'cost-optimized',
        name: '成本优化',
        category: 'cost',
        priority: 90,
        requiredModels: [
          'deepseek-chat',
          'gpt-4o-mini',
          'gemini-2.0-flash',
          'doubao-pro-32k',
        ],
        requiresCacheControl: true,
      },
      {
        tagId: 'long-context',
        name: '长上下文',
        category: 'context',
        priority: 60,
        requiredProtocol: 'openai-compatible',
        requiredModels: ['gemini-1.5-pro', 'gemini-2.0-flash', 'doubao-pro-128k'],
      },
      {
        tagId: 'vision',
        name: '视觉理解',
        category: 'vision',
        priority: 75,
        requiredModels: ['gpt-4o', 'claude-sonnet-4-20250514', 'gemini-2.0-flash'],
        requiresVision: true,
      },
    ];

    for (const tag of defaultTags) {
      this.capabilityTags.set(tag.tagId, tag);
    }
  }

  /**
   * 从数据库加载能力标签配置
   */
  async loadCapabilityTagsFromDb(
    tags: CapabilityTag[],
  ): Promise<void> {
    this.capabilityTags.clear();
    for (const tag of tags) {
      this.capabilityTags.set(tag.tagId, tag);
    }
    this.logger.info(
      `[RoutingEngine] Loaded ${tags.length} capability tags from database`,
    );
  }

  /**
   * 解析请求的能力需求
   */
  parseCapabilityRequirements(
    requestBody: ProxyRequestBody,
    routingHint?: string,
  ): CapabilityTag[] {
    const tags: CapabilityTag[] = [];

    // 1. 检测路由提示（优先级最高）
    if (routingHint && this.capabilityTags.has(routingHint)) {
      const tag = this.capabilityTags.get(routingHint)!;
      tags.push(tag);
      this.logger.debug(
        `[RoutingEngine] Routing hint detected: ${routingHint}`,
      );
    }

    // 2. 检测 Extended Thinking
    if (requestBody.thinking?.type === 'enabled') {
      const tag = this.capabilityTags.get('deep-reasoning');
      if (tag && !tags.some((t) => t.tagId === 'deep-reasoning')) {
        tags.push(tag);
        this.logger.debug(
          '[RoutingEngine] Extended Thinking detected -> deep-reasoning',
        );
      }
    }

    // 3. 检测 Cache Control
    if (requestBody.messages?.some((m) => m.cache_control)) {
      const tag = this.capabilityTags.get('cost-optimized');
      if (tag && !tags.some((t) => t.tagId === 'cost-optimized')) {
        tags.push(tag);
        this.logger.debug(
          '[RoutingEngine] Cache Control detected -> cost-optimized',
        );
      }
    }

    // 4. 检测搜索需求（tools 中包含 web_search）
    if (
      requestBody.tools?.some(
        (t) =>
          t.type === 'web_search' ||
          t.name === 'web_search' ||
          t.function?.name === 'web_search',
      )
    ) {
      const tag = this.capabilityTags.get('web-search');
      if (tag && !tags.some((t) => t.tagId === 'web-search')) {
        tags.push(tag);
        this.logger.debug('[RoutingEngine] Web search tool detected');
      }
    }

    // 5. 检测代码执行需求
    if (
      requestBody.tools?.some(
        (t) =>
          t.type === 'code_execution' ||
          t.name === 'code_runner' ||
          t.function?.name === 'code_runner',
      )
    ) {
      const tag = this.capabilityTags.get('code-execution');
      if (tag && !tags.some((t) => t.tagId === 'code-execution')) {
        tags.push(tag);
        this.logger.debug('[RoutingEngine] Code execution tool detected');
      }
    }

    // 6. 检测视觉需求（messages 中包含图像）
    if (this.hasVisionContent(requestBody.messages)) {
      const tag = this.capabilityTags.get('vision');
      if (tag && !tags.some((t) => t.tagId === 'vision')) {
        tags.push(tag);
        this.logger.debug('[RoutingEngine] Vision content detected');
      }
    }

    // 按优先级排序
    tags.sort((a, b) => b.priority - a.priority);

    return tags;
  }

  /**
   * 检查消息中是否包含视觉内容
   */
  private hasVisionContent(
    messages?: ProxyRequestBody['messages'],
  ): boolean {
    if (!messages) return false;

    return messages.some((msg) => {
      if (Array.isArray(msg.content)) {
        return msg.content.some(
          (part: unknown) =>
            typeof part === 'object' &&
            part !== null &&
            'type' in part &&
            (part as { type: string }).type === 'image_url',
        );
      }
      return false;
    });
  }

  /**
   * 检查 Skills 是否可以满足需求
   */
  checkSkillsAvailability(
    requirements: CapabilityTag[],
    installedSkills: string[],
  ): { satisfied: boolean; missingSkills: string[] } {
    const missingSkills: string[] = [];

    for (const tag of requirements) {
      if (tag.requiredSkills && tag.requiredSkills.length > 0) {
        for (const skill of tag.requiredSkills) {
          if (!installedSkills.includes(skill)) {
            missingSkills.push(skill);
          }
        }
      }
    }

    return {
      satisfied: missingSkills.length === 0,
      missingSkills,
    };
  }

  /**
   * 选择最优路由
   */
  selectRoute(
    requirements: CapabilityTag[],
    context: BotRoutingContext,
    requestedModel?: string,
  ): RouteDecision {
    // 默认路由决策
    const decision: RouteDecision = {
      protocol: 'openai-compatible',
      vendor: 'openai',
      model: requestedModel || 'gpt-4o',
      features: {},
    };

    // 如果没有特殊需求，使用请求的模型
    if (requirements.length === 0) {
      if (requestedModel) {
        decision.model = requestedModel;
        decision.vendor = this.inferVendorFromModel(requestedModel);
      }
      return decision;
    }

    // 获取最高优先级的需求
    const primaryRequirement = requirements[0];

    // 1. 检查是否需要原生协议
    if (primaryRequirement.requiresExtendedThinking) {
      decision.protocol = 'anthropic-native';
      decision.features.extendedThinking = true;
      decision.vendor = 'anthropic';
      // 选择支持 Extended Thinking 的模型
      decision.model =
        primaryRequirement.requiredModels?.[0] || 'claude-sonnet-4-20250514';
      this.logger.info(
        `[RoutingEngine] Route to Anthropic Native for Extended Thinking`,
      );
    } else if (primaryRequirement.requiresCacheControl) {
      // Cache Control 也需要 Anthropic Native
      decision.protocol = 'anthropic-native';
      decision.features.cacheControl = true;
      decision.vendor = 'anthropic';
      decision.model = requestedModel || 'claude-sonnet-4-20250514';
      this.logger.info(
        `[RoutingEngine] Route to Anthropic Native for Cache Control`,
      );
    } else if (primaryRequirement.requiredProtocol) {
      decision.protocol = primaryRequirement.requiredProtocol;
    }

    // 2. 检查 Skills 是否可以满足需求
    const skillsCheck = this.checkSkillsAvailability(
      requirements,
      context.installedSkills,
    );

    if (!skillsCheck.satisfied) {
      this.logger.warn(
        `[RoutingEngine] Missing skills: ${skillsCheck.missingSkills.join(', ')}`,
      );
      // 如果缺少 Skills，可能需要降级或使用原生功能
    }

    // 3. 应用路由配置
    if (context.routingConfig) {
      if (context.routingConfig.fallbackChainId) {
        decision.fallbackChainId = context.routingConfig.fallbackChainId;
      }
      if (context.routingConfig.costStrategyId) {
        decision.costStrategyId = context.routingConfig.costStrategyId;
      }
    }

    this.logger.info(
      `[RoutingEngine] Route decision: ${decision.protocol} -> ${decision.vendor}/${decision.model}`,
    );

    return decision;
  }

  /**
   * 从模型名称推断 vendor
   */
  private inferVendorFromModel(model: string): string {
    const modelLower = model.toLowerCase();

    if (modelLower.includes('claude')) return 'anthropic';
    if (modelLower.includes('gpt') || modelLower.includes('o1') || modelLower.includes('o3'))
      return 'openai';
    if (modelLower.includes('gemini')) return 'google';
    if (modelLower.includes('deepseek')) return 'deepseek';
    if (modelLower.includes('doubao')) return 'doubao';
    if (modelLower.includes('qwen')) return 'dashscope';
    if (modelLower.includes('glm')) return 'zhipu';
    if (modelLower.includes('llama')) return 'meta';
    if (modelLower.includes('mistral')) return 'mistral';

    return 'openai'; // 默认
  }

  /**
   * 获取所有能力标签
   */
  getAllCapabilityTags(): CapabilityTag[] {
    return Array.from(this.capabilityTags.values());
  }

  /**
   * 获取指定能力标签
   */
  getCapabilityTag(tagId: string): CapabilityTag | undefined {
    return this.capabilityTags.get(tagId);
  }
}
