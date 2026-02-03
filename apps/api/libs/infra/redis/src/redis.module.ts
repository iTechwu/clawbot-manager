import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_AUTH } from '@app/redis/dto/redis.dto';
import { RedisService } from './redis.service';
import { ConfigModule } from '@nestjs/config';
import { CommonErrorCode } from '@repo/contracts/errors';
import { ApiException, apiError } from '@/filter/exception/api.exception';
import enviroment from '@/utils/enviroment.util';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_AUTH,
      useFactory: async () => {
        const redisUrl = process.env.REDIS_URL;
        // console.log( "TECHWU" , redisUrl )
        if (!redisUrl) {
          throw apiError(CommonErrorCode.InvalidRedis);
        }
        try {
          const client = new Redis(redisUrl, {
            retryStrategy(times) {
              if (times > 10) {
                console.error(
                  'Redis连接失败',
                  'Redis reconnect exhausted after 10 retries.',
                );
                return null;
              }
              return Math.min(times * 150, 3000);
            },
          });

          client.on('connect', () => {
            if (enviroment.isProduction()) {
              console.log('Redis client connected');
            }
          });

          client.on('error', (error) => {
            if (enviroment.isProduction()) {
              console.error('Error connecting to Redis', error);
            } else {
              console.debug('Error connecting to Redis', error);
            }
            // throw new ApiException('invalidRedis');
          });

          return client;
        } catch (e) {
          console.error('Redis error', e);
          // throw new ApiException('invalidRedis');
          return null;
        }
      },
    },
    RedisService,
  ],
  exports: [REDIS_AUTH, RedisService],
  // 导出 Redis 客户端和服务
})
export class RedisModule {}
