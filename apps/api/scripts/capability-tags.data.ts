/**
 * 能力标签种子数据
 * 定义路由能力标签及其要求，用于智能路由决策
 * 最后更新：2026-02-10
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
    description: '需要复杂推理、分析的任务，使用 Extended Thinking 或推理模型',
    category: 'reasoning',
    priority: 100,
    requiredModels: [
      'claude-opus-4-5-20251101',
      'claude-opus-4-6',
      'claude-sonnet-4-5-20250929',
      'claude-sonnet-4-5-20250929-thinking',
      'o3',
      'gpt-5-pro',
      'gpt-5.2-pro',
      'grok-4',
      'deepseek-r1',
      'doubao-seed-1-6-thinking-250615',
    ],
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
      'gpt-4.1',
      'gpt-5-mini',
      'o4-mini',
      'claude-sonnet-4-20250514',
      'claude-haiku-4-5-20251001',
      'deepseek-v3',
      'gemini-2.5-flash',
      'gemini-3-flash-preview',
      'grok-3-mini',
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
    description: '优先使用高性价比模型',
    category: 'cost',
    priority: 90,
    requiredModels: [
      'deepseek-v3',
      'deepseek-r1',
      'gpt-4o-mini',
      'gpt-4.1-mini',
      'gpt-5-mini',
      'gemini-2.5-flash',
      'gemini-3-flash-preview',
      'doubao-1-5-pro-32k-250115',
      'doubao-seed-1-6-flash-250615',
      'claude-haiku-4-5-20251001',
    ],
    maxCostPerMToken: 1,
    isBuiltin: true,
  },
  {
    tagId: 'long-context',
    name: '长上下文',
    description: '需要处理超长文档或对话历史（100K+ tokens）',
    category: 'context',
    priority: 60,
    requiredModels: [
      'gemini-2.5-pro',
      'gemini-3-pro-preview',
      'gpt-5',
      'gpt-5.1',
      'gpt-5.2',
      'grok-4',
      'claude-opus-4-5-20251101',
      'claude-sonnet-4-5-20250929',
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
      'gpt-4.1',
      'gpt-5',
      'claude-sonnet-4-5-20250929',
      'claude-opus-4-5-20251101',
      'gemini-2.5-pro',
      'gemini-3-pro-preview',
      'grok-4',
      'doubao-1-5-vision-pro-32k-250115',
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
      'claude-sonnet-4-5-20250929',
      'claude-opus-4-5-20251101',
      'gpt-5-codex',
      'gpt-5.1-codex',
      'gpt-5.2-codex',
      'deepseek-v3',
      'grok-code-fast-1',
      'o3',
      'o4-mini',
    ],
    isBuiltin: true,
  },
  {
    tagId: 'image-generation',
    name: '图像生成',
    description: '文本到图像生成任务',
    category: 'creative',
    priority: 70,
    requiredModels: [
      'Midjourney',
      'gpt-image-1',
      'gpt-image-1.5',
      'flux-kontext-pro',
      'flux-kontext-max',
      'ideogram-generate-v3',
      'doubao-seedream-4-5-251128',
      'qwen-image-plus',
      'grok-4-image',
    ],
    isBuiltin: true,
  },
  {
    tagId: 'video-generation',
    name: '视频生成',
    description: '文本/图像到视频生成任务',
    category: 'creative',
    priority: 72,
    requiredModels: [
      'sora-2',
      'sora-2-pro',
      'veo3',
      'veo3.1',
      'kling-v2.6-pro',
      'kling-video-o1-pro',
      'hailuo-2.3-pro',
      'viduq3-pro',
      'wan-2.6',
      'doubao-seedance-1-5-pro-251215',
    ],
    isBuiltin: true,
  },
  {
    tagId: 'audio-tts',
    name: '语音合成',
    description: '文本到语音合成任务',
    category: 'audio',
    priority: 55,
    requiredModels: [
      'gpt-4o-mini-tts',
      'speech-2.6-hd',
      'speech-2.5-hd-preview',
      'gemini-2.5-flash-preview-tts',
    ],
    isBuiltin: true,
  },
  {
    tagId: 'creative',
    name: '创意写作',
    description: '需要高创造力的写作、故事、营销文案等任务',
    category: 'creative',
    priority: 58,
    requiredModels: [
      'claude-opus-4-5-20251101',
      'gpt-5-pro',
      'gpt-5.2-pro',
      'grok-4',
      'gemini-3-pro-preview',
    ],
    isBuiltin: true,
  },
  {
    tagId: '3d-generation',
    name: '3D 生成',
    description: '3D 模型生成任务',
    category: 'creative',
    priority: 45,
    requiredModels: ['tripo3d-v2.5'],
    isBuiltin: true,
  },
];
