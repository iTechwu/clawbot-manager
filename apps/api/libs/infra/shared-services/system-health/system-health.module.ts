import { Module } from '@nestjs/common';
import { SystemHealthService } from './system-health.service';
import { SystemHealthController } from './system-health.controller';
import { ConfigModule } from '@nestjs/config';
// eslint-disable-next-line import/no-restricted-paths -- 健康检查服务需要直接访问 Prisma 检查数据库连接状态
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { RabbitmqModule } from '@app/rabbitmq';

@Module({
  imports: [ConfigModule, PrismaModule, RedisModule, RabbitmqModule],
  controllers: [SystemHealthController],
  providers: [SystemHealthService],
  exports: [SystemHealthService],
})
export class SystemHealthModule {}
