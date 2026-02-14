/**
 * Feishu Message Handler Service
 *
 * 职责：
 * - 统一处理飞书消息
 * - 消息去重（防止重复回复）
 * - 支持多模态消息（文本、富文本、图片）
 * - 转发消息到 OpenClaw 并回复飞书
 *
 * 注意：此服务是单例，确保消息去重在所有连接之间共享
 */
import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { BotChannelService, BotService } from '@app/db';
import { FeishuClientService } from '@app/clients/internal/feishu';
import {
  OpenClawClient,
  OpenClawContentPart,
} from '@app/clients/internal/openclaw';
import { parseFeishuMessage } from '@app/clients/internal/feishu/feishu-message-parser';
import type { ParsedFeishuMessage } from '@app/clients/internal/feishu/feishu.types';

/** 支持处理的消息类型 */
const SUPPORTED_MESSAGE_TYPES = ['text', 'post', 'image'];

@Injectable()
export class FeishuMessageHandlerService {
  // 消息去重：记录已处理的 messageId，防止重复回复
  // 这是单例服务，所以所有连接共享同一个 Set
  private processedMessageIds = new Set<string>();
  private readonly MESSAGE_ID_TTL = 60000; // 60 秒后清理

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly botChannelDb: BotChannelService,
    private readonly botDb: BotService,
    private readonly feishuClientService: FeishuClientService,
    private readonly openClawClient: OpenClawClient,
  ) {}

  /**
   * 创建消息处理器
   * 返回一个绑定了 channel 的处理函数
   */
  createHandler(channel: any): (event: any) => Promise<void> {
    return async (event: any) => {
      await this.handleFeishuMessage(channel, event);
    };
  }

  /**
   * 处理飞书消息
   * 支持文本、富文本和图片消息
   * 转发消息到 OpenClaw 并回复飞书
   */
  private async handleFeishuMessage(channel: any, event: any): Promise<void> {
    const messageId = event.event?.message?.message_id;
    const chatId = event.event?.message?.chat_id;
    const messageType = event.event?.message?.message_type;
    const rawContent = event.event?.message?.content;

    // 消息去重：检查是否已处理过该消息
    if (messageId && this.processedMessageIds.has(messageId)) {
      this.logger.debug('跳过重复消息（共享去重）', {
        messageId,
        channelId: channel.id,
      });
      return;
    }

    // 标记消息为已处理
    if (messageId) {
      this.processedMessageIds.add(messageId);
      // 设置定时清理，防止内存泄漏
      setTimeout(() => {
        this.processedMessageIds.delete(messageId);
      }, this.MESSAGE_ID_TTL);
    }

    // 使用统一的消息解析器解析消息
    const parsedMessage = parseFeishuMessage(messageType, rawContent || '');

    this.logger.info('========== 收到飞书消息（统一处理） ==========', {
      channelId: channel.id,
      botId: channel.botId,
      messageId,
      chatId,
      messageType,
      messageText: parsedMessage.text,
      hasImages: parsedMessage.hasImages,
      imageCount: parsedMessage.images.length,
    });

    // 检查是否为支持的消息类型
    if (!SUPPORTED_MESSAGE_TYPES.includes(messageType)) {
      this.logger.debug('不支持的消息类型，跳过', { messageType });
      return;
    }

    // 检查是否有有效内容
    if (!parsedMessage.text.trim() && !parsedMessage.hasImages) {
      this.logger.debug('消息内容为空，跳过', {
        messageType,
        parsedMessage,
      });
      return;
    }

    try {
      // 获取关联的 Bot
      const bot = await this.botDb.getById(channel.botId);
      if (!bot) {
        this.logger.error('找不到关联的 Bot（可能已删除），断开飞书连接', {
          botId: channel.botId,
          channelId: channel.id,
        });
        // 断开飞书连接
        await this.feishuClientService.destroyConnection(channel.id);
        // 更新渠道状态
        await this.botChannelDb.update(
          { id: channel.id },
          {
            connectionStatus: 'DISCONNECTED',
            lastError: 'Bot 已删除，连接已断开',
          },
        );
        return;
      }

      // 检查 Bot 是否运行中
      if (bot.status !== 'running') {
        this.logger.warn('Bot 未运行，跳过消息处理', {
          botId: bot.id,
          status: bot.status,
        });
        return;
      }

      // 检查 Bot 端口和 token
      if (!bot.port || !bot.gatewayToken) {
        this.logger.error('Bot 缺少端口或 token', {
          botId: bot.id,
          port: bot.port,
          hasToken: !!bot.gatewayToken,
        });
        return;
      }

      // 构建消息内容（支持多模态）
      const message = await this.buildMessage(parsedMessage, channel.id);

      this.logger.info('转发消息到 OpenClaw', {
        botId: bot.id,
        botName: bot.name,
        port: bot.port,
        messageType: typeof message === 'string' ? 'text' : 'multimodal',
        textLength:
          typeof message === 'string' ? message.length : message.length,
        imageCount: parsedMessage.images.length,
      });

      // 发送消息到 OpenClaw
      const aiResponse = await this.openClawClient.chat(
        bot.port,
        bot.gatewayToken,
        message,
      );

      this.logger.info('收到 OpenClaw 响应', {
        botId: bot.id,
        responseLength: aiResponse.length,
      });

      // 回复飞书消息
      if (aiResponse) {
        const apiClient = this.feishuClientService.getApiClient(channel.id);
        if (apiClient) {
          await apiClient.replyMessage(messageId, aiResponse);
          this.logger.info('已回复飞书消息', {
            channelId: channel.id,
            messageId,
            responseLength: aiResponse.length,
          });
        } else {
          this.logger.error('找不到飞书 API 客户端', { channelId: channel.id });
        }
      }
    } catch (error) {
      this.logger.error('处理飞书消息失败', {
        channelId: channel.id,
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 构建发送给 OpenClaw 的消息
   * 如果消息包含图片，构建多模态消息格式
   * 否则返回纯文本
   */
  private async buildMessage(
    parsedMessage: ParsedFeishuMessage,
    channelId: string,
  ): Promise<string | OpenClawContentPart[]> {
    // 如果没有图片，直接返回文本
    if (!parsedMessage.hasImages) {
      return parsedMessage.text;
    }

    // 构建多模态消息
    const contentParts: OpenClawContentPart[] = [];

    // 添加文本部分
    if (parsedMessage.text.trim()) {
      contentParts.push({
        type: 'text',
        text: parsedMessage.text,
      });
    }

    // 下载并添加图片
    const apiClient = this.feishuClientService.getApiClient(channelId);
    if (!apiClient) {
      this.logger.warn('找不到飞书 API 客户端，无法下载图片，仅发送文本', {
        channelId,
      });
      return parsedMessage.text;
    }

    for (const imageInfo of parsedMessage.images) {
      try {
        this.logger.info('下载飞书图片', {
          imageKey: imageInfo.imageKey,
          channelId,
        });

        const imageData = await apiClient.getImageData(imageInfo.imageKey);

        // 添加图片部分（使用 Base64 data URL）
        contentParts.push({
          type: 'image',
          image_url: {
            url: `data:${imageData.mimeType};base64,${imageData.base64}`,
            detail: 'auto',
          },
        });

        this.logger.info('飞书图片下载成功', {
          imageKey: imageInfo.imageKey,
          mimeType: imageData.mimeType,
          size: imageData.size,
        });
      } catch (error) {
        this.logger.error('下载飞书图片失败', {
          imageKey: imageInfo.imageKey,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // 继续处理其他图片，不中断整个流程
      }
    }

    // 如果所有图片都下载失败，回退到纯文本
    if (contentParts.filter((p) => p.type === 'image').length === 0) {
      this.logger.warn('所有图片下载失败，回退到纯文本模式', {
        channelId,
        textLength: parsedMessage.text.length,
      });
      return parsedMessage.text;
    }

    return contentParts;
  }
}
