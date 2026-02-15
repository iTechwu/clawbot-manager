/**
 * Bot Channel API Module
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@app/auth';
import { JwtModule } from '@app/jwt/jwt.module';
import { RedisModule } from '@app/redis';
import { BotChannelApiController } from './bot-channel-api.controller';
import { BotChannelApiService } from './bot-channel-api.service';
import { BotChannelStartupService } from './bot-channel-startup.service';
import { FeishuMessageHandlerService } from './feishu-message-handler.service';
import {
  BotChannelModule,
  BotModule,
  UserInfoModule,
  ChannelDefinitionModule,
  BotModelModule,
} from '@app/db';
import { CryptModule } from '@app/clients/internal/crypt';
import { FeishuClientModule } from '@app/clients/internal/feishu';
import { OpenClawModule } from '@app/clients/internal/openclaw';
import { OcrModule } from '@app/shared-services/ocr';
import { FileStorageServiceModule } from '@app/shared-services/file-storage';

@Module({
  imports: [
    ConfigModule,
    BotChannelModule,
    BotModule,
    BotModelModule,
    UserInfoModule,
    ChannelDefinitionModule,
    AuthModule,
    JwtModule,
    RedisModule,
    CryptModule,
    FeishuClientModule,
    OpenClawModule,
    OcrModule,
    FileStorageServiceModule,
  ],
  controllers: [BotChannelApiController],
  providers: [
    BotChannelApiService,
    BotChannelStartupService,
    FeishuMessageHandlerService,
  ],
  exports: [BotChannelApiService],
})
export class BotChannelApiModule {}
