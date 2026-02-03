import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileStorageServiceModule } from '@app/shared-services/file-storage';
import { UploaderService } from './uploader.service';
import { RedisModule } from '@app/redis';
@Module({
  imports: [ConfigModule, RedisModule, FileStorageServiceModule],
  providers: [UploaderService],
  exports: [UploaderService],
})
export class UploaderModule {}
