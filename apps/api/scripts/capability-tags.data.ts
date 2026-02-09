/**
 * 能力标签种子数据
 * 定义路由能力标签及其要求，用于智能路由决策
 */

export interface CapabilityTagData {
  tagId: string;
  name: string;
  description?: string;
  category: string;
  priority: number;
  requiredProtocol?: string;
  requiredSkills?: string[];
  requiredModels?: string[];
  requiresExtendedThinking?: boolean;
  requiresCacheControl?: boolean;
  requiresVision?: boolean;
  maxCostPerMToken?: number;
  isBuiltin: boolean;
}

export const CAPABILITY_TAGS_DATA: CapabilityTagData[] = [
  {
    tagId: 'deep-reasoning',
    name: '深度推理',
    description: '需要复杂推理、分析的任务，使用 Extended Thinking',
    category: 'reasoning',
    priority: 100,
    requiredProtocol: 'anthropic-native',
    requiredModels: ['claude-opus-4-20250514', 'claude-sonnet-4-20250514'],
    requiresExtendedThinking: true,
    isBuiltin: true,
  },
  {
    tagId: 'fast-reasoning',
    name: '快速推理',
    description: '需要快速响应的推理任务',
    category: 'reasoning',
    priority: 50,
    requiredProtocol: 'openai-compatible',
    requiredModels: [
      'gpt-4o',
      'claude-sonnet-4-20250514',
      'deepseek-chat',
      'o3-mini',
    ],
    isBuiltin: true,
  },
  {
    tagId: 'web-search',
    name: '网络搜索',
    description: '需要实时搜索互联网信息',
    category: 'search',
    priority: 80,
    requiredSkills: ['web_search'],
    isBuiltin: true,
  },
  {
    tagId: 'code-execution',
    name: '代码执行',
    description: '需要执行代码并返回结果',
    category: 'code',
    priority: 70,
    requiredSkills: ['code_runner'],
    isBuiltin: true,
  },
  {
    tagId: 'cost-optimized',
    name: '成本优化',
    description: '优先使用高性价比模型，支持 Cache Control',
    category: 'cost',
    priority: 90,
    requiredModels: [
      'deepseek-chat',
      'gpt-4o-mini',
      'gemini-2.0-flash',
      'doubao-pro-32k',
    ],
    requiresCacheControl: true,
    isBuiltin: true,
  },
  {
    tagId: 'long-context',
    name: '长上下文',
    description: '需要处理超长文档或对话历史',
    category: 'context',
    priority: 60,
    requiredProtocol: 'openai-compatible',
    requiredModels: [
      'gemini-1.5-pro',
      'gemini-2.0-flash-exp',
      'doubao-pro-128k',
    ],
    isBuiltin: true,
  },
  {
    tagId: 'vision',
    name: '视觉理解',
    description: '需要处理图像、视频等多模态内容',
    category: 'vision',
    priority: 75,
    requiredModels: [
      'gpt-4o',
      'claude-sonnet-4-20250514',
      'gemini-2.0-flash-exp',
    ],
    requiresVision: true,
    isBuiltin: true,
  },
  {
    tagId: 'coding',
    name: '编程任务',
    description: '代码生成、调试、重构等编程相关任务',
    category: 'code',
    priority: 65,
    requiredModels: [
      'claude-sonnet-4-20250514',
      'deepseek-chat',
      'gpt-4o',
      'o3-mini',
    ],
    isBuiltin: true,
  },
];
