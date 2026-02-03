/**
 * ZXJC SMS Client
 *
 * 职责：仅负责通过 ZXJC 接口发送短信
 * - 不访问数据库
 * - 不包含业务逻辑
 */
import { Logger } from 'winston';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SmsProviderConfig, SmsZxjcTemplate } from './dto/sms.dto';

export class SmsZxjcClient {
  constructor(
    protected readonly config: SmsProviderConfig,
    protected readonly httpService: HttpService,
    protected readonly logger: Logger,
  ) {}

  async sendSmsCode(phone: string, code: string, template: SmsZxjcTemplate) {
    const content = template.content.replace('code', code);
    this.logger.info(`发送验证码 ${code} 到 ${phone} 使用模板 ${content}`);

    const sendContent = {
      ...template,
      content,
      calledNumber: phone,
    };
    this.logger.info('发送内容：', sendContent);

    const url = 'http://139.224.36.226:382/wgws/OrderServlet4J';
    try {
      const response = await firstValueFrom(
        this.httpService.post(url, sendContent, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );
      this.logger.info('doSendSmsCode success', response);
      return response.data;
    } catch (e) {
      this.logger.error('doSendSmsCode error', e);
      throw e;
    }
  }
}
