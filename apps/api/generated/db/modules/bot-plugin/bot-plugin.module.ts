import { Module } from '@nestjs/common';
import { BotPluginService } from './bot-plugin.service';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, RedisModule, ConfigModule],
  providers: [BotPluginService],
  exports: [BotPluginService],
})
export class BotPluginModule {}
