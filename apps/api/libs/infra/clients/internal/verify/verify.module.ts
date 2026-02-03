import { Module } from '@nestjs/common';
import { VerifyClient } from './verify.client';
import { RedisModule } from '@app/redis';

@Module({
  imports: [RedisModule],
  providers: [VerifyClient],
  exports: [VerifyClient],
})
export class VerifyModule {}
