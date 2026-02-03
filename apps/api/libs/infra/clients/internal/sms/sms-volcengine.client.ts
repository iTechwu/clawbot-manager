/**
 * 火山引擎 SMS Client
 *
 * 职责：仅负责与火山引擎 SMS API 通信
 * - 不访问数据库
 * - 不包含业务逻辑
 */
import { Logger } from 'winston';
import {
  SmsProviderConfig,
  SmsVolcengineTemplate,
  VerifyCodeResult,
} from './dto/sms.dto';
import { sms } from '@volcengine/openapi';
import { RedisService } from '@app/redis';
import { v4 as uuidv4 } from 'uuid';

export class SmsVolcengineClient {
  private smsService: sms.SmsService;
  private readonly defaultSign: string;
  private readonly defaultSmsAccount: string;
  private readonly defaultTemplateId: string;

  constructor(
    protected readonly config: SmsProviderConfig,
    protected readonly redis: RedisService,
    protected readonly logger: Logger,
  ) {
    this.smsService = sms.defaultService;

    const accessKeyId = config.accessKey;
    const secretKey = config.accessSecret;

    if (!accessKeyId || !secretKey) {
      throw new Error('火山引擎SMS配置缺失：accessKey 或 accessSecret');
    }

    this.smsService.setAccessKeyId(accessKeyId);
    this.smsService.setSecretKey(secretKey);

    const defaultTemplate = config.templates?.[0] as
      | SmsVolcengineTemplate
      | undefined;
    this.defaultSign = defaultTemplate?.sign || '';
    this.defaultSmsAccount = defaultTemplate?.smsAccount || '';
    this.defaultTemplateId = defaultTemplate?.templateId || '';
  }

  async sendVerifyCode(phone: string, template: SmsVolcengineTemplate) {
    this.logger.info(`发送验证码到 ${phone} 使用模板 ${template.name}`);

    try {
      const response = await this.smsService.SendVerifyCode({
        SmsAccount: template.smsAccount || this.defaultSmsAccount,
        Sign: template.sign || this.defaultSign,
        TemplateID: template.templateId || this.defaultTemplateId,
        PhoneNumber: phone,
        Tag: template.tag || 'verify',
        UserExtCode: template.userExtCode || '',
        Scene: template.scene || 'verify',
        CodeType: template.codeType || 6,
        ExpireTime: template.expireTime || 300,
        TryCount: template.tryCount || 3,
      });

      this.logger.info(`火山引擎发送验证码成功，手机号码：${phone}`, {
        requestId: response.ResponseMetadata?.RequestId,
      });

      return response;
    } catch (error) {
      this.logger.error(
        `使用火山引擎发送验证码失败，手机号码：${phone}，错误信息：${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendSmsCode(
    phone: string,
    code: string,
    template: SmsVolcengineTemplate,
  ) {
    this.logger.warn(`火山引擎SMS不支持传入验证码，将使用自动生成的验证码`);
    return await this.sendVerifyCode(phone, template);
  }

  async checkVerifyCode(
    phoneNumber: string,
    code: string,
    template: SmsVolcengineTemplate,
  ): Promise<{
    success: boolean;
    result: VerifyCodeResult;
    message: string;
    data?: any;
  }> {
    try {
      const response = await this.smsService.CheckVerifyCode({
        SmsAccount: template.smsAccount || this.defaultSmsAccount,
        PhoneNumber: phoneNumber,
        Scene: template.scene || 'verify',
        Code: code,
      });

      if (response.ResponseMetadata?.Error) {
        return {
          success: false,
          result: VerifyCodeResult.INVALID_CODE,
          message: response.ResponseMetadata.Error.Message || '验证码校验失败',
        };
      }

      const result = String(response.Result) as VerifyCodeResult;

      if (result === VerifyCodeResult.SUCCESS) {
        const mobileTicket = uuidv4();
        const requestId = response.ResponseMetadata?.RequestId || '';

        const ticketData = {
          phoneNumber,
          requestId,
          createdAt: new Date().toISOString(),
        };
        await this.redis.set(`mobile_ticket:${mobileTicket}`, ticketData, {
          EX: 300,
        });

        return {
          success: true,
          result: VerifyCodeResult.SUCCESS,
          message: '验证码校验成功',
          data: {
            phoneNumber,
            verifiedAt: new Date().toISOString(),
            mobileTicket,
          },
        };
      }

      const errorMessages: Record<VerifyCodeResult, string> = {
        [VerifyCodeResult.SUCCESS]: '验证成功',
        [VerifyCodeResult.INVALID_CODE]: '验证码错误',
        [VerifyCodeResult.EXPIRED]: '验证码已过期',
        [VerifyCodeResult.USED]: '验证码已使用',
        [VerifyCodeResult.NOT_FOUND]: '验证码不存在',
        [VerifyCodeResult.EXCEEDED]: '验证次数超限',
      };

      return {
        success: false,
        result,
        message: errorMessages[result] || '未知的验证结果',
      };
    } catch (error) {
      this.logger.error(`验证码校验异常: ${error.message}`, error.stack);
      return {
        success: false,
        result: VerifyCodeResult.INVALID_CODE,
        message: `验证码校验异常: ${error.message}`,
      };
    }
  }
}
