import { Inject, Injectable } from '@nestjs/common';
import type { ServerResponse } from 'http';
import { BotService, BotUsageLogService } from '@app/db';
import { EncryptionService } from '../../bot-api/services/encryption.service';
import { KeyringService } from './keyring.service';
import { UpstreamService } from './upstream.service';
import { getVendorConfig, isVendorSupported } from '../config/vendor.config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

/**
 * 代理请求参数
 */
export interface ProxyRequestParams {
  vendor: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  body: Buffer | null;
  botToken: string;
}

/**
 * 代理响应结果
 */
export interface ProxyResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

/**
 * ProxyService - 代理业务服务
 *
 * 负责代理请求的业务逻辑：
 * - Bot 认证
 * - 密钥选择
 * - 请求转发
 * - 使用日志记录
 */
@Injectable()
export class ProxyService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly botService: BotService,
    private readonly botUsageLogService: BotUsageLogService,
    private readonly encryptionService: EncryptionService,
    private readonly keyringService: KeyringService,
    private readonly upstreamService: UpstreamService,
  ) {}

  /**
   * 处理代理请求（流式响应）
   */
  async handleProxyRequest(
    params: ProxyRequestParams,
    rawResponse: ServerResponse,
  ): Promise<ProxyResult> {
    const { vendor, path, method, headers, body, botToken } = params;

    // 1. 验证 vendor
    if (!isVendorSupported(vendor)) {
      return { success: false, error: `Unknown vendor: ${vendor}` };
    }

    const vendorConfig = getVendorConfig(vendor)!;

    // 2. 验证 Bot token
    const tokenHash = this.encryptionService.hashToken(botToken);
    const bot = await this.botService.getByProxyTokenHash(tokenHash);

    if (!bot) {
      return { success: false, error: 'Invalid bot token' };
    }

    // 3. 选择 API 密钥
    const keySelection = await this.keyringService.selectKeyForBot(vendor, bot.tags);

    if (!keySelection) {
      return { success: false, error: `No API keys available for vendor: ${vendor}` };
    }

    // 4. 转发请求到上游
    try {
      const statusCode = await this.upstreamService.forwardToUpstream(
        {
          vendorConfig,
          path,
          method,
          headers,
          body,
          apiKey: keySelection.secret,
        },
        rawResponse,
      );

      // 5. 记录使用日志
      await this.logUsage(bot.id, vendor, keySelection.keyId, statusCode);

      return { success: true, statusCode };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Upstream error for bot ${bot.id}:`, error);

      // 记录失败日志
      await this.logUsage(bot.id, vendor, keySelection.keyId, null);

      return { success: false, error: `Upstream error: ${errorMessage}` };
    }
  }

  /**
   * 记录使用日志
   */
  private async logUsage(
    botId: string,
    vendor: string,
    providerKeyId: string,
    statusCode: number | null,
  ): Promise<void> {
    try {
      await this.botUsageLogService.create({
        bot: { connect: { id: botId } },
        vendor,
        providerKey: { connect: { id: providerKeyId } },
        statusCode,
      });
    } catch (error) {
      this.logger.error('Failed to log usage:', error);
    }
  }

  /**
   * 生成新的代理 token 并更新 Bot
   */
  async generateProxyToken(botId: string): Promise<string> {
    const token = this.encryptionService.generateToken();
    const tokenHash = this.encryptionService.hashToken(token);

    await this.botService.update({ id: botId }, { proxyTokenHash: tokenHash });

    return token;
  }

  /**
   * 撤销 Bot 的代理 token
   */
  async revokeProxyToken(botId: string): Promise<void> {
    await this.botService.update({ id: botId }, { proxyTokenHash: null });
  }
}
