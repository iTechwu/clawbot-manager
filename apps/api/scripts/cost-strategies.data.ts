/**
 * 成本策略种子数据
 * 定义成本优化策略，用于模型选择决策
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
    description: '优先选择成本最低的模型，适合预算有限的场景',
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
    description: '在成本和能力之间取得平衡',
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
    description: '优先选择能力最强的模型，不考虑成本',
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
    description: '综合考虑成本、性能和能力',
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
];
