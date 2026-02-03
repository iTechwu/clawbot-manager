/**
 * 阿里云 SMS Client
 *
 * 职责：仅负责与阿里云 SMS API 通信
 * - 不访问数据库
 * - 不包含业务逻辑
 */
import { Logger } from 'winston';
import { SmsProviderConfig, SmsDefaultTemplate } from './dto/sms.dto';
import Dysmsapi20170525, * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';

export class SmsAliyunClient {
  private client: Dysmsapi20170525;

  constructor(
    protected readonly config: SmsProviderConfig,
    protected readonly logger: Logger,
  ) {
    this.client = this.createClient(config);
  }

  private createClient(smsConfig: SmsProviderConfig): Dysmsapi20170525 {
    const config = new $OpenApi.Config({
      accessKeyId: smsConfig.accessKey,
      accessKeySecret: smsConfig.accessSecret,
    });
    config.endpoint = smsConfig.endpoint;
    return new Dysmsapi20170525(config);
  }

  async sendSmsCode(phone: string, code: string, template: SmsDefaultTemplate) {
    this.logger.info(
      `发送验证码 ${code} 到 ${phone} 使用模板 ${template.name}`,
    );
    const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
      phoneNumbers: phone,
      signName: template.sign,
      templateCode: template.templateCode,
      templateParam: `{"code":"${code}"}`,
    });
    try {
      return await this.client.sendSms(sendSmsRequest);
    } catch (error) {
      this.logger.error(
        `使用aliyun发送短信失败，手机号码：${phone}，错误信息：${error.message}`,
        error.data?.['Recommend'],
      );
      throw error;
    }
  }
}
