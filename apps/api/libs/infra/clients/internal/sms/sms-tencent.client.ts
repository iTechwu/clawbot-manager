/**
 * 腾讯云 SMS Client
 *
 * 职责：仅负责与腾讯云 SMS API 通信
 * - 不访问数据库
 * - 不包含业务逻辑
 */
import { Logger } from 'winston';
import { SmsDefaultTemplate, SmsProviderConfig } from './dto/sms.dto';
import * as tencentcloud from 'tencentcloud-sdk-nodejs-sms';
import { Client } from 'tencentcloud-sdk-nodejs-sms/tencentcloud/services/sms/v20210111/sms_client';

const SmsClient = tencentcloud.sms.v20210111.Client;

export class SmsTencentClient {
  private client: Client;

  constructor(
    protected readonly config: SmsProviderConfig,
    protected readonly logger: Logger,
  ) {
    this.client = this.createClient();
  }

  private createClient() {
    const clientConfig = {
      credential: {
        secretId: this.config.accessKey,
        secretKey: this.config.accessSecret,
      },
      region: this.config.region,
      profile: {
        httpProfile: {
          endpoint: 'sms.tencentcloudapi.com',
        },
      },
    };
    return new SmsClient(clientConfig);
  }

  async sendSmsCode(phone: string, code: string, template: SmsDefaultTemplate) {
    this.logger.info(
      `发送验证码 ${code} 到 ${phone} 使用模板 ${template.name}`,
    );
    const params = {
      SmsSdkAppId: this.config.appId,
      SignName: template.sign,
      TemplateId: template.templateCode,
      TemplateParamSet: [code],
      PhoneNumberSet: [`+86${phone}`],
    };
    return await this.client.SendSms(params);
  }
}
