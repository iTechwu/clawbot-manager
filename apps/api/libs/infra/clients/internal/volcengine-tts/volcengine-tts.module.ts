import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { WinstonModule } from 'nest-winston';
import { FileStorageServiceModule } from '@app/shared-services/file-storage';
import { VolcengineTtsClient } from './volcengine-tts.client';

@Module({
  imports: [
    ConfigModule,
    WinstonModule,
    FileStorageServiceModule,
    HttpModule.register({
      timeout: 30000, // 30秒超时
      maxRedirects: 5,
    }),
  ],
  providers: [VolcengineTtsClient],
  exports: [VolcengineTtsClient],
})
export class VolcengineTtsModule {}
