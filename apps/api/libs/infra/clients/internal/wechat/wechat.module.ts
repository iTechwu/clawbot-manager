import { Module } from '@nestjs/common';
import { WechatClient } from './wechat.client';

@Module({
  providers: [WechatClient],
  exports: [WechatClient],
})
export class WechatModule {}
