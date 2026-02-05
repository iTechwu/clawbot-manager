/**
 * Vendor Configuration - AI 提供商配置
 *
 * 定义各 AI 提供商的 API 端点和认证方式
 * 支持 60+ 提供商，与 provider.schema.ts 保持同步
 */

import {
  PROVIDER_CONFIGS,
  type ProviderVendor,
  type ProviderApiType,
} from '@repo/contracts';

export interface VendorConfig {
  /** API 主机名 */
  host: string;
  /** API 基础路径 */
  basePath: string;
  /** 认证头名称 */
  authHeader: string;
  /** 认证格式化函数 */
  authFormat: (key: string) => string;
  /** API 类型 (openai, anthropic, gemini, etc.) */
  apiType: ProviderApiType;
}

/**
 * 根据 API 类型获取认证配置
 */
function getAuthConfig(apiType: ProviderApiType): {
  authHeader: string;
  authFormat: (key: string) => string;
} {
  switch (apiType) {
    case 'anthropic':
      return {
        authHeader: 'x-api-key',
        authFormat: (key) => key,
      };
    case 'gemini':
      return {
        authHeader: 'x-goog-api-key',
        authFormat: (key) => key,
      };
    case 'azure-openai':
      return {
        authHeader: 'api-key',
        authFormat: (key) => key,
      };
    case 'aws-bedrock':
      // AWS Bedrock uses IAM credentials, not API keys
      return {
        authHeader: 'Authorization',
        authFormat: (key) => `Bearer ${key}`,
      };
    case 'vertexai':
      return {
        authHeader: 'Authorization',
        authFormat: (key) => `Bearer ${key}`,
      };
    // OpenAI-compatible APIs (openai, openai-response, ollama, new-api, gateway)
    default:
      return {
        authHeader: 'Authorization',
        authFormat: (key) => `Bearer ${key}`,
      };
  }
}

/**
 * 从 URL 解析主机名和基础路径
 */
function parseApiHost(apiHost: string): { host: string; basePath: string } {
  if (!apiHost) {
    return { host: '', basePath: '' };
  }
  try {
    const url = new URL(apiHost);
    return {
      host: url.host,
      basePath: url.pathname === '/' ? '' : url.pathname,
    };
  } catch {
    // 如果不是有效 URL，假设是主机名
    return { host: apiHost, basePath: '' };
  }
}

/**
 * 从 PROVIDER_CONFIGS 动态生成 VENDOR_CONFIGS
 * 支持所有 60+ 提供商
 */
export const VENDOR_CONFIGS: Record<string, VendorConfig> = Object.entries(
  PROVIDER_CONFIGS,
).reduce(
  (acc, [vendor, config]) => {
    const { host, basePath } = parseApiHost(config.apiHost);
    const authConfig = getAuthConfig(config.apiType);

    acc[vendor] = {
      host,
      basePath,
      ...authConfig,
      apiType: config.apiType,
    };

    return acc;
  },
  {} as Record<string, VendorConfig>,
);

/**
 * 从自定义 URL 创建 VendorConfig
 * 用于支持自定义 endpoint
 */
export function createVendorConfigFromUrl(
  customUrl: string,
  apiType: ProviderApiType = 'openai',
): VendorConfig {
  const { host, basePath } = parseApiHost(customUrl);
  const authConfig = getAuthConfig(apiType);

  return {
    host,
    basePath,
    ...authConfig,
    apiType,
  };
}

/**
 * 获取支持的 vendor 列表
 */
export function getSupportedVendors(): string[] {
  return Object.keys(VENDOR_CONFIGS);
}

/**
 * 检查 vendor 是否支持
 * 注意：即使 vendor 不在预定义列表中，如果有自定义 baseUrl 也可以支持
 */
export function isVendorSupported(vendor: string): boolean {
  return vendor in VENDOR_CONFIGS || vendor === 'custom';
}

/**
 * 获取 vendor 配置
 */
export function getVendorConfig(vendor: string): VendorConfig | undefined {
  return VENDOR_CONFIGS[vendor];
}

/**
 * 获取 vendor 配置，支持自定义 URL 覆盖
 * 如果提供了 customBaseUrl，将使用自定义 URL 创建配置
 */
export function getVendorConfigWithCustomUrl(
  vendor: string,
  customBaseUrl?: string | null,
  apiType?: ProviderApiType,
): VendorConfig | undefined {
  // 如果有自定义 URL，使用自定义配置
  if (customBaseUrl) {
    const baseConfig = VENDOR_CONFIGS[vendor];
    const effectiveApiType = apiType || baseConfig?.apiType || 'openai';
    return createVendorConfigFromUrl(customBaseUrl, effectiveApiType);
  }

  // 否则使用默认配置
  return VENDOR_CONFIGS[vendor];
}
