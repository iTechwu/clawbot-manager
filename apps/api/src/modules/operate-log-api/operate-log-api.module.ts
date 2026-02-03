import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OperateLogApiController } from './operate-log-api.controller';
import { OperateLogApiService } from './operate-log-api.service';
import { OperateLogModule, UserInfoModule } from '@app/db';
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
    OperateLogModule,
  ],
  controllers: [OperateLogApiController],
  providers: [OperateLogApiService],
  exports: [OperateLogApiService],
})
export class OperateLogApiModule {}
