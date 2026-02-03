import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { SmsApiController } from './sms-api.controller';
import { AuthModule } from '@app/auth';
import { UserInfoModule, MobileAuthModule } from '@app/db';
import { TransformRootPipe } from '@/pipes/transform-root.pipe';
import { SmsServiceModule } from '@app/shared-services/sms';

@Module({
  controllers: [SmsApiController],
  providers: [TransformRootPipe],
  imports: [
    ConfigModule,
    RedisModule,
    AuthModule,
    UserInfoModule,
    MobileAuthModule,
    SmsServiceModule,
  ],
})
export class SmsApiModule {}
