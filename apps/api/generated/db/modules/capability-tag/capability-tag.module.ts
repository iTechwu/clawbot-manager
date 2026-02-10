import { Module } from '@nestjs/common';
import { CapabilityTagService } from './capability-tag.service';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, RedisModule, ConfigModule],
  providers: [CapabilityTagService],
  exports: [CapabilityTagService],
})
export class CapabilityTagModule {}
