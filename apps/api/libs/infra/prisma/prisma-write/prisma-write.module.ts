import { Module } from '@nestjs/common';
import { PrismaWriteService } from './prisma-write.service';
import { ConfigModule } from '@nestjs/config';
import { DbMetricsModule } from '../db-metrics/src/db-metrics.module';

@Module({
  imports: [ConfigModule, DbMetricsModule],
  providers: [PrismaWriteService],
  exports: [PrismaWriteService],
})
export class PrismaWriteModule {}
