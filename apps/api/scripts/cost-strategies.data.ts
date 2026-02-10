/**
 * 成本策略种子数据
 * 定义成本优化策略，用于模型选择决策
 * 最后更新：2026-02-10
 */

export interface CostStrategyData {
  strategyId: string;
  name: string;
  description?: string;
  costWeight: number;
  performanceWeight: number;
  capabilityWeight: number;
  maxCostPerRequest?: number;
  maxLatencyMs?: number;
  minCapabilityScore?: number;
  scenarioWeights?: {
    reasoning?: number;
    coding?: number;
    creativity?: number;
    speed?: number;
  };
  isBuiltin: boolean;
}

export const COST_STRATEGIES_DATA: CostStrategyData[] = [
  {
    strategyId: 'lowest-cost',
    name: '最低成本',
    description: '优先选择成本最低的模型，适合预算有限或简单任务场景',
    costWeight: 0.8,
    performanceWeight: 0.1,
    capabilityWeight: 0.1,
    maxCostPerRequest: 0.01,
    scenarioWeights: {
      reasoning: 0.2,
      coding: 0.2,
      creativity: 0.2,
      speed: 0.6,
    },
    isBuiltin: true,
  },
  {
    strategyId: 'best-value',
    name: '最佳性价比',
    description: '在成本和能力之间取得最佳平衡，推荐大多数场景使用',
    costWeight: 0.5,
    performanceWeight: 0.2,
    capabilityWeight: 0.3,
    scenarioWeights: {
      reasoning: 0.4,
      coding: 0.4,
      creativity: 0.3,
      speed: 0.4,
    },
    isBuiltin: true,
  },
  {
    strategyId: 'performance-first',
    name: '性能优先',
    description: '优先选择能力最强的模型，不考虑成本，适合关键任务',
    costWeight: 0.1,
    performanceWeight: 0.3,
    capabilityWeight: 0.6,
    minCapabilityScore: 85,
    scenarioWeights: {
      reasoning: 0.8,
      coding: 0.7,
      creativity: 0.5,
      speed: 0.3,
    },
    isBuiltin: true,
  },
  {
    strategyId: 'balanced',
    name: '均衡策略',
    description: '综合考虑成本、性能和能力，适合一般业务场景',
    costWeight: 0.4,
    performanceWeight: 0.3,
    capabilityWeight: 0.3,
    scenarioWeights: {
      reasoning: 0.5,
      coding: 0.5,
      creativity: 0.4,
      speed: 0.5,
    },
    isBuiltin: true,
  },
  {
    strategyId: 'speed-first',
    name: '速度优先',
    description: '优先选择响应速度最快的模型，适合实时交互场景',
    costWeight: 0.3,
    performanceWeight: 0.5,
    capabilityWeight: 0.2,
    maxLatencyMs: 5000,
    scenarioWeights: {
      reasoning: 0.3,
      coding: 0.3,
      creativity: 0.2,
      speed: 0.9,
    },
    isBuiltin: true,
  },
  {
    strategyId: 'reasoning-optimized',
    name: '推理优化',
    description: '优先选择推理能力强的模型，适合复杂分析任务',
    costWeight: 0.2,
    performanceWeight: 0.3,
    capabilityWeight: 0.5,
    minCapabilityScore: 90,
    scenarioWeights: {
      reasoning: 0.9,
      coding: 0.6,
      creativity: 0.4,
      speed: 0.2,
    },
    isBuiltin: true,
  },
  {
    strategyId: 'coding-optimized',
    name: '编程优化',
    description: '优先选择代码能力强的模型，适合开发任务',
    costWeight: 0.3,
    performanceWeight: 0.3,
    capabilityWeight: 0.4,
    minCapabilityScore: 88,
    scenarioWeights: {
      reasoning: 0.6,
      coding: 0.9,
      creativity: 0.3,
      speed: 0.4,
    },
    isBuiltin: true,
  },
  {
    strategyId: 'creative-optimized',
    name: '创意优化',
    description: '优先选择创造力强的模型，适合内容创作任务',
    costWeight: 0.3,
    performanceWeight: 0.2,
    capabilityWeight: 0.5,
    scenarioWeights: {
      reasoning: 0.4,
      coding: 0.3,
      creativity: 0.9,
      speed: 0.3,
    },
    isBuiltin: true,
  },
  {
    strategyId: 'enterprise',
    name: '企业级',
    description: '企业级策略，平衡成本控制与服务质量',
    costWeight: 0.35,
    performanceWeight: 0.35,
    capabilityWeight: 0.3,
    maxCostPerRequest: 0.1,
    minCapabilityScore: 80,
    scenarioWeights: {
      reasoning: 0.5,
      coding: 0.5,
      creativity: 0.4,
      speed: 0.5,
    },
    isBuiltin: true,
  },
];
