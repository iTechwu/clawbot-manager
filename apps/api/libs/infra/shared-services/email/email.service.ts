/**
 * Email Service
 *
 * 职责：提供邮件发送的业务逻辑
 * - 验证码生成和验证
 * - 邮件队列管理
 * - 发送频率限制
 */
import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import type { UserInfo } from '@prisma/client';

import { RedisService } from '@app/redis';
import { RabbitmqService } from '@app/rabbitmq';
import { VerifyClient } from '@app/clients/internal/verify';
import { CommonErrorCode } from '@repo/contracts/errors';
import { apiError } from '@/filter/exception/api.exception';
import { PardxApp, SendCloudConfig } from '@/config/dto/config.dto';
import { getKeysConfig } from '@/config/configuration';

import { SendCloudClient, PardxEmailSender } from '@app/clients/internal/email';

@Injectable()
export class EmailService implements OnModuleInit {
  private deviceSendLoggerKey = 'emailCodeDevice';
  private emailSendLoggerKey = 'emailCodeDevice';
  private emailCodePerDayLoggerKey = 'emailCodePerDay';
  private deviceCodePerDayLoggerKey = 'deviceCodePerDay';
  private secretConfig: SendCloudConfig;
  private templates: Record<string, PardxEmailSender.EmailTemplate> = {};
  private emailClient: SendCloudClient;

