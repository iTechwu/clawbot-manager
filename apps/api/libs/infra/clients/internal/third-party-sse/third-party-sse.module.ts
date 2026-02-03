import { Module } from '@nestjs/common';
import { ThirdPartySseClient } from './third-party-sse.client';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [ThirdPartySseClient],
  exports: [ThirdPartySseClient],
})
export class ThirdPartySseModule {}
