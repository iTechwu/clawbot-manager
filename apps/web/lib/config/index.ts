// Provider configuration
export {
  PROVIDERS,
  AI_PROVIDERS,
  MODELS,
  getProvider,
  getModels,
  getDefaultModel,
} from './providers';
export type { ProviderConfig, ModelInfo } from './providers';

// Channel configuration
export {
  CHANNELS,
  POPULAR_CHANNELS,
  OTHER_CHANNELS,
  getChannel,
} from './channels';
export type { ChannelDefinition } from './channels';

// Template configuration
export {
  TEMPLATES,
  SCRATCH_TEMPLATE,
  getTemplate,
} from './templates';
export type { PersonaTemplate } from './templates';
