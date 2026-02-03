import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { KeyringProxyClient } from './keyring-proxy.client';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  providers: [KeyringProxyClient],
  exports: [KeyringProxyClient],
})
export class KeyringProxyModule {}
