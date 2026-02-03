// Re-export API and Brand config from root config file to avoid duplication
// See apps/web/config.ts for the source of truth
export { API_CONFIG, BRAND_CONFIG } from '@/config';

// Bot 配置（Provider / Channel / Persona 模板）
// 统一通过 `@/lib/config` 暴露，方便前端组件使用
export {
  PROVIDERS,
  AI_PROVIDERS,
  MODELS,
  getProvider,
  getModels,
  getDefaultModel,
} from './config/index';
export type { ProviderConfig, ModelInfo } from './config/index';

export {
  CHANNELS,
  POPULAR_CHANNELS,
  OTHER_CHANNELS,
  getChannel,
  TEMPLATES,
  SCRATCH_TEMPLATE,
  getTemplate,
} from './config/index';
export type { ChannelDefinition, PersonaTemplate } from './config/index';
