import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthValidationService } from './auth-validation.service';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { JwtModule } from '@app/jwt/jwt.module';
import { UserInfoModule, FileSourceModule } from '@app/db';
import { FileCdnModule } from '@app/clients/internal/file-cdn';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    JwtModule,
    UserInfoModule,
    FileSourceModule,
    FileCdnModule,
  ],
  providers: [AuthGuard, AuthService, AuthValidationService],
  exports: [AuthGuard, AuthService, AuthValidationService],
})
export class AuthModule {}
