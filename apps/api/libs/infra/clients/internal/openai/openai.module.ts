import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { OpenAIClient } from './openai.client';

@Module({
  imports: [
    HttpModule.register({
      timeout: 120000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  providers: [OpenAIClient],
  exports: [OpenAIClient],
})
export class OpenAIClientModule {}
