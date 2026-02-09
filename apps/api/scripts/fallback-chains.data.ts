/**
 * Fallback 链种子数据
 * 定义模型降级策略，支持多模型故障转移
 */

export interface FallbackChainModel {
  vendor: string;
  model: string;
  protocol: 'openai-compatible' | 'anthropic-native';
  features?: {
    extendedThinking?: boolean;
    cacheControl?: boolean;
  };
}

export interface FallbackChainData {
  chainId: string;
  name: string;
  description?: string;
  models: FallbackChainModel[];
  triggerStatusCodes: number[];
  triggerErrorTypes: string[];
  triggerTimeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
  preserveProtocol: boolean;
  isBuiltin: boolean;
}

export const FALLBACK_CHAINS_DATA: FallbackChainData[] = [
  {
    chainId: 'default',
    name: '默认 Fallback 链',
    description: '通用场景的模型降级策略',
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
    ],
    triggerStatusCodes: [429, 500, 502, 503, 504],
    triggerErrorTypes: ['rate_limit', 'overloaded', 'timeout'],
    triggerTimeoutMs: 60000,
    maxRetries: 3,
    retryDelayMs: 2000,
    preserveProtocol: false,
    isBuiltin: true,
  },
  {
    chainId: 'deep-reasoning',
    name: '深度推理 Fallback 链',
    description: '深度推理任务的模型降级策略，优先保持 Extended Thinking',
    models: [
      {
        vendor: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        protocol: 'anthropic-native',
        features: { extendedThinking: true },
      },
      {
        vendor: 'anthropic',
        model: 'claude-opus-4-20250514',
        protocol: 'anthropic-native',
        features: { extendedThinking: true },
      },
      { vendor: 'openai', model: 'o1', protocol: 'openai-compatible' },
      {
        vendor: 'deepseek',
        model: 'deepseek-reasoner',
        protocol: 'openai-compatible',
      },
    ],
    triggerStatusCodes: [429, 500, 502, 503, 504],
    triggerErrorTypes: ['rate_limit', 'overloaded', 'timeout'],
    triggerTimeoutMs: 120000,
    maxRetries: 3,
    retryDelayMs: 3000,
    preserveProtocol: false,
    isBuiltin: true,
  },
  {
    chainId: 'cost-optimized',
    name: '成本优化 Fallback 链',
    description: '优先使用低成本模型',
    models: [
      {
        vendor: 'deepseek',
        model: 'deepseek-chat',
        protocol: 'openai-compatible',
      },
      {
        vendor: 'openai',
        model: 'gpt-4o-mini',
        protocol: 'openai-compatible',
      },
      {
        vendor: 'google',
        model: 'gemini-2.0-flash-exp',
        protocol: 'openai-compatible',
      },
      {
        vendor: 'doubao',
        model: 'doubao-pro-32k',
        protocol: 'openai-compatible',
      },
    ],
    triggerStatusCodes: [429, 500, 502, 503, 504],
    triggerErrorTypes: ['rate_limit', 'overloaded', 'timeout'],
    triggerTimeoutMs: 30000,
    maxRetries: 3,
    retryDelayMs: 1000,
    preserveProtocol: true,
    isBuiltin: true,
  },
  {
    chainId: 'fast-response',
    name: '快速响应 Fallback 链',
    description: '优先使用响应速度快的模型',
    models: [
      {
        vendor: 'anthropic',
        model: 'claude-3-5-haiku-20241022',
        protocol: 'openai-compatible',
      },
      {
        vendor: 'openai',
        model: 'gpt-4o-mini',
        protocol: 'openai-compatible',
      },
      {
        vendor: 'google',
        model: 'gemini-2.0-flash-exp',
        protocol: 'openai-compatible',
      },
    ],
    triggerStatusCodes: [429, 500, 502, 503, 504],
    triggerErrorTypes: ['rate_limit', 'overloaded', 'timeout'],
    triggerTimeoutMs: 15000,
    maxRetries: 2,
    retryDelayMs: 500,
    preserveProtocol: true,
    isBuiltin: true,
  },
];
