/**
 * 风险检测 Internal Client 模块
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { WinstonModule } from 'nest-winston';
import { RiskDetectionClient } from './risk-detection.client';

@Module({
  imports: [
    ConfigModule,
    WinstonModule,
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  providers: [RiskDetectionClient],
  exports: [RiskDetectionClient],
})
export class RiskDetectionModule {}
