import { Inject, Injectable } from '@nestjs/common';
import { BotUsageLogService, MessageService, BotService } from '@app/db';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

/**
 * Quota limits configuration
 */
export interface QuotaLimits {
  dailyTokenLimit: number;
  monthlyTokenLimit: number;
  warningThreshold: number; // Percentage (0-1) at which to send warning
}

const DEFAULT_QUOTA_LIMITS: QuotaLimits = {
  dailyTokenLimit: 100000,
  monthlyTokenLimit: 3000000,
  warningThreshold: 0.8, // 80%
};

/**
 * QuotaService - Token 配额检查服务
 *
 * 负责：
 * - 检查 Bot 的 token 使用量
 * - 当超过配额时发送系统消息通知
 * - 支持日/月配额限制
 */
@Injectable()
export class QuotaService {
  private quotaLimits: QuotaLimits = DEFAULT_QUOTA_LIMITS;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly botUsageLogService: BotUsageLogService,
    private readonly messageService: MessageService,
    private readonly botService: BotService,
  ) {}

  /**
   * Check quota after usage and send notification if needed
   * 检查配额并在需要时发送通知
   */
  async checkAndNotify(botId: string): Promise<void> {
    try {
      const bot = await this.botService.getById(botId);
      if (!bot) {
        return;
      }

      const userId = bot.createdById;
      const botName = bot.name;

      // Get daily usage
      const dailyUsage = await this.getDailyUsage(botId);
      const monthlyUsage = await this.getMonthlyUsage(botId);

      // Check daily quota
      await this.checkDailyQuota(userId, botId, botName, dailyUsage);

      // Check monthly quota
      await this.checkMonthlyQuota(userId, botId, botName, monthlyUsage);
    } catch (error) {
      this.logger.error('Failed to check quota:', error);
    }
  }

  /**
   * Get daily token usage for a bot
   */
  private async getDailyUsage(botId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs = await this.botUsageLogService.listByBotId(botId, {
      startDate: today,
    });

    return logs.reduce((sum, log) => {
      return sum + (log.requestTokens || 0) + (log.responseTokens || 0);
    }, 0);
  }

  /**
   * Get monthly token usage for a bot
   */
  private async getMonthlyUsage(botId: string): Promise<number> {
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const logs = await this.botUsageLogService.listByBotId(botId, {
      startDate: firstDayOfMonth,
    });

    return logs.reduce((sum, log) => {
      return sum + (log.requestTokens || 0) + (log.responseTokens || 0);
    }, 0);
  }

  /**
   * Check daily quota and send notification
   */
  private async checkDailyQuota(
    userId: string,
    botId: string,
    botName: string,
    usage: number,
  ): Promise<void> {
    const { dailyTokenLimit, warningThreshold } = this.quotaLimits;
    const warningLevel = dailyTokenLimit * warningThreshold;

    if (usage >= dailyTokenLimit) {
      await this.sendQuotaExceededMessage(
        userId,
        botId,
        botName,
        'daily',
        usage,
        dailyTokenLimit,
      );
    } else if (usage >= warningLevel) {
      await this.sendQuotaWarningMessage(
        userId,
        botId,
        botName,
        'daily',
        usage,
        dailyTokenLimit,
      );
    }
  }

  /**
   * Check monthly quota and send notification
   */
  private async checkMonthlyQuota(
    userId: string,
    botId: string,
    botName: string,
    usage: number,
  ): Promise<void> {
    const { monthlyTokenLimit, warningThreshold } = this.quotaLimits;
    const warningLevel = monthlyTokenLimit * warningThreshold;

    if (usage >= monthlyTokenLimit) {
      await this.sendQuotaExceededMessage(
        userId,
        botId,
        botName,
        'monthly',
        usage,
        monthlyTokenLimit,
      );
    } else if (usage >= warningLevel) {
      await this.sendQuotaWarningMessage(
        userId,
        botId,
        botName,
        'monthly',
        usage,
        monthlyTokenLimit,
      );
    }
  }

  /**
   * Send quota exceeded notification
   */
  private async sendQuotaExceededMessage(
    userId: string,
    botId: string,
    botName: string,
    period: 'daily' | 'monthly',
    usage: number,
    limit: number,
  ): Promise<void> {
    const messageKey = `quota_exceeded_${period}_${botId}_${this.getDateKey(period)}`;

    // Check if we already sent this notification today/this month
    const existingMessages = await this.messageService.getUserMessages(userId, {
      type: 'NOTIFICATION',
      limit: 100,
    });

    const alreadySent = existingMessages.list.some(
      (msg) => (msg.message as any).metadata?.messageKey === messageKey,
    );

    if (alreadySent) {
      return;
    }

    await this.messageService.createSystemMessage(
      `Token Quota Exceeded`,
      {
        type: 'QUOTA_EXCEEDED',
        period,
        botId,
        botName,
        usage,
        limit,
        message: `Your bot "${botName}" has exceeded the ${period} token quota. Usage: ${usage.toLocaleString()} / ${limit.toLocaleString()} tokens.`,
      },
      [userId],
      { messageKey },
    );

    this.logger.info(
      `Sent quota exceeded notification to user ${userId} for bot ${botId}`,
    );
  }

  /**
   * Send quota warning notification
   */
  private async sendQuotaWarningMessage(
    userId: string,
    botId: string,
    botName: string,
    period: 'daily' | 'monthly',
    usage: number,
    limit: number,
  ): Promise<void> {
    const messageKey = `quota_warning_${period}_${botId}_${this.getDateKey(period)}`;

    // Check if we already sent this notification
    const existingMessages = await this.messageService.getUserMessages(userId, {
      type: 'NOTIFICATION',
      limit: 100,
    });

    const alreadySent = existingMessages.list.some(
      (msg) => (msg.message as any).metadata?.messageKey === messageKey,
    );

    if (alreadySent) {
      return;
    }

    const percentage = Math.round((usage / limit) * 100);

    await this.messageService.createSystemMessage(
      `Token Quota Warning`,
      {
        type: 'QUOTA_WARNING',
        period,
        botId,
        botName,
        usage,
        limit,
        percentage,
        message: `Your bot "${botName}" has used ${percentage}% of the ${period} token quota. Usage: ${usage.toLocaleString()} / ${limit.toLocaleString()} tokens.`,
      },
      [userId],
      { messageKey },
    );

    this.logger.info(
      `Sent quota warning notification to user ${userId} for bot ${botId}`,
    );
  }

  /**
   * Get date key for deduplication
   */
  private getDateKey(period: 'daily' | 'monthly'): string {
    const now = new Date();
    if (period === 'daily') {
      return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    }
    return `${now.getFullYear()}-${now.getMonth() + 1}`;
  }

  /**
   * Update quota limits
   */
  setQuotaLimits(limits: Partial<QuotaLimits>): void {
    this.quotaLimits = { ...this.quotaLimits, ...limits };
  }
}
