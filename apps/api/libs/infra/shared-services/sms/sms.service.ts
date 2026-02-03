/**
 * @fileoverview SMS Service
 * @module @app/shared-services/sms
 *
 * 职责：提供短信发送的业务逻辑服务
 *
 * 功能：
 * - 验证码生成和验证
 * - 短信队列管理
 * - 发送频率限制
 * - 多供应商支持（阿里云、腾讯云、火山引擎等）
 *
 * @example
 * ```typescript
 * // 发送验证码（通过队列）
 * await smsService.processingSendSmsVerifyCode(
 *   { mobile: '13800138000' },
 *   { deviceid: 'xxx' },
 *   'verify'
 * );
 *
 * // 火山引擎：发送并校验验证码
 * await smsService.sendVerifyCode('13800138000');
 * const result = await smsService.checkVerifyCode('13800138000', '123456');
 * ```
 */
import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { HttpService } from '@nestjs/axios';
import type { MobileAuth } from '@prisma/client';

import { RedisService } from '@app/redis';
import { RabbitmqService } from '@app/rabbitmq';
import { VerifyClient } from '@app/clients/internal/verify';
import { CommonErrorCode } from '@repo/contracts/errors';
import { apiError } from '@/filter/exception/api.exception';
import { PardxApp } from '@/config/dto/config.dto';
import { getKeysConfig } from '@/config/configuration';
import type { AppSmsConfig } from '@app/clients/internal/sms';

import { SmsClientFactory } from './sms.factory';
import {
  SmsVendor,
  SmsTemplate,
  SmsSendResult,
  VerifyCodeCheckResult,
  DEVICE_SEND_LOGGER_KEY,
  DEFAULT_SEND_FREQUENCY,
  DEFAULT_CODE_EXPIRE,
} from './types';
import enviromentUtil from '@/utils/enviroment.util';

// ============================================================================
// SMS Service
// ============================================================================

@Injectable()
export class SmsService implements OnModuleInit {
  /** SMS 客户端工厂 */
  private factory: SmsClientFactory | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly verifyService: VerifyClient,
    private readonly rabbitmq: RabbitmqService,
    private readonly httpService: HttpService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  // ========================================================================
  // Lifecycle
  // ========================================================================

  onModuleInit(): void {
    this.initializeSmsClient();
  }

