import { readFileSync, existsSync } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as process from 'process';
import { ApiException } from '@/filter/exception/api.exception';
import {
  validateEnv,
  validateEnvSafe,
  validateYamlConfig,
  validateYamlConfigSafe,
  validateKeysConfig,
  validateKeysConfigSafe,
  type EnvConfig,
  type YamlConfig,
  type KeysConfig,
} from './validation';
import enviroment from '@/utils/enviroment.util';

// Export AgentXConfigHelper for easy access
export { AgentXConfigHelper } from './agentx.config';

// ============================================================================
// Configuration State
// ============================================================================

let config: YamlConfig | undefined = undefined;
let envConfig: EnvConfig | undefined = undefined;
let keysConfig: KeysConfig | undefined = undefined;
let validationEnabled = true;

/**
 * Enable or disable configuration validation
 * Useful for testing or dev scenarios
 */
export function setValidationEnabled(enabled: boolean) {
  validationEnabled = enabled;
}

// ============================================================================
// Configuration Getters
// ============================================================================

/**
 * 获取项目根目录路径
 * 处理 Windows 环境下 $(pwd) 未展开的问题
 */
function getProjectRoot(): string {
  let projectRoot = process.env.PROJECT_ROOT;

  // 如果 PROJECT_ROOT 包含 $(pwd)，则替换为实际的工作目录
  if (projectRoot && projectRoot.includes('$(pwd)')) {
    projectRoot = projectRoot.replace('$(pwd)', process.cwd());
  }

  // 如果 PROJECT_ROOT 未设置或为空，使用当前工作目录
  if (!projectRoot) {
    projectRoot = process.cwd();
  }

  return projectRoot;
}

export function getConfig(): YamlConfig | undefined {
  return config;
}

/**
 * Get validated environment configuration
 */
export function getEnvConfig(): EnvConfig | undefined {
  return envConfig;
}

/**
 * Get validated keys configuration
 */
export function getKeysConfig(): KeysConfig | undefined {
  return keysConfig;
}

// ============================================================================
// Environment Validation
// ============================================================================

/**
 * Initialize and validate environment variables
 * Should be called early in application bootstrap
 *
 * @throws Error in production if validation fails
 */
export function initEnvValidation(): EnvConfig {
  if (!validationEnabled) {
    console.log('⚠️  Environment validation disabled');
    return process.env as unknown as EnvConfig;
  }

  try {
    envConfig = validateEnv();
    return envConfig;
  } catch (error) {
    // In dev, log warning but allow startup
    if (!process.env.NODE_ENV?.startsWith('prod')) {
      console.warn('⚠️  Environment validation failed, continuing in dev mode');
      return process.env as unknown as EnvConfig;
    }
    throw error;
  }
}

/**
 * Validate environment without throwing
 */
export function validateEnvConfig() {
  return validateEnvSafe();
}

// ============================================================================
// YAML Configuration
// ============================================================================

export async function initConfig() {
  try {
    // 获取项目根目录
    const projectRoot = getProjectRoot();

    // 获取 YAML 配置文件名，若环境变量未设置，则使用默认值 'config.local.yaml'
    const YAML_CONFIG_FILENAME =
      process.env.YAML_CONFIG_FILENAME || 'config.local.yaml';

    // 构建配置文件路径
    const configPath = path.join(projectRoot, YAML_CONFIG_FILENAME);

    if (enviroment.isProduction()) {
      console.log(`✅ Loading config from: ${configPath}`);
    }

    if (!existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    // 读取 YAML 配置文件内容
    const rawConfig = yaml.load(readFileSync(configPath, 'utf8'));
    if (enviroment.isProduction()) {
      console.log('✅ Config loaded successfully, validating...');
    }

    // 使用 Zod 验证配置
    if (validationEnabled) {
      try {
        const validated = validateYamlConfig(rawConfig) as unknown;
        config = validated as YamlConfig;
      } catch (validationError) {
        // In dev, log warning but continue with raw config
        if (!process.env.NODE_ENV?.startsWith('prod')) {
          console.warn(
            '⚠️  YAML validation failed, using raw config in dev mode',
          );
          console.warn(validationError);
          config = rawConfig as YamlConfig;
        } else {
          throw validationError;
        }
      }
    } else {
      config = rawConfig as YamlConfig;
    }

    if (enviroment.isProduction()) {
      console.log('✅ Config validation completed successfully');
    }
  } catch (error) {
    console.error('Error in initConfig:', error);
    throw error;
  }
}

/**
 * Validate YAML config without throwing
 */
export function validateYamlConfigResult(rawConfig: unknown) {
  return validateYamlConfigSafe(rawConfig);
}

// ============================================================================
// Keys Configuration
// ============================================================================

/**
 * Initialize and validate keys configuration
 * Loads and validates the entire keys/config.json file
 */
export function initKeysConfig(): KeysConfig | undefined {
  const projectRoot = getProjectRoot();
  const keysConfigPath = `${projectRoot}/keys/config.json`;

  if (!existsSync(keysConfigPath)) {
    console.warn(`⚠️  Keys config file not found: ${keysConfigPath}`);
    return undefined;
  }

  try {
    const rawConfig = JSON.parse(readFileSync(keysConfigPath, 'utf8'));

    if (validationEnabled) {
      try {
        keysConfig = validateKeysConfig(rawConfig);
      } catch (validationError) {
        // In dev, log warning but continue with raw config
        if (!process.env.NODE_ENV?.startsWith('prod')) {
          console.warn(
            '⚠️  Keys validation failed, using raw config in dev mode',
          );
          console.warn(validationError);
          keysConfig = rawConfig as KeysConfig;
        } else {
          throw validationError;
        }
      }
    } else {
      keysConfig = rawConfig as KeysConfig;
    }

    return keysConfig;
  } catch (error) {
    console.error('Error loading keys config:', error);
    throw error;
  }
}

/**
 * Get a specific key from the keys configuration
 * @deprecated Use getKeysConfig() and access properties directly for type safety
 */
export function getSecretConfigByKey(key: string) {
  const projectRoot = getProjectRoot();
  const keysConfigPath = path.join(projectRoot, 'keys', 'config.json');
  const keysConfig = JSON.parse(
    readFileSync(keysConfigPath, 'utf8'),
  ) as KeysConfig;

  if (!Object.prototype.hasOwnProperty.call(keysConfig, key)) {
    throw new ApiException(
      'invalidEnv',
      `Key "${key}" not found in keys config`,
    );
  }

  return keysConfig[key];
}

/**
 * Validate keys config without throwing
 */
export function validateKeysConfigResult(rawConfig: unknown) {
  return validateKeysConfigSafe(rawConfig);
}

// ============================================================================
// Full Configuration Initialization
// ============================================================================

/**
 * Initialize all configuration with validation
 * Call this in application bootstrap
 */
export async function initAllConfig(): Promise<{
  env: EnvConfig;
  yaml: YamlConfig;
  keys?: KeysConfig;
}> {
  console.log('🔧 Initializing all configuration...');

  // 1. Validate environment variables
  const env = initEnvValidation();

  // 2. Load and validate YAML config
  await initConfig();

  // 3. Load and validate keys config
  const keys = initKeysConfig();

  console.log('✅ All configuration initialized successfully');

  return {
    env,
    yaml: config,
    keys,
  };
}
