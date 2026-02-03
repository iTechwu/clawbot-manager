/**
 * SMS Service Module
 *
 * 职责：提供短信发送的业务逻辑服务
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { RedisModule } from '@app/redis';
import { RabbitmqModule } from '@app/rabbitmq';
import { VerifyModule } from '@app/clients/internal/verify';
import { SmsService } from './sms.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    RedisModule,
    RabbitmqModule,
    VerifyModule,
  ],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsServiceModule {}
