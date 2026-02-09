import { Module } from '@nestjs/common';
import { CostStrategyService } from './cost-strategy.service';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, RedisModule, ConfigModule],
  providers: [CostStrategyService],
  exports: [CostStrategyService],
})
export class CostStrategyModule {}
