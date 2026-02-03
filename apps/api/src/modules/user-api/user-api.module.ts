import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserApiController } from './user-api.controller';
import { UserApiService } from './user-api.service';
import { AuthModule } from '@app/auth';
import {
  UserInfoModule,
  EmailAuthModule,
  MobileAuthModule,
  FileSourceModule,
} from '@app/db';
import { FileCdnModule } from '@app/clients/internal/file-cdn';
import { JwtModule } from '@app/jwt/jwt.module';
import { RedisModule } from '@app/redis';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    JwtModule,
    RedisModule,
    UserInfoModule,
    EmailAuthModule,
    MobileAuthModule,
    FileSourceModule,
    FileCdnModule,
  ],
  controllers: [UserApiController],
  providers: [UserApiService],
})
export class UserApiModule {}
