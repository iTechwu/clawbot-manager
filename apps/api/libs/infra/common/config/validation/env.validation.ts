/**
 * Environment Variables Validation Schema
 *
 * Validates environment variables at startup using Zod.
 * Ensures all required configuration is present before the application starts.
 */
import { z } from 'zod';

/**
 * Environment variable schema definition
 */
export const envSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['dev', 'test', 'prod', 'produs', 'prodap']).default('dev'),

  // Project root path
  PROJECT_ROOT: z.string().optional(),

  // YAML config filename
  YAML_CONFIG_FILENAME: z.string().default('config.local.yaml'),

  // Base host for local services
  BASE_HOST: z.string().default('127.0.0.1'),

  // Database URLs
  DATABASE_URL: z
    .string()
    .url()
    .refine((url) => url.startsWith('postgresql://'), {
      message: 'DATABASE_URL must be a PostgreSQL URL',
    }),
  READ_DATABASE_URL: z
    .string()
    .url()
    .refine((url) => url.startsWith('postgresql://'), {
      message: 'READ_DATABASE_URL must be a PostgreSQL URL',
    })
    .optional(),

  // Redis URL
  REDIS_URL: z.string().refine((url) => url.startsWith('redis://'), {
    message: 'REDIS_URL must be a Redis URL',
  }),

  // RabbitMQ URL
  RABBITMQ_URL: z.string().refine((url) => url.startsWith('amqp://'), {
    message: 'RABBITMQ_URL must be an AMQP URL',
  }),

  // S3 和日志配置已迁移到 config.local.yaml -> app 节点:
  // - enableRetryMechanism, enableEnhancedLogging, maxRetries, baseRetryDelay
  // - nestLogOutput

  // External services
  API_BASE_URL: z.string().url().optional(),
  INTERNAL_API_BASE_URL: z.string().url().optional(),
});

/**
 * Type inferred from the env schema
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validation result type
 */
export interface EnvValidationResult {
  success: boolean;
  data?: EnvConfig;
  errors?: z.ZodError;
}

/**
 * Validates environment variables against the schema
 *
 * @returns Validated environment configuration
 * @throws Error if validation fails in production
 */
export function validateEnv(): EnvConfig {
  // Expand environment variables in values (e.g., ${BASE_HOST})
  const expandedEnv = expandEnvVariables(process.env);

  const result = envSchema.safeParse(expandedEnv);

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');

    console.error('❌ Environment variable validation failed:');
    console.error(errorMessages);

    // In production, throw an error to prevent startup
    if (process.env.NODE_ENV?.startsWith('prod')) {
      throw new Error(`Environment validation failed:\n${errorMessages}`);
    }

    // In dev, log warning but continue
    console.warn('⚠️  Continuing with invalid environment in dev mode');
    return expandedEnv as EnvConfig;
  }

  console.log('✅ Environment variables validated successfully');
  return result.data;
}

/**
 * Validates environment variables and returns detailed result
 *
 * @returns Validation result with success status and data or errors
 */
export function validateEnvSafe(): EnvValidationResult {
  const expandedEnv = expandEnvVariables(process.env);
  const result = envSchema.safeParse(expandedEnv);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

/**
 * Expands environment variable references in values
 * Handles patterns like ${VAR_NAME}
 *
 * @param env - Environment object
 * @returns Expanded environment object
 */
function expandEnvVariables(
  env: NodeJS.ProcessEnv,
): Record<string, string | undefined> {
  const expanded: Record<string, string | undefined> = { ...env };
  const varPattern = /\$\{([^}]+)\}/g;

  for (const key of Object.keys(expanded)) {
    const value = expanded[key];
    if (value && varPattern.test(value)) {
      expanded[key] = value.replace(varPattern, (_, varName) => {
        return expanded[varName] || process.env[varName] || '';
      });
    }
  }

  return expanded;
}

/**
 * Get a single environment variable with validation
 *
 * @param key - Environment variable key
 * @param defaultValue - Default value if not set
 * @returns Environment variable value
 */
export function getEnvVar(key: keyof EnvConfig, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value ?? defaultValue ?? '';
}
