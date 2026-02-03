/**
 * @fileoverview SMS Client Factory
 * @module @app/shared-services/sms/sms.factory
 *
 * 负责创建和管理 SMS 客户端实例
 *
 * 功能：
 * - 根据供应商类型创建对应的 SMS 客户端
 * - 管理模板配置
 * - 提供统一的客户端访问接口
 *
 * @example
 * ```typescript
 * const factory = new SmsClientFactory(
 *   { logger, httpService, redis },
 *   { defaultVendor: 'volcengine', providers: [...] }
 * );
 *
 * // 发送短信
 * await factory.sendSmsCode('13800138000', '123456', 'verify');
 *
 * // 火山引擎专用：验证码校验
 * const result = await factory.checkVerifyCode('13800138000', '123456');
 * ```
 */

import { Logger } from 'winston';
import { HttpService } from '@nestjs/axios';
import { RedisService } from '@app/redis';
import {
  SmsAliyunClient,
  SmsTencentClient,
  SmsHttpClient,
  SmsZxjcClient,
  SmsVolcengineClient,
  SmsProviderConfig,
} from '@app/clients/internal/sms';

import {
  SmsVendor,
  SMS_VENDOR_NAMES,
  SmsTemplate,
  SmsTemplateMeta,
  SmsTemplateMap,
  ISmsClient,
  IVolcengineSmsClient,
  SmsClientDependencies,
  SmsFactoryConfig,
  SmsSendResult,
  VerifyCodeCheckResult,
  SmsVolcengineTemplate,
} from './types';
import enviroment from '@/utils/enviroment.util';

// ============================================================================
// SMS Client Factory
// ============================================================================

/**
 * SMS 客户端工厂
 *
 * 负责创建和管理不同供应商的 SMS 客户端
 */
export class SmsClientFactory {
  /** 当前供应商配置 */
  private readonly provider: SmsProviderConfig | null = null;

  /** 当前供应商类型 */
  private readonly vendor: SmsVendor | null = null;

  /** SMS 客户端实例 */
  private readonly client: ISmsClient | null = null;

  /** 模板配置映射 */
  private readonly templates: SmsTemplateMap = {};

  /** 日志器 */
  private readonly logger: Logger;

  /** HTTP 服务 */
  private readonly httpService?: HttpService;

  /** Redis 服务 */
  private readonly redis?: RedisService;

  constructor(dependencies: SmsClientDependencies, config?: SmsFactoryConfig) {
    this.logger = dependencies.logger;
    this.httpService = dependencies.httpService;
    this.redis = dependencies.redis;

    if (config) {
      this.initializeFromConfig(config);
    }
  }

  /**
   * 从配置初始化
   */
  private initializeFromConfig(config: SmsFactoryConfig): void {
    const { defaultVendor, providers } = config;

    const providerConfig = providers.find((p) => p.vendor === defaultVendor);

    if (!providerConfig) {
      this.logger.warn(`SMS provider not found: ${defaultVendor}`);
      return;
    }

    // 使用类型断言来绕过 readonly 限制（仅在构造函数中）
    (this as any).provider = providerConfig;
    (this as any).vendor = defaultVendor as SmsVendor;
    (this as any).client = this.createClient(providerConfig);

    // 初始化模板
    this.initializeTemplates(providerConfig);
  }

  /**
   * 初始化模板配置
   */
  private initializeTemplates(provider: SmsProviderConfig): void {
    if (!provider.templates) return;

    provider.templates.forEach((template: SmsTemplate) => {
      const meta = template as SmsTemplateMeta;
      const name = meta.name || 'default';
      this.templates[name] = template;
    });
    if (enviroment.isProduction()) {
      this.logger.info(
        `SMS templates initialized: ${Object.keys(this.templates).join(', ')}`,
      );
    }
  }

  /**
   * 创建 SMS 客户端
   */
  private createClient(provider: SmsProviderConfig): ISmsClient {
    const vendor = provider.vendor as SmsVendor;

    if (enviroment.isProduction()) {
      this.logger.info(
        `Creating SMS client for vendor: ${SMS_VENDOR_NAMES[vendor] || vendor}`,
      );
    }

    switch (vendor) {
      case 'aliyun':
        return new SmsAliyunClient(provider, this.logger);

      case 'tencent':
        return new SmsTencentClient(provider, this.logger);

      case 'http':
        if (!this.httpService) {
          throw new Error('HttpService is required for HTTP SMS client');
        }
        return new SmsHttpClient(provider, this.httpService, this.logger);

      case 'zxjcsms':
        if (!this.httpService) {
          throw new Error('HttpService is required for ZXJC SMS client');
        }
        return new SmsZxjcClient(provider, this.httpService, this.logger);

      case 'volcengine':
        if (!this.redis) {
          throw new Error('RedisService is required for Volcengine SMS client');
        }
        return new SmsVolcengineClient(provider, this.redis, this.logger);

      default:
        throw new Error(`Unsupported SMS vendor: ${vendor}`);
    }
  }

