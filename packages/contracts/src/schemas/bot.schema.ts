import { z } from 'zod';
import { BotStatusSchema } from './prisma-enums.generated';

// BotStatus/BotStatusSchema 来自 prisma-enums.generated，由 index 统一导出

// ============================================================================
// Container Status Schema
// ============================================================================

export const ContainerStatusSchema = z.object({
  id: z.string(),
  state: z.string(),
  running: z.boolean(),
  exitCode: z.number(),
  startedAt: z.string(),
  finishedAt: z.string(),
});

export type ContainerStatus = z.infer<typeof ContainerStatusSchema>;

// ============================================================================
// Bot Schema
// ============================================================================

export const BotSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  hostname: z.string(),
  aiProvider: z.string(),
  model: z.string(),
  channelType: z.string(),
  containerId: z.string().nullable(),
  port: z.number().nullable(),
  gatewayToken: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  status: BotStatusSchema,
  createdById: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  containerStatus: ContainerStatusSchema.nullable().optional(),
});

export type Bot = z.infer<typeof BotSchema>;

// ============================================================================
// Bot Creation Schemas
// ============================================================================

export const ProviderConfigSchema = z.object({
  providerId: z.string(),
  model: z.string(),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export const ChannelConfigSchema = z.object({
  channelType: z.string(),
  token: z.string(),
});

export type ChannelConfig = z.infer<typeof ChannelConfigSchema>;

export const WizardFeaturesSchema = z.object({
  commands: z.boolean().default(false),
  tts: z.boolean().default(false),
  ttsVoice: z.string().optional(),
  sandbox: z.boolean().default(false),
  sandboxTimeout: z.number().optional(),
  sessionScope: z.enum(['user', 'channel', 'global']).default('user'),
});

export type WizardFeatures = z.infer<typeof WizardFeaturesSchema>;

export const PersonaSchema = z.object({
  name: z.string(),
  soulMarkdown: z.string(),
  emoji: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

export type Persona = z.infer<typeof PersonaSchema>;

export const CreateBotInputSchema = z.object({
  name: z.string().min(1).max(255),
  hostname: z.string().regex(/^[a-z0-9-]{1,64}$/, {
    message: 'Hostname must be lowercase alphanumeric with hyphens, max 64 chars',
  }),
  providers: z.array(ProviderConfigSchema).min(1),
  primaryProvider: z.string().optional(),
  channels: z.array(ChannelConfigSchema).min(1),
  persona: PersonaSchema,
  features: WizardFeaturesSchema,
  tags: z.array(z.string()).optional(),
});

export type CreateBotInput = z.infer<typeof CreateBotInputSchema>;

// ============================================================================
// Container Stats Schema
// ============================================================================

export const ContainerStatsSchema = z.object({
  hostname: z.string(),
  name: z.string(),
  cpuPercent: z.number(),
  memoryUsage: z.number(),
  memoryLimit: z.number(),
  memoryPercent: z.number(),
  networkRxBytes: z.number(),
  networkTxBytes: z.number(),
  timestamp: z.string(),
});

export type ContainerStats = z.infer<typeof ContainerStatsSchema>;

// ============================================================================
// Admin Schemas
// ============================================================================

export const OrphanReportSchema = z.object({
  orphanedContainers: z.array(z.string()),
  orphanedWorkspaces: z.array(z.string()),
  orphanedSecrets: z.array(z.string()),
  total: z.number(),
});

export type OrphanReport = z.infer<typeof OrphanReportSchema>;

export const CleanupReportSchema = z.object({
  success: z.boolean(),
  containersRemoved: z.number(),
  workspacesRemoved: z.number(),
  secretsRemoved: z.number(),
});

export type CleanupReport = z.infer<typeof CleanupReportSchema>;

// ============================================================================
// Provider Key Schemas
// ============================================================================

export const ProviderVendorSchema = z.enum([
  'openai',
  'anthropic',
  'google',
  'venice',
  'deepseek',
  'groq',
]);

export type ProviderVendor = z.infer<typeof ProviderVendorSchema>;

/**
 * Default base URLs for each AI provider.
 * These are the official API endpoints.
 */
export const PROVIDER_DEFAULT_BASE_URLS: Record<ProviderVendor, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  venice: 'https://api.venice.ai/api/v1',
  deepseek: 'https://api.deepseek.com',
  groq: 'https://api.groq.com/openai/v1',
};

/**
 * Get the effective base URL for a provider key.
 * Returns the custom baseUrl if set, otherwise returns the default for the vendor.
 */
export function getEffectiveBaseUrl(
  vendor: ProviderVendor,
  customBaseUrl?: string | null,
): string {
  if (customBaseUrl && customBaseUrl.trim()) {
    return customBaseUrl.trim();
  }
  return PROVIDER_DEFAULT_BASE_URLS[vendor];
}

/**
 * Check if a base URL is custom (different from the default).
 */
export function isCustomBaseUrl(
  vendor: ProviderVendor,
  baseUrl?: string | null,
): boolean {
  if (!baseUrl) return false;
  return baseUrl.trim() !== PROVIDER_DEFAULT_BASE_URLS[vendor];
}

export const ProviderKeySchema = z.object({
  id: z.string().uuid(),
  vendor: ProviderVendorSchema,
  label: z.string().nullable(),
  tag: z.string().nullable(),
  baseUrl: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type ProviderKey = z.infer<typeof ProviderKeySchema>;

/**
 * Schema for adding a new provider key.
 * baseUrl is optional - if not provided, the default for the vendor will be used.
 */
export const AddProviderKeyInputSchema = z.object({
  vendor: ProviderVendorSchema,
  secret: z.string().min(1, 'API key is required'),
  label: z.string().max(255).optional(),
  tag: z.string().max(100).optional(),
  baseUrl: z
    .string()
    .url({ message: 'Must be a valid URL' })
    .optional()
    .transform((val) => (val?.trim() === '' ? undefined : val)),
});

export type AddProviderKeyInput = z.infer<typeof AddProviderKeyInputSchema>;

/**
 * Schema for provider key with resolved base URL.
 * This includes the effective base URL (custom or default).
 */
export const ProviderKeyWithEffectiveUrlSchema = ProviderKeySchema.extend({
  effectiveBaseUrl: z.string().url(),
});

export type ProviderKeyWithEffectiveUrl = z.infer<
  typeof ProviderKeyWithEffectiveUrlSchema
>;

export const ProviderKeyHealthSchema = z.object({
  status: z.string(),
  keyCount: z.number(),
  botCount: z.number(),
});

export type ProviderKeyHealth = z.infer<typeof ProviderKeyHealthSchema>;
