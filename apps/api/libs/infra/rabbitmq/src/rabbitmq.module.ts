import { Module } from '@nestjs/common';
import * as Rabbitmq from 'amqplib';
import { RABBITMQ_CONNECTION, RabbitmqConnection } from './dto/rabbitmq.dto';
import { RabbitmqService } from './rabbitmq.service';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { ConfigModule } from '@nestjs/config';
import enviroment from '@/utils/enviroment.util';

@Module({
  imports: [PrismaModule, RedisModule, ConfigModule],
  providers: [
    {
      provide: RABBITMQ_CONNECTION,
      useFactory: async (): Promise<RabbitmqConnection> => {
        const maxRetries = 5;
        const retryDelay = 3000; // 3 seconds
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(
              `Attempting to connect to RabbitMQ (attempt ${attempt}/${maxRetries}): ${process.env.RABBITMQ_URL}`,
            );

            const connection = await Rabbitmq.connect(
              process.env.RABBITMQ_URL,
              {
                heartbeat: 60,
                reconnect: true,
                reconnectBackoffStrategy: 'linear',
                reconnectBackoffTime: 1000,
              },
            );
            if (enviroment.isProduction()) {
              console.log('RabbitMQ connection established successfully');
            }

            // 设置连接错误监听
            connection.on('error', (error) => {
              console.error('RabbitMQ connection error:', error);
            });

            connection.on('close', () => {
              if (enviroment.isProduction()) {
                console.warn('❌ RabbitMQ connection closed');
              }
            });

            return {
              connection,
              close: async () => {
                try {
                  await connection.close();
                  if (enviroment.isProduction()) {
                    console.log('✅ RabbitMQ connection closed gracefully');
                  }
                } catch (error) {
                  // 忽略已关闭的连接错误
                  if (
                    !(error instanceof Error) ||
                    (!error.message.includes('closed') &&
                      !error.message.includes('Connection closed') &&
                      !error.message.includes('IllegalOperationError'))
                  ) {
                    console.error(
                      '❌ Error closing RabbitMQ connection:',
                      error,
                    );
                  }
                }
              },
            };
          } catch (error) {
            lastError = error as Error;
            console.error(
              `RabbitMQ connection attempt ${attempt}/${maxRetries} failed:`,
              error,
            );

            if (attempt < maxRetries) {
              console.log(`Retrying in ${retryDelay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }
          }
        }

        console.error(
          'Failed to establish RabbitMQ connection after all retries',
        );
        throw new Error(
          `Failed to connect to RabbitMQ after ${maxRetries} attempts. Last error: ${lastError?.message}`,
        );
      },
    },
    RabbitmqService,
  ],

  exports: [RABBITMQ_CONNECTION, RabbitmqService],
})
export class RabbitmqModule {}
