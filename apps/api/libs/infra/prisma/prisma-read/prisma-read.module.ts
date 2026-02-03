import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbMetricsModule } from '../db-metrics/src/db-metrics.module';
import { PrismaReadService } from './prisma-read.service';

@Module({
  imports: [ConfigModule, DbMetricsModule],
  providers: [PrismaReadService],
  exports: [PrismaReadService],
})
export class PrismaReadModule {}