  /**
   * 初始化 SMS 客户端工厂
   */
  private initializeSmsClient(): void {
    const secretConfig = getKeysConfig()?.sms as AppSmsConfig | undefined;

    if (!secretConfig) {
      this.logger.warn('SMS config not found, SMS service disabled');
      return;
    }

    try {
      this.factory = new SmsClientFactory(
        {
          logger: this.logger,
          httpService: this.httpService,
          redis: this.redis,
        },
        {
          defaultVendor: secretConfig.default as SmsVendor,
          providers: secretConfig.providers,
        },
      );

      if (enviromentUtil.isProduction()) {
        this.logger.info(
          `SMS service initialized with vendor: ${this.factory.currentVendorName}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to initialize SMS client', { error });
    }
  }

  // ========================================================================
  // Public Accessors
  // ========================================================================

  /**
   * 检查服务是否已初始化
   */
  get isInitialized(): boolean {
    return this.factory?.isInitialized ?? false;
  }

  /**
   * 获取当前供应商类型
   */
  get currentVendor(): SmsVendor | null {
    return this.factory?.currentVendor ?? null;
  }

  /**
   * 获取当前供应商显示名称
   */
  get currentVendorName(): string {
    return this.factory?.currentVendorName ?? 'Unknown';
  }

  /**
   * 检查是否为火山引擎供应商
   */
  get isVolcengine(): boolean {
    return this.factory?.isVolcengine ?? false;
  }

  // ========================================================================
  // Device Rate Limiting
  // ========================================================================

  /**
   * 获取设备发送日志
   *
   * @param deviceId - 设备 ID
   * @returns 发送日志数据，不存在返回 null
   */
  async getDeviceSendLogger(deviceId: string): Promise<string | null> {
    return await this.redis.getData(DEVICE_SEND_LOGGER_KEY, deviceId);
  }

  /**
   * 设置设备发送日志（用于频率限制）
   *
   * @param deviceId - 设备 ID
   * @param expire - 过期时间（秒），默认 30 秒
   */
  async setDeviceSendLogger(
    deviceId: string,
    expire: number = DEFAULT_SEND_FREQUENCY,
  ): Promise<void> {
    await this.redis.saveData(DEVICE_SEND_LOGGER_KEY, deviceId, '1', expire);
  }

  /**
   * 检查设备是否在冷却期
   *
   * @param deviceId - 设备 ID
   * @returns 是否在冷却期
   */
  async isDeviceInCooldown(deviceId: string): Promise<boolean> {
    const data = await this.getDeviceSendLogger(deviceId);
    return data !== null;
  }

  // ========================================================================
  // SMS Operations - Core
  // ========================================================================

  /**
   * 发送短信验证码（底层方法）
   *
   * @param mobile - 手机号码
   * @param code - 验证码
   * @param template - 短信模板
   * @returns 发送结果
   */
  async doSendSmsCode(
    mobile: string,
    code: string,
    template: SmsTemplate,
  ): Promise<SmsSendResult> {
    this.ensureInitialized();
    return await this.factory!.sendSmsCode(mobile, code, template as any);
  }

  /**
   * 发送验证码（火山引擎自动生成验证码）
   *
   * 仅火山引擎供应商支持此功能
   *
   * @param phoneNumber - 手机号码
   * @param templateId - 模板 ID，默认 'verify'
   * @returns 发送结果
   * @throws Error 如果当前供应商不是火山引擎
   */
  async sendVerifyCode(
    phoneNumber: string,
    templateId: string = 'verify',
  ): Promise<any> {
    this.ensureInitialized();
    return await this.factory!.sendVerifyCode(phoneNumber, templateId);
  }

  /**
   * 校验验证码（火山引擎）
   *
   * 仅火山引擎供应商支持此功能
   *
   * @param phoneNumber - 手机号码
   * @param code - 验证码
   * @param templateId - 模板 ID，默认 'verify'
   * @returns 校验结果
   * @throws Error 如果当前供应商不是火山引擎
   */
  async checkVerifyCode(
    phoneNumber: string,
    code: string,
    templateId: string = 'verify',
  ): Promise<VerifyCodeCheckResult> {
    this.ensureInitialized();
    return await this.factory!.checkVerifyCode(phoneNumber, code, templateId);
  }

  // ========================================================================
  // SMS Operations - Business Logic
  // ========================================================================

  /**
   * 处理发送短信验证码请求
   *
   * 包含完整的业务逻辑：
   * 1. 验证模板存在
   * 2. 检查发送频率限制
   * 3. 生成验证码
   * 4. 发送到消息队列（数据库写入由消费者处理）
   *
   * @param mobileAccount - 手机账户信息
   * @param deviceInfo - 设备信息
   * @param templateId - 模板 ID，默认 'verify'
   * @throws ApiException 如果模板不存在或发送太频繁
   */
  async processingSendSmsVerifyCode(
    mobileAccount: Partial<MobileAuth>,
    deviceInfo: PardxApp.HeaderData,
    templateId: string = 'verify',
  ): Promise<void> {
    this.ensureInitialized();

    // 1. 验证模板存在
    const template = this.factory!.getTemplate(templateId);
    if (!template) {
      throw apiError(CommonErrorCode.TemplateNotFound);
    }

    // 2. 检查发送频率限制
    const isInCooldown = await this.isDeviceInCooldown(deviceInfo.deviceid);
    if (isInCooldown) {
      throw apiError(CommonErrorCode.TooFrequent);
    }

    // 3. 设置频率限制
    const templateMeta = this.factory!.getTemplateMeta(templateId);
    const frequency = templateMeta?.frequency ?? DEFAULT_SEND_FREQUENCY;
    const codeExpire = templateMeta?.codeExpire ?? DEFAULT_CODE_EXPIRE;

    await this.setDeviceSendLogger(deviceInfo.deviceid, frequency);

    // 4. 生成验证码
    const code = await this.verifyService.generateMobileCode(
      mobileAccount.mobile!,
      codeExpire,
    );

    // 5. 发送到消息队列（数据库写入由消费者处理）
    await this.rabbitmq.sendMessageToRabbitMQ('smsSend', {
      mobile: mobileAccount.mobile,
      code,
      templateId,
      metadata: {
        deviceId: deviceInfo.deviceid,
      },
    });
  }

  // ========================================================================
  // Private Helpers
  // ========================================================================

  /**
   * 确保服务已初始化
   */
  private ensureInitialized(): void {
    if (!this.factory?.isInitialized) {
      throw new Error('SMS service not initialized. Check SMS configuration.');
    }
  }
}
