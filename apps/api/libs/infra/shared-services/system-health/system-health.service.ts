import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RedisService } from '@app/redis';
import { RabbitmqService } from '@app/rabbitmq';
// eslint-disable-next-line import/no-restricted-paths -- 健康检查服务需要直接访问 Prisma 检查数据库连接状态
import { PrismaService } from '@app/prisma';

@Injectable()
export class SystemHealthService {
  constructor(
    private readonly redis: RedisService,
    private readonly rabbitmq: RabbitmqService,
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async checkDiskSpace(): Promise<boolean> {
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      exec('df -h | grep /dev/sda1', (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return reject(false);
        }
        const regex = /(\d+)%/;
        const matches = stdout.match(regex);
        if (matches && matches.length > 1) {
          const usage = parseInt(matches[1], 10);
          resolve(usage < 90); // Assuming less than 90% usage is acceptable
        } else {
          reject(false);
        }
      });
    });
  }

  async checkDatabaseConnection(): Promise<boolean> {
    try {
      // eslint-disable-next-line no-restricted-syntax -- 健康检查需要直接检查数据库连接状态
      if (!this.prisma.write) {
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  async checkRabbitMQConnection(): Promise<boolean> {
    try {
      if (!this.rabbitmq.connection) {
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  async checkRedisConnection(): Promise<boolean> {
    try {
      const result = await this.redis.redis.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }
}
