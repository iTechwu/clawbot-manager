/**
 * SendCloud Email Client
 *
 * 职责：仅负责与 SendCloud API 通信
 * - 不访问数据库
 * - 不包含业务逻辑
 */
import { Logger } from 'winston';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as nodemailer from 'nodemailer';
import smtpPool from 'nodemailer-sendcloud-transport';
import * as _ from 'lodash';
import { PardxEmailSender } from './dto/email.dto';
import { SendCloudConfig } from '@/config/validation';

// SendCloud API endpoints
const SENDCLOUD_API = {
  send: 'https://api.sendcloud.net/apiv2/mail/send',
  send_template: 'https://api.sendcloud.net/apiv2/mail/sendtemplate',
  list_get: 'https://api.sendcloud.net/apiv2/addresslist/list',
  list_create: 'https://api.sendcloud.net/apiv2/addresslist/add',
  list_update: 'https://api.sendcloud.net/apiv2/addresslist/update',
  list_delete: 'https://api.sendcloud.net/apiv2/addresslist/delete',
  member_get: 'https://api.sendcloud.net/apiv2/addressmember/get',
  member_add: 'https://api.sendcloud.net/apiv2/addressmember/add',
  member_update: 'https://api.sendcloud.net/apiv2/addressmember/update',
  member_delete: 'https://api.sendcloud.net/apiv2/addressmember/delete',
};

interface SendOptions {
  [key: string]: any;
}

interface EmailListOptions {
  start?: number;
  limit?: number;
}

interface CreateEmailListOptions {
  address: string;
  name: string;
  description?: string;
}

interface UpdateEmailListOptions {
  toAddress?: string;
  name?: string;
  description?: string;
  address?: string;
}

interface UpdateListMemberOptions {
  name?: string;
  vars?: Record<string, any>;
}

export class SendCloudClient {
  private transporter: nodemailer.Transporter;
  private from: string;
  private fromName: string;

  constructor(
    private readonly config: SendCloudConfig,
    private readonly httpService: HttpService,
    private readonly logger: Logger,
  ) {
    this.from = 'no-reply@' + config.domain;
    this.fromName = config.name;

    this.transporter = nodemailer.createTransport(
      smtpPool({
        auth: {
          apiUser: config.apiUser,
          apiKey: config.apiKey,
        },
      }),
    );
  }

  /**
   * 通用 POST 请求方法
   */
  private async postData(url: string, data: any): Promise<any> {
    data.apiKey = this.config.apiKey;
    data.apiUser = this.config.apiUser;
    try {
      const response = await firstValueFrom(this.httpService.post(url, data));
      return response.data;
    } catch (error) {
      this.logger.error(`SendCloud API error: ${url}`, {
        error: error.message,
      });
      throw error;
    }
  }

  // ==================== Email Sending ====================

  /**
   * HTTP请求的方式发送Email
   * @param to 收件人地址. 多个地址使用';'分隔
   * @param subject 标题. 不能为空
   * @param html 邮件的内容
   * @param options 可选的参数
   */
  async send(
    to: string,
    subject: string,
    html: string,
    options?: SendOptions,
  ): Promise<any> {
    if (!to || !subject || !html) {
      throw new Error('The params is missed!');
    }
    const data: any = {
      apiUser: this.config.apiUser,
      apiKey: this.config.apiKey,
      from: this.from,
      fromName: this.fromName,
      to: to,
      subject: subject,
      html: html,
    };

    const finalData = _.assign({}, data, _.cloneDeep(options));

    try {
      const response = await firstValueFrom(
        this.httpService.post(SENDCLOUD_API.send, finalData),
      );
      return response.data;
    } catch (err) {
      throw new Error('邮件发送失败: ' + err.message);
    }
  }

  /**
   * 使用 smtp 的方式发送邮件
   */
  async sendEmailSmtp(to: string, subject: string, data: string): Promise<any> {
    try {
      const mail = {
        from: this.from,
        fromName: this.fromName,
        to: to || [],
        subject: subject,
        html: data,
      };
      const info = await new Promise((resolve, reject) => {
        this.transporter.sendMail(mail, (err, info) => {
          if (err) {
            reject(new Error('邮件发送失败: ' + err.message));
          } else {
            resolve(info);
          }
        });
      });
      return info;
    } catch (error) {
      throw new Error('邮件发送过程中发生错误: ' + error.message);
    }
  }

