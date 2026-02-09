import { Module } from '@nestjs/common';
import { BotModelRoutingService } from './bot-model-routing.service';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, RedisModule, ConfigModule],
  providers: [BotModelRoutingService],
  exports: [BotModelRoutingService],
})
export class BotModelRoutingModule {}
