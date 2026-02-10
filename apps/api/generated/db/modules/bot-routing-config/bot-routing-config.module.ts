import { Module } from '@nestjs/common';
import { BotRoutingConfigService } from './bot-routing-config.service';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, RedisModule, ConfigModule],
  providers: [BotRoutingConfigService],
  exports: [BotRoutingConfigService],
})
export class BotRoutingConfigModule {}