  /**
   * 使用触发账号，发送邮件给某一个用户
   */
  async sendTemplateToOne(
    to: string,
    subject: string,
    templateName: string,
    sub: any,
    options?: SendOptions,
  ): Promise<any> {
    try {
      const data: any = {
        apiUser: this.config.apiUser,
        apiKey: this.config.apiKey,
        from: this.from,
        fromName: this.fromName,
        templateInvokeName: templateName,
        subject: subject,
        xsmtpapi: JSON.stringify({
          to: [to],
          sub: sub || {},
        }),
      };
      if (options) {
        _.merge(data, options);
      }
      const response = await firstValueFrom(
        this.httpService.post(SENDCLOUD_API.send_template, data, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }),
      );

      this.logger.info(`SendCloud email sent to ${to}`, {
        template: templateName,
        statusCode: response.data?.statusCode,
      });

      return response.data;
    } catch (error) {
      this.logger.error(`SendCloud email failed to ${to}`, {
        template: templateName,
        error: error.message,
      });
      throw new Error('发送模板邮件失败: ' + error.message);
    }
  }

  /**
   * 根据模板发送邮件
   */
  async sendByTemplate(
    to: string[],
    subject: string,
    templateName: string,
    sub: Record<string, any> = {},
    options: SendOptions = {},
  ): Promise<any> {
    const data = {
      apiUser: this.config.apiUser,
      apiKey: this.config.apiKey,
      from: this.from,
      fromName: this.fromName,
      templateInvokeName: templateName,
      subject: subject,
      xsmtpapi: JSON.stringify({
        to: to,
        sub: sub,
      }),
      ...options,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(SENDCLOUD_API.send_template, data),
      );
      return response.data;
    } catch (err) {
      throw err;
    }
  }

  /**
   * 利用邮件模板给maillist中的用户发送邮件
   */
  async sendByMailList(
    to: string,
    subject: string,
    templateName: string,
    options: SendOptions = {},
  ): Promise<any> {
    const data = {
      apiUser: this.config.apiUser,
      apiKey: this.config.apiKey,
      from: this.from,
      fromName: this.fromName,
      templateInvokeName: templateName,
      subject: subject,
      useAddressList: 'true',
      to: to,
      ...options,
    };
    try {
      const response = await firstValueFrom(
        this.httpService.post(SENDCLOUD_API.send_template, data),
      );
      return response.data;
    } catch (err) {
      throw err;
    }
  }

  // ==================== Email List Management ====================

  /**
   * 获取邮件列表
   */
  async getEmailList(options: EmailListOptions = {}): Promise<any> {
    return this.postData(SENDCLOUD_API.list_get, options);
  }

  /**
   * 创建邮件列表
   */
  async createEmailList(options: CreateEmailListOptions): Promise<any> {
    return this.postData(SENDCLOUD_API.list_create, options);
  }

  /**
   * 更新邮件列表
   */
  async updateEmailList(
    address: string,
    options: UpdateEmailListOptions = {},
  ): Promise<any> {
    const data = { ...options, address };
    return this.postData(SENDCLOUD_API.list_update, data);
  }

  // ==================== List Member Management ====================

  /**
   * 获取邮件列表成员
   */
  async getListMember(
    mailListAddr: string,
    options: EmailListOptions = {},
  ): Promise<any> {
    const data = { ...options, mail_list_addr: mailListAddr };
    return this.postData(SENDCLOUD_API.member_get, data);
  }

  /**
   * 添加邮件列表成员
   */
  async addListMember(
    mailListAddr: string,
    memberAddr: string,
    name: string,
    options: UpdateListMemberOptions = {},
  ): Promise<any> {
    const data: any = {
      mail_list_addr: mailListAddr,
      member_addr: memberAddr,
      name: name,
      ...options,
    };
    if (data.vars) {
      data.vars = JSON.stringify(data.vars);
    }
    return this.postData(SENDCLOUD_API.member_add, data);
  }

  /**
   * 更新邮件列表成员
   */
  async updateListMember(
    mailListAddr: string,
    memberAddr: string,
    name: string,
    options: UpdateListMemberOptions = {},
  ): Promise<any> {
    const data: any = {
      mail_list_addr: mailListAddr,
      member_addr: memberAddr,
      name: name,
      ...options,
    };
    if (data.vars) {
      data.vars = JSON.stringify(data.vars);
    }
    return this.postData(SENDCLOUD_API.member_update, data);
  }

  /**
   * 删除邮件列表成员
   */
  async deleteListMember(
    mailListAddr: string,
    memberAddr: string[],
  ): Promise<any> {
    return this.postData(SENDCLOUD_API.member_delete, {
      mail_list_addr: mailListAddr,
      member_addr: memberAddr.join(';'),
    });
  }

  /**
   * 复制成员到另一个列表
   */
  async addToOtherList(sourceList: string, targetList: string): Promise<any[]> {
    const limitOptions = {
      start: 0,
      limit: 1000,
    };
    try {
      const data = await this.getListMember(sourceList, limitOptions);
      const wantList = data.members;
      const promises = wantList.map((member: any) => {
        const _name = member.vars['%name%'];
        const options = {
          vars: {
            domain: member.vars['%domain%'],
            avatar: member.vars['%avatar%'],
          },
        };
        return this.addListMember(targetList, member.address, _name, options);
      });
      return Promise.all(promises);
    } catch (err) {
      this.logger.error('addToOtherList failed', { error: err.message });
      throw err;
    }
  }
}
