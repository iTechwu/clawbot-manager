import { getKeysConfig } from './configuration';
import type { AgentXConfig } from './validation/keys.validation';

/**
 * AgentX 配置工具类
 * 提供统一的 AgentX 配置访问和 Bearer token 生成
 */
export class AgentXConfigHelper {
  private static config: AgentXConfig | undefined;
  private static authToken: string | undefined;

  /**
   * 获取 AgentX 配置
   * @throws Error 如果配置不存在
   */
  static getConfig(): AgentXConfig {
    if (!this.config) {
      const keysConfig = getKeysConfig();
      const agentxConfig = keysConfig?.agentx;

      if (!agentxConfig?.baseUrl) {
        throw new Error(
          'AgentX configuration not found in keys/config.json. Please configure agentx.baseUrl',
        );
      }

      this.config = agentxConfig;
    }

    return this.config;
  }

  /**
   * 获取 BaseURL
   */
  static getBaseUrl(): string {
    return this.getConfig().baseUrl;
  }

  /**
   * 获取 Bearer Token（如果配置了用户名和密码）
   * @returns Bearer token 或 undefined
   */
  static getAuthToken(): string | undefined {
    if (this.authToken !== undefined) {
      return this.authToken;
    }

    const config = this.getConfig();

    if (config.user && config.password) {
      // 使用 Base64 编码 user:password 作为 Bearer token
      const credentials = `${config.user}:${config.password}`;
      this.authToken = Buffer.from(credentials).toString('base64');
    } else {
      this.authToken = undefined;
    }

    return this.authToken;
  }

  /**
   * 获取包含 Authorization 头的对象
   * 如果没有配置认证信息，返回空对象
   */
  static getAuthHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    if (!token) {
      return {};
    }
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * 检查是否配置了认证信息
   */
  static hasAuth(): boolean {
    const config = this.getConfig();
    return !!(config.user && config.password);
  }

  /**
   * 重置缓存（主要用于测试）
   */
  static reset(): void {
    this.config = undefined;
    this.authToken = undefined;
  }
}
