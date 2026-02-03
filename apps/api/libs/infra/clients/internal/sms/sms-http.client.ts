/**
 * HTTP SMS Client
 *
 * 职责：仅负责通过 HTTP 接口发送短信
 * - 不访问数据库
 * - 不包含业务逻辑
 */
import { Logger } from 'winston';
import { createHash } from 'crypto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { SmsProviderConfig, SmsHttpTemplate } from './dto/sms.dto';

export class SmsHttpClient {
  constructor(
    protected readonly config: SmsProviderConfig,
    protected readonly httpService: HttpService,
    protected readonly logger: Logger,
  ) {}

  async sendSmsCode(
    phone: string,
    code: string,
    template: SmsHttpTemplate,
  ): Promise<any> {
    try {
      const content = template.content.replace('{code}', code);

      this.logger.info(
        `发送HTTP短信验证码 ${code} 到 ${phone} 使用模板 ${template.name}`,
      );

      const sendData = this.prepareSendData(phone, content, template);
      const response = await this.executeHttpRequest(sendData);

      this.logger.info('HTTP短信发送成功', {
        phone,
        code,
        template: template.name,
        response: response.data,
      });

      return {
        statusCode: 200,
        error: '0',
        data: response.data,
      };
    } catch (error) {
      this.logger.error(`HTTP短信发送失败: ${phone}`, {
        error: error.message,
        stack: error.stack,
      });

      return {
        statusCode: 500,
        error: '1',
        message: error.message,
      };
    }
  }

  private prepareSendData(
    phone: string,
    content: string,
    template: SmsHttpTemplate,
  ) {
    const timestamp = Date.now().toString();
    const sign = this.generateMd5Sign(
      this.config.appKey,
      this.config.accessSecret,
      timestamp,
    );

    return {
      appkey: this.config.appKey,
      appcode: this.config.appCode,
      sign,
      phone,
      msg: content,
      timestamp,
    };
  }

  private async executeHttpRequest(data: any): Promise<AxiosResponse> {
    const jsonData = JSON.stringify(data);
    const config = {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      timeout: 30000,
    };

    this.logger.debug(`发送HTTP短信请求: ${this.config.endpoint}`, {
      data,
    });

    return await firstValueFrom(
      this.httpService.post(this.config.endpoint, jsonData, config),
    );
  }

  private generateMd5Sign(
    appkey: string,
    appsecret: string,
    timestamp: string,
  ): string {
    const param = appkey + appsecret + timestamp;
    return createHash('md5').update(param, 'utf8').digest('hex');
  }
}