  constructor(
    private readonly verify: VerifyClient,
    private readonly rabbitmq: RabbitmqService,
    private readonly redis: RedisService,
    private readonly httpService: HttpService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  onModuleInit() {
    this.initializeEmailClient();
  }

  private initializeEmailClient() {
    const sendcloudConfig = getKeysConfig()?.sendcloud;
    if (!sendcloudConfig) {
      this.logger.warn('SendCloud config not found');
      return;
    }

    this.secretConfig = sendcloudConfig;
    this.emailClient = new SendCloudClient(
      sendcloudConfig,
      this.httpService,
      this.logger,
    );
    (sendcloudConfig.templates || []).forEach((template: any) => {
      this.templates[template.name] =
        template as PardxEmailSender.EmailTemplate;
    });
  }

  async checkSendEmailTooFrequent(deviceId: string, email: string) {
    const { deviceLogger, emailLogger } = await this.getEmailSendLogger(
      deviceId,
      email,
    );
    if (deviceLogger || emailLogger) {
      throw apiError(CommonErrorCode.TooFrequent);
    }
    const emailSendToday = await this.redis.getData(
      this.emailCodePerDayLoggerKey,
      email,
    );
    if (emailSendToday && emailSendToday > 30) {
      throw apiError(CommonErrorCode.TooFrequent);
    }
    const deviceSendToday = await this.redis.getData(
      this.deviceCodePerDayLoggerKey,
      email,
    );
    if (deviceSendToday && deviceSendToday > 30) {
      throw apiError(CommonErrorCode.TooFrequent);
    }
    return false;
  }

  async getEmailSendLogger(deviceId: string, email: string) {
    const deviceLogger = await this.redis.getData(
      this.deviceSendLoggerKey,
      deviceId,
    );
    const emailLogger = await this.redis.getData(
      this.emailSendLoggerKey,
      email,
    );
    return { deviceLogger, emailLogger };
  }

  async setEmailSendLogger(
    deviceId: string,
    email: string,
    expire?: number | null,
  ): Promise<void> {
    expire = expire || 30;
    await this.redis.saveData(this.deviceSendLoggerKey, deviceId, '1', expire);
    await this.redis.saveData(this.emailSendLoggerKey, email, '1', expire);
    await this.redis.incrData(this.emailCodePerDayLoggerKey, email);
    await this.redis.incrData(this.deviceCodePerDayLoggerKey, email);
  }

  async processingEmail(
    user: { email: string; nickname?: string; name?: string },
    deviceInfo: PardxApp.HeaderData,
    templateName: string,
    subValues?: any | null,
  ) {
    const message: PardxEmailSender.SignalMessage = await this.getEmailContent(
      user,
      deviceInfo,
      templateName,
      subValues,
    );
    await this.rabbitmq.sendMessageToRabbitMQ('sendcloud', message);
    return true;
  }

  async processingSendVerifyEmail(
    userInfo: UserInfo,
    deviceInfo: PardxApp.HeaderData,
  ) {
    const templateName: string = 'verify';
    const template: PardxEmailSender.EmailTemplate | undefined =
      this.templates[templateName];
    if (!template) {
      throw apiError(CommonErrorCode.TemplateNotFound);
    }
    await this.checkSendEmailTooFrequent(deviceInfo.deviceid, userInfo.email!);
    const to: string = userInfo.email!;
    const code: string = await this.verify.generateEmailCode(
      to,
      template.codeExpire,
    );
    const subValues: PardxEmailSender.RegisterEmailSub = {
      name: userInfo.nickname!,
      code: code,
    };
    return this.processingEmail(userInfo, deviceInfo, templateName, subValues);
  }

  async processingSendResetPasswordeEmail(
    emailAccount: { email: string; name: string },
    deviceInfo: PardxApp.HeaderData,
  ) {
    const templateName: string = 'resetpassword';
    const template: PardxEmailSender.EmailTemplate | undefined =
      this.templates[templateName];
    if (!template) {
      throw apiError(CommonErrorCode.TemplateNotFound);
    }
    await this.checkSendEmailTooFrequent(
      deviceInfo.deviceid,
      emailAccount.email,
    );
    const to: string = emailAccount.email;
    const code: string = await this.verify.generateEmailCode(
      to,
      template.codeExpire,
    );
    const subValues: PardxEmailSender.RegisterEmailSub = {
      name: emailAccount.name,
      code: code,
    };
    return this.processingEmail(
      emailAccount,
      deviceInfo,
      templateName,
      subValues,
    );
  }

  async processingSendRegisterEmail(
    emailAccount: { email: string; name: string },
    deviceInfo: PardxApp.HeaderData,
  ) {
    const templateName: string = 'register';
    const template: PardxEmailSender.EmailTemplate | undefined =
      this.templates[templateName];
    if (!template) {
      throw apiError(CommonErrorCode.TemplateNotFound);
    }
    await this.checkSendEmailTooFrequent(
      deviceInfo.deviceid,
      emailAccount.email,
    );

    const to: string = emailAccount.email;
    const code: string = await this.verify.generateEmailCode(
      to,
      template.codeExpire,
    );
    const subValues: PardxEmailSender.RegisterEmailSub = {
      name: emailAccount.name,
      code: code,
    };

    return this.processingEmail(
      emailAccount,
      deviceInfo,
      templateName,
      subValues,
    );
  }

  async getEmailContent(
    user: { email: string; nickname?: string; name?: string },
    deviceInfo: PardxApp.HeaderData,
    templateName: string,
    subValues?: any | null,
  ): Promise<PardxEmailSender.SignalMessage> {
    const template: PardxEmailSender.EmailTemplate | undefined =
      this.templates[templateName];
    if (!template) {
      throw apiError(CommonErrorCode.TemplateNotFound);
    }
    const to: string = user.email!;
    await this.setEmailSendLogger(
      deviceInfo.deviceid,
      user.email!,
      template.frequency,
    );
    const sub = template.sub;
    const subVery = {};
    if (sub && subValues) {
      for (const key of Object.keys(sub)) {
        const subKey = sub[key] as string;
        if (subKey && typeof subValues === 'object' && subKey in subValues) {
          subVery['%' + subKey + '%'] = [subValues[subKey]];
        }
      }
    }
    return {
      to,
      subject: template.subject,
      templateInvokeName: template.templateInvokeName,
      sub: subVery,
      metadata: {
        deviceId: deviceInfo.deviceid,
      },
    };
  }

  getTemplateSub() {
    // Object.entries(subValues).forEach(([key, value]) => {
    //     sub['%' + key + '%'] = value
    // })
  }
}
