/**
 * Vendor Configuration - AI 提供商配置
 *
 * 定义各 AI 提供商的 API 端点和认证方式
 */

export interface VendorConfig {
  /** API 主机名 */
  host: string;
  /** API 基础路径 */
  basePath: string;
  /** 认证头名称 */
  authHeader: string;
  /** 认证格式化函数 */
  authFormat: (key: string) => string;
}

/**
 * 支持的 AI 提供商配置
 */
export const VENDOR_CONFIGS: Record<string, VendorConfig> = {
  openai: {
    host: 'api.openai.com',
    basePath: '/v1',
    authHeader: 'Authorization',
    authFormat: (key) => `Bearer ${key}`,
  },
  anthropic: {
    host: 'api.anthropic.com',
    basePath: '/v1',
    authHeader: 'x-api-key',
    authFormat: (key) => key,
  },
  venice: {
    host: 'api.venice.ai',
    basePath: '/api/v1',
    authHeader: 'Authorization',
    authFormat: (key) => `Bearer ${key}`,
  },
  google: {
    host: 'generativelanguage.googleapis.com',
    basePath: '/v1beta',
    authHeader: 'x-goog-api-key',
    authFormat: (key) => key,
  },
  deepseek: {
    host: 'api.deepseek.com',
    basePath: '/v1',
    authHeader: 'Authorization',
    authFormat: (key) => `Bearer ${key}`,
  },
  groq: {
    host: 'api.groq.com',
    basePath: '/openai/v1',
    authHeader: 'Authorization',
    authFormat: (key) => `Bearer ${key}`,
  },
};

/**
 * 获取支持的 vendor 列表
 */
export function getSupportedVendors(): string[] {
  return Object.keys(VENDOR_CONFIGS);
}

/**
 * 检查 vendor 是否支持
 */
export function isVendorSupported(vendor: string): boolean {
  return vendor in VENDOR_CONFIGS;
}

/**
 * 获取 vendor 配置
 */
export function getVendorConfig(vendor: string): VendorConfig | undefined {
  return VENDOR_CONFIGS[vendor];
}
