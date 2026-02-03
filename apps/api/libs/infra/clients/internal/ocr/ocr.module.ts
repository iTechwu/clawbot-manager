import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OcrClient } from './ocr.client';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 5,
    }),
  ],
  providers: [OcrClient],
  exports: [OcrClient],
})
export class OcrModule {}
