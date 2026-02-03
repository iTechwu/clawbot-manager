import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessageApiController } from './message-api.controller';
import { MessageApiService } from './message-api.service';
import { MessageDbModule, UserInfoModule } from '@app/db';
import { AuthModule } from '@app/auth';
import { JwtModule } from '@app/jwt/jwt.module';
import { RedisModule } from '@app/redis';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    JwtModule,
    RedisModule,
    UserInfoModule,
    MessageDbModule,
  ],
  controllers: [MessageApiController],
  providers: [MessageApiService],
})
export class MessageApiModule {}
