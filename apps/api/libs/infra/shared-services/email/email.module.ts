/**
 * Email Service Module
 *
 * 职责：提供邮件发送的业务逻辑服务
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { RedisModule } from '@app/redis';
import { RabbitmqModule } from '@app/rabbitmq';
import { VerifyModule } from '@app/clients/internal/verify';
import { EmailService } from './email.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    RedisModule,
    RabbitmqModule,
    VerifyModule,
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailServiceModule {}
