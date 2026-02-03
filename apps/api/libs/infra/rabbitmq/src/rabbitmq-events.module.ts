/**
 * RabbitMQ Events Module
 *
 * 独立的 RabbitMQ 连接用于事件驱动系统
 * 使用独立的 vhost: nestjs_to_agentx_events
 * 不影响其他任务队列
 */
import { Module } from '@nestjs/common';
import * as Rabbitmq from 'amqplib';
import { ConfigModule } from '@nestjs/config';
import enviroment from '@/utils/enviroment.util';
import { RabbitmqEventsService } from './rabbitmq-events.service';

// 独立的连接令牌
export const RABBITMQ_EVENTS_CONNECTION = 'RABBITMQ_EVENTS_CONNECTION';

export interface RabbitmqEventsConnection {
  connection: Rabbitmq.Connection;
  close: () => Promise<void>;
}

@Module({
  imports: [ConfigModule],
  providers: [
    RabbitmqEventsService,
    {
      provide: RABBITMQ_EVENTS_CONNECTION,
      useFactory: async (): Promise<RabbitmqEventsConnection> => {
        const maxRetries = 5;
        const retryDelay = 3000; // 3 seconds
        let lastError: Error | null = null;

        // 使用独立的 RabbitMQ 连接 URL (独立 vhost)
        const rabbitmqEventsUrl =
          process.env.RABBITMQ_EVENTS_URL ||
          'amqp://pardx:N051Gym68Ul3@127.0.0.1:5672/nestjs_to_agentx_events';

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(
              `[Events] Attempting to connect to RabbitMQ Events (attempt ${attempt}/${maxRetries})`,
            );

            const connection = await Rabbitmq.connect(rabbitmqEventsUrl, {
              heartbeat: 60,
              reconnect: true,
              reconnectBackoffStrategy: 'linear',
              reconnectBackoffTime: 1000,
            });

            if (enviroment.isProduction()) {
              console.log(
                '✅ [Events] RabbitMQ Events connection established successfully',
              );
            } else {
              console.log(
                `✅ [Events] RabbitMQ Events connection established: ${rabbitmqEventsUrl}`,
              );
            }

            // 设置连接错误监听
            connection.on('error', (error) => {
              console.error(
                '[Events] RabbitMQ Events connection error:',
                error,
              );
            });

            connection.on('close', () => {
              console.warn('⚠️  [Events] RabbitMQ Events connection closed');
            });

            return {
              connection,
              close: async () => {
                try {
                  await connection.close();
                  console.log(
                    '✅ [Events] RabbitMQ Events connection closed gracefully',
                  );
                } catch (error) {
                  // 忽略已关闭的连接错误
                  if (
                    !(error instanceof Error) ||
                    (!error.message.includes('closed') &&
                      !error.message.includes('Connection closed') &&
                      !error.message.includes('IllegalOperationError'))
                  ) {
                    console.error(
                      '❌ [Events] Error closing RabbitMQ Events connection:',
                      error,
                    );
                  }
                }
              },
            };
          } catch (error) {
            lastError = error as Error;
            console.error(
              `[Events] RabbitMQ Events connection attempt ${attempt}/${maxRetries} failed:`,
              error,
            );

            if (attempt < maxRetries) {
              console.log(`[Events] Retrying in ${retryDelay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }
          }
        }

        console.error(
          '[Events] Failed to establish RabbitMQ Events connection after all retries',
        );

        // 如果连接失败,返回一个 fallback 对象而不是抛出错误
        // 这样系统可以继续运行,只是事件功能不可用
        console.warn(
          '⚠️  [Events] RabbitMQ Events service is unavailable, events will not be published',
        );

        return {
          connection: null as any,
          close: async () => {
            console.log('[Events] No RabbitMQ Events connection to close');
          },
        };
      },
    },
  ],
  exports: [RABBITMQ_EVENTS_CONNECTION, RabbitmqEventsService],
})
export class RabbitmqEventsModule {}
