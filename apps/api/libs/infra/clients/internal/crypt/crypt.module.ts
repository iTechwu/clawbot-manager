import { Module } from '@nestjs/common';
import { CryptClient } from './crypt.client';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [CryptClient],
  exports: [CryptClient],
})
export class CryptModule {}
