import { Route, Scale, Shield } from 'lucide-react';
import type { ReactNode } from 'react';

export type RoutingType = 'FUNCTION_ROUTE' | 'LOAD_BALANCE' | 'FAILOVER';

export const ROUTING_TYPE_ICONS: Record<RoutingType, ReactNode> = {
  FUNCTION_ROUTE: Route({ className: 'size-4' }),
  LOAD_BALANCE: Scale({ className: 'size-4' }),
  FAILOVER: Shield({ className: 'size-4' }),
};

export const PREDEFINED_INTENT_KEYS = [
  'code',
  'translation',
  'math',
  'creative',
  'analysis',
  'image',
  'video',
  'audio',
  '3d',
  'summary',
  'knowledge',
  'deepReasoning',
  'fastResponse',
  'longContext',
] as const;

export type PredefinedIntentKey = (typeof PREDEFINED_INTENT_KEYS)[number];

// Model recommendations by scenario - based on model-pricing.data.ts
// Updated with latest model versions (2026-02-10)
export const SCENARIO_MODEL_RECOMMENDATIONS: Record<
  string,
  { primary: string[]; alternatives: string[] }
> = {
  code: {
    primary: [
      'gpt-5.2-codex',
      'claude-sonnet-4-5-20250929',
      'deepseek-v3-2-251201',
      'grok-code-fast-1',
    ],
    alternatives: [
      'gpt-5.1-codex',
      'o4-mini',
      'claude-sonnet-4-20250514',
      'qwen-3.0',
      'kimi-k2',
      'glm-4.5',
    ],
  },
  translation: {
    primary: [
      'gpt-5.2',
      'claude-sonnet-4-5-20250929',
      'gemini-2.5-pro',
      'doubao-seed-1-6-251015',
    ],
    alternatives: [
      'gpt-4o',
      'gpt-4o-mini',
      'doubao-1.5-pro-32k',
      'qwen-plus-latest',
      'glm-4.5',
      'moonshot-v1-auto',
    ],
  },
  math: {
    primary: ['o3', 'claude-opus-4-6', 'deepseek-r1', 'grok-3-reasoner-r'],
    alternatives: [
      'o4-mini',
      'claude-opus-4-5-20251101',
      'doubao-seed-1.6-thinking',
      'qwen-3.0-thinking',
      'qwq-plus',
      'kimi-k2',
    ],
  },
  creative: {
    primary: ['claude-opus-4-6', 'gpt-5.2-pro', 'grok-4', 'kimi-k2'],
    alternatives: [
      'claude-opus-4-5-20251101',
      'gpt-5',
      'claude-sonnet-4-5-20250929',
      'gemini-2.5-pro',
      'qwen-max-latest',
    ],
  },
  analysis: {
    primary: [
      'claude-opus-4-6',
      'gpt-5.2-pro',
      'gemini-3-pro-preview',
      'kimi-k2',
    ],
    alternatives: [
      'claude-opus-4-5-20251101',
      'gemini-2.5-pro',
      'claude-sonnet-4-5-20250929',
      'deepseek-v3-2-251201',
      'qwen-max-latest',
      'glm-4.5',
    ],
  },
  image: {
    primary: [
      'Midjourney',
      'gpt-image-1.5-plus',
      'flux-kontext-max',
      'grok-4-image',
    ],
    alternatives: [
      'gpt-image-1.5',
      'gpt-image-1',
      'doubao-seedream-4-5-251128',
      'doubao-seedream-3.0-t2i',
      'gemini-3-pro-image-preview',
      'ideogram-generate-v3',
      'qwen-image-plus',
      'flux-kontext-pro',
      'nai-diffusion-4-5-full',
      'kling-image-o1',
    ],
  },
  video: {
    primary: [
      'sora-2-pro',
      'veo3.1-pro',
      'kling-video-o1-pro',
      'hailuo-2.3-pro',
    ],
    alternatives: [
      'sora-2',
      'veo3.1',
      'veo3',
      'kling-v2.6-pro',
      'hailuo-02-pro',
      'viduq3-pro',
      'wan2.1-14b',
      'doubao-seedance-1-0-pro',
      'doubao-seedance-1.0-lite',
    ],
  },
  audio: {
    primary: ['speech-2.6-hd', 'gpt-4o-mini-tts', 'speech-2.5-hd-preview'],
    alternatives: [
      'speech-02-turbo',
      'gemini-2.5-pro-preview-tts',
      'gemini-2.5-flash-preview-tts',
      'speech-2.5-turbo-preview',
    ],
  },
  '3d': {
    primary: ['tripo3d-v2.5'],
    alternatives: [],
  },
  summary: {
    primary: [
      'gemini-3-flash-preview',
      'claude-haiku-4-5-20251001',
      'gpt-4o-mini',
    ],
    alternatives: [
      'gemini-2.5-flash',
      'gpt-4.1-mini',
      'doubao-seed-1-6-flash',
      'qwen-turbo',
      'glm-4.5-air',
      'moonshot-v1-auto',
    ],
  },
  knowledge: {
    primary: [
      'gpt-5.2',
      'claude-sonnet-4-5-20250929',
      'gemini-2.5-pro',
      'kimi-k2',
    ],
    alternatives: [
      'gpt-4o',
      'gpt-4.1',
      'deepseek-v3-2-251201',
      'grok-3',
      'qwen-max-latest',
      'glm-4.5',
    ],
  },
  deepReasoning: {
    primary: [
      'o3',
      'claude-opus-4-6',
      'deepseek-r1',
      'grok-3-reasoner-r',
      'kimi-k2',
    ],
    alternatives: [
      'o4-mini',
      'claude-opus-4-5-20251101',
      'doubao-seed-1.6-thinking',
      'qwen-3.0-thinking',
      'qwq-plus',
      'grok-4-1-fast-reasoning',
    ],
  },
  fastResponse: {
    primary: [
      'gemini-3-flash-preview',
      'gpt-4o-mini',
      'claude-haiku-4-5-20251001',
    ],
    alternatives: [
      'gemini-2.5-flash',
      'gpt-4.1-nano',
      'gpt-5-nano',
      'doubao-seed-1-6-flash',
      'grok-3-mini',
      'glm-4.5-air',
      'moonshot-v1-auto',
    ],
  },
  longContext: {
    primary: ['gemini-3-pro-preview', 'gemini-2.5-pro', 'grok-4', 'kimi-k2'],
    alternatives: [
      'claude-opus-4-6',
      'claude-opus-4-5-20251101',
      'gpt-5.2',
      'claude-sonnet-4-5-20250929',
      'doubao-1.5-pro-256k',
      'qwen-long',
      'moonshot-v1-128k',
    ],
  },
};

export const FAILOVER_TEMPLATE_KEYS = [
  'singleFallback',
  'doubleFallback',
  'tripleFallback',
] as const;

export const LOAD_BALANCE_TEMPLATE_KEYS = [
  'dualEqual',
  'tripleEqual',
  'primaryHeavy',
] as const;
