import { Module } from '@nestjs/common';
import { SignApiController } from './sign-api.controller';
import { SignService } from './sign-api.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@app/auth';
import { RedisModule } from '@app/redis';
import { JwtModule } from '@app/jwt';
import { SmsServiceModule } from '@app/shared-services/sms';
import { EmailServiceModule } from '@app/shared-services/email';
import { VerifyModule } from '@app/clients/internal/verify';
import { FileStorageServiceModule } from '@app/shared-services/file-storage';
import {
  UserInfoModule,
  EmailAuthModule,
  MobileAuthModule,
} from '@app/db';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    AuthModule,
    JwtModule,
    SmsServiceModule,
    EmailServiceModule,
    VerifyModule,
    FileStorageServiceModule,
    UserInfoModule,
    EmailAuthModule,
    MobileAuthModule,
  ],
  controllers: [SignApiController],
  providers: [SignService],
})
export class SignModule {}
