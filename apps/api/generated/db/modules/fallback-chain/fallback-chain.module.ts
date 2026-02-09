import { Module } from '@nestjs/common';
import { FallbackChainService } from './fallback-chain.service';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, RedisModule, ConfigModule],
  providers: [FallbackChainService],
  exports: [FallbackChainService],
})
export class FallbackChainModule {}