  // ========================================================================
  // Public Accessors
  // ========================================================================

  /**
   * 检查工厂是否已初始化
   */
  get isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * 获取当前供应商类型
   */
  get currentVendor(): SmsVendor | null {
    return this.vendor;
  }

  /**
   * 获取当前供应商显示名称
   */
  get currentVendorName(): string {
    return this.vendor ? SMS_VENDOR_NAMES[this.vendor] : 'Unknown';
  }

  /**
   * 检查是否为火山引擎供应商
   */
  get isVolcengine(): boolean {
    return this.vendor === 'volcengine';
  }

  /**
   * 获取所有模板名称
   */
  get templateNames(): string[] {
    return Object.keys(this.templates);
  }

  // ========================================================================
  // Template Management
  // ========================================================================

  /**
   * 获取模板配置
   *
   * @param templateId - 模板 ID
   * @returns 模板配置，不存在返回 undefined
   */
  getTemplate(templateId: string): SmsTemplate | undefined {
    return this.templates[templateId];
  }

  /**
   * 获取模板配置（必须存在）
   *
   * @param templateId - 模板 ID
   * @throws Error 如果模板不存在
   */
  getTemplateOrThrow(templateId: string): SmsTemplate {
    const template = this.templates[templateId];
    if (!template) {
      throw new Error(`SMS template not found: ${templateId}`);
    }
    return template;
  }

  /**
   * 获取模板元数据
   *
   * @param templateId - 模板 ID
   * @returns 模板元数据
   */
  getTemplateMeta(templateId: string): SmsTemplateMeta | undefined {
    const template = this.templates[templateId];
    if (!template) return undefined;

    return {
      name: (template as SmsTemplateMeta).name,
      frequency: (template as SmsTemplateMeta).frequency,
      codeExpire: (template as SmsTemplateMeta).codeExpire,
    };
  }

  // ========================================================================
  // SMS Operations
  // ========================================================================

  /**
   * 发送短信验证码
   *
   * @param phone - 手机号码
   * @param code - 验证码
   * @param templateId - 模板 ID
   * @returns 发送结果
   */
  async sendSmsCode(
    phone: string,
    code: string,
    templateId: string = 'verify',
  ): Promise<SmsSendResult> {
    this.ensureInitialized();

    const template = this.getTemplateOrThrow(templateId);

    this.logger.info(`Sending SMS code to ${phone}`, {
      vendor: this.currentVendorName,
      templateId,
    });

    return await this.client!.sendSmsCode(phone, code, template);
  }

  /**
   * 发送验证码（火山引擎自动生成）
   *
   * 仅火山引擎供应商支持此功能
   *
   * @param phoneNumber - 手机号码
   * @param templateId - 模板 ID
   * @throws Error 如果当前供应商不是火山引擎
   */
  async sendVerifyCode(
    phoneNumber: string,
    templateId: string = 'verify',
  ): Promise<any> {
    this.ensureInitialized();
    this.ensureVolcengine('sendVerifyCode');

    const template = this.getTemplateOrThrow(
      templateId,
    ) as SmsVolcengineTemplate;

    return await (this.client as IVolcengineSmsClient).sendVerifyCode(
      phoneNumber,
      template,
    );
  }

  /**
   * 校验验证码（火山引擎）
   *
   * 仅火山引擎供应商支持此功能
   *
   * @param phoneNumber - 手机号码
   * @param code - 验证码
   * @param templateId - 模板 ID
   * @throws Error 如果当前供应商不是火山引擎
   */
  async checkVerifyCode(
    phoneNumber: string,
    code: string,
    templateId: string = 'verify',
  ): Promise<VerifyCodeCheckResult> {
    this.ensureInitialized();
    this.ensureVolcengine('checkVerifyCode');

    const template = this.getTemplateOrThrow(
      templateId,
    ) as SmsVolcengineTemplate;

    return await (this.client as IVolcengineSmsClient).checkVerifyCode(
      phoneNumber,
      code,
      template,
    );
  }

  // ========================================================================
  // Private Helpers
  // ========================================================================

  /**
   * 确保工厂已初始化
   */
  private ensureInitialized(): void {
    if (!this.client) {
      throw new Error('SMS client not initialized. Check SMS configuration.');
    }
  }

  /**
   * 确保当前供应商为火山引擎
   */
  private ensureVolcengine(methodName: string): void {
    if (!this.isVolcengine) {
      throw new Error(`${methodName} is only supported by Volcengine SMS`);
    }
  }
}
