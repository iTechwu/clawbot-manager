import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploaderController } from './uploader.controller';
import { UploaderModule as UploaderServiceModule } from '@app/shared-services/uploader';
import { FileStorageServiceModule } from '@app/shared-services/file-storage';
import { FileSourceModule, UserInfoModule } from '@app/db';
import { AuthModule } from '@app/auth';
import { JwtModule } from '@app/jwt/jwt.module';
import { RedisModule } from '@app/redis';

@Module({
  imports: [
    ConfigModule,
    UploaderServiceModule,
    FileStorageServiceModule,
    FileSourceModule,
    UserInfoModule,
    AuthModule,
    JwtModule,
    RedisModule,
  ],
  controllers: [UploaderController],
})
export class UploaderModule {}
