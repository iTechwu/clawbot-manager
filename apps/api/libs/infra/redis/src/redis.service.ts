import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_AUTH } from '@app/redis/dto/redis.dto';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { RedisCacheKeyConfig } from '@/config/validation';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import enviroment from '@/utils/enviroment.util';
@Injectable()
export class RedisService implements OnModuleDestroy {
  private redisConfigs: Record<string, RedisCacheKeyConfig> = {};
  // 日志节流：记录上次打印日志的时间，避免频繁输出相同错误
  private lastClosedLogTime = 0;
  private readonly CLOSED_LOG_THROTTLE_MS = 5000; // 5秒内只打印一次连接关闭的日志

  constructor(
    private readonly configService: ConfigService,
    @Inject(REDIS_AUTH) private readonly redisClient: Redis,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    const configs =
      this.configService.getOrThrow<RedisCacheKeyConfig[]>('redis');
    configs.forEach((config) => {
      this.redisConfigs[config.name] = config;
    });
  }

  /**
   * 检查 Redis 连接是否可用
   */
  private isConnectionAvailable(): boolean {
    if (!this.redisClient) {
      return false;
    }
    const status = this.redisClient.status;
    return status === 'ready' || status === 'connect';
  }

  /**
   * 节流日志输出：避免在服务重启时大量打印相同错误
   */
  private shouldLogClosedError(): boolean {
    const now = Date.now();
    if (now - this.lastClosedLogTime > this.CLOSED_LOG_THROTTLE_MS) {
      this.lastClosedLogTime = now;
      return true;
    }
    return false;
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      try {
        // 检查连接状态，避免在已关闭的连接上调用 quit()
        if (
          this.redisClient.status !== 'end' &&
          this.redisClient.status !== 'close'
        ) {
          await this.redisClient.quit();
        }
      } catch (error) {
        // 忽略已关闭的连接错误
        if (!(error instanceof Error) || !error.message.includes('closed')) {
          if (enviroment.isProduction()) {
            this.logger.error('Error closing Redis connection', {
              error,
            });
          } else {
            this.logger.debug('Error closing Redis connection', {
              error,
            });
          }
        }
      }
    }
    if (enviroment.isProduction()) {
      this.logger.info('Redis service destroyed');
    } else {
      this.logger.debug('Redis service destroyed');
    }
  }

  get redis() {
    return this.redisClient;
  }

  getExpireIn(name: string) {
    return this.redisConfigs[name].expireIn ?? -1;
  }

  getRedisKey(name: string, key: string): string {
    return this.redisConfigs[name].key + key;
  }

  async saveDataToList(name: string, key: string, value: any) {
    const redisKey = this.redisConfigs[name].key + key;
    if (!this.isConnectionAvailable()) {
      return;
    }
    try {
      await this.redis.rpush(redisKey, JSON.stringify(value));
    } catch (error) {
      if (error instanceof Error && error.message.includes('closed')) {
        if (this.shouldLogClosedError()) {
          if (enviroment.isProduction()) {
            this.logger.warn('Redis connection closed, saveDataToList failed');
          } else {
            this.logger.debug(
              'Redis connection closed, saveDataToList failed',
              { error },
            );
          }
        }
      } else {
        if (enviroment.isProduction()) {
          this.logger.error('Redis saveDataToList error:', { error });
        } else {
          this.logger.debug('Redis saveDataToList error:', { error });
        }
      }
    }
  }

  async getListData(name: string, key: string): Promise<any[]> {
    const redisKey = this.redisConfigs[name].key + key;
    if (!this.isConnectionAvailable()) {
      return [];
    }
    try {
      const data = await this.redis.lrange(redisKey, 0, -1);
      return data.length > 0 ? data.map((item) => JSON.parse(item)) : [];
    } catch (error) {
      if (error instanceof Error && error.message.includes('closed')) {
        if (this.shouldLogClosedError()) {
          if (enviroment.isProduction()) {
            this.logger.warn('Redis connection closed, getListData failed');
          } else {
            this.logger.debug('Redis connection closed, getListData failed', {
              error,
            });
          }
        }
      } else {
        if (enviroment.isProduction()) {
          this.logger.error('Redis getListData error:', { error });
        } else {
          this.logger.debug('Redis getListData error:', { error });
        }
      }
      return [];
    }
  }

  async pushDataToList(
    name: string,
    key: string,
    value: any,
    expireIn?: number,
  ) {
    const redisKey = this.redisConfigs[name].key + key;
    expireIn = expireIn ?? this.redisConfigs[name].expireIn ?? -1;
    if (!this.isConnectionAvailable()) {
      return;
    }
    try {
      await this.redis.lpush(redisKey, JSON.stringify(value));
      if (expireIn > 0) {
        await this.expire(redisKey, expireIn);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('closed')) {
        if (this.shouldLogClosedError()) {
          if (enviroment.isProduction()) {
            this.logger.warn('Redis connection closed, pushDataToList failed');
          } else {
            this.logger.debug(
              'Redis connection closed, pushDataToList failed',
              { error },
            );
          }
        }
      } else {
        if (enviroment.isProduction()) {
          this.logger.error('Redis pushDataToList error:', { error });
        } else {
          this.logger.debug('Redis pushDataToList error:', { error });
        }
      }
    }
  }

  async pushDatasToList(
    name: string,
    key: string,
    values: any[],
    expireIn?: number,
  ) {
    const redisKey = this.redisConfigs[name].key + key;
    const stringifiedValues = values.map((v) => JSON.stringify(v));
    expireIn = expireIn ?? this.redisConfigs[name].expireIn ?? -1;
    if (!this.isConnectionAvailable()) {
      return;
    }
    try {
      await this.redis.lpush(redisKey, ...stringifiedValues);
      if (expireIn > 0) {
        await this.expire(redisKey, expireIn);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('closed')) {
        if (this.shouldLogClosedError()) {
          if (enviroment.isProduction()) {
            this.logger.warn('Redis connection closed, pushDatasToList failed');
          } else {
            this.logger.debug(
              'Redis connection closed, pushDatasToList failed',
              { error },
            );
          }
        }
      } else {
        if (enviroment.isProduction()) {
          this.logger.error('Redis pushDatasToList error:', {
            error,
          });
        } else {
          this.logger.debug('Redis pushDatasToList error:', {
            error,
          });
        }
      }
    }
  }

  async saveData(name: string, key: string, value: any, expireIn?: number) {
    const redisKey = this.redisConfigs[name].key + key;
    expireIn = expireIn ?? this.redisConfigs[name].expireIn ?? -1;
    return await this.set(redisKey, value, { EX: expireIn });
  }

  async getData(name: string, key: string) {
    const redisKey = this.redisConfigs[name].key + key;
    return await this.get(redisKey);
  }

  async deleteData(name: string, key: string) {
    const redisKey = this.redisConfigs[name].key + key;
    return await this.del(redisKey);
  }

  async incrData(name: string, key: string) {
    const redisKey = this.redisConfigs[name].key + key;
    return await this.incr(redisKey);
  }

  async decrData(name: string, key: string) {
    const redisKey = this.redisConfigs[name].key + key;
    return await this.decr(redisKey);
  }

  async incrbyData(name: string, key: string, increment: number) {
    const redisKey = this.redisConfigs[name].key + key;
    return await this.incrby(redisKey, increment);
  }

  async decrbyData(name: string, key: string, decrement: number) {
    const redisKey = this.redisConfigs[name].key + key;
    return await this.decrby(redisKey, decrement);
  }

  async saveKeyFirstFileId(key: string, fileId: string): Promise<any> {
    return await this.saveData('fileSystemFildId', key, fileId);
  }

  async getKeyFirstFileId(key: string) {
    return await this.getData('fileSystemFildId', key);
  }

  async saveQiniuUploadAuthKey(key: string) {
    const traceID = uuidv4();
    await this.saveData('fileSystemCallbackAuth', key, traceID);
    return traceID;
  }

  async checkQiniuUploadAuthKey(
    key: string,
    authToken: string,
  ): Promise<boolean> {
    const token = await this.getData('fileSystemCallbackAuth', key);
    if (token === authToken) {
      return true;
    }
    return false;
  }

  async setShortCode(key: string, value: any) {
    return await this.saveData('shortCode', key, value);
  }

  async getShortCode(key: string) {
    return await this.getData('shortCode', key);
  }

  async saveProviderOauthNonce(
    name: string,
    state: string,
    nonce: any,
    expiresIn: number,
  ): Promise<void> {
    const redisKey = 'pardx:oauth:' + name + ':nonce-' + state;
    await this.set(redisKey, nonce, { EX: expiresIn });
  }

  async getProviderOauthNonce(name: string, state: string) {
    const redisKey = 'pardx:oauth:' + name + ':nonce-' + state;
    return await this.get(redisKey);
  }

  async deleteProviderOauthNonce(name: string, state: string) {
    const redisKey = 'pardx:oauth:' + name + ':nonce-' + state;
    await this.del(redisKey);
  }

  async saveProviderState(
    provider: string,
    state: string,
    expiresIn: number,
  ): Promise<void> {
    const redisKey = 'pardx:oauth:' + provider + ':state';
    await this.set(redisKey, state, { EX: expiresIn });
  }

  async getProviderState(provider: string, state: string) {
    const redisKey = 'pardx:oauth:' + provider + ':state';
    return await this.get(redisKey);
  }

  async deleteProviderState(provider: string) {
    const redisKey = 'pardx:oauth:' + provider + ':state';
    await this.del(redisKey);
  }

  async set(key: string, value: any, options?: { EX: number }) {
    if (!this.redisClient || !this.isConnectionAvailable()) {
      return null;
    }
    try {
      const args: [string, string, ...string[]] = [
        key,
        typeof value === 'number' ? value.toString() : JSON.stringify(value),
      ];
      if (options?.EX && options.EX > 0) {
        return await this.redisClient.set(
          key,
          args[1],
          'EX',
          options.EX.toString(),
        );
      } else {
        return await this.redisClient.set(key, args[1]);
      }
    } catch (error) {
      // Redis 连接关闭或其他错误
      if (error instanceof Error && error.message.includes('closed')) {
        if (this.shouldLogClosedError()) {
          if (enviroment.isProduction()) {
            this.logger.warn('Redis connection closed, set operation failed');
          } else {
            this.logger.debug('Redis connection closed, set operation failed', {
              error,
            });
          }
        }
      } else {
        if (enviroment.isProduction()) {
          this.logger.error('Redis set error:', { error });
        } else {
          this.logger.debug('Redis set error:', { error });
        }
      }
      return null;
    }
  }

  async get(key: string) {
    if (!this.redisClient || !this.isConnectionAvailable()) {
      return null;
    }
    try {
      const value = await this.redisClient.get(key);
      if (value === null) return null;
      if (typeof value === 'number') return value;
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    } catch (error) {
      // Redis 连接关闭或其他错误
      if (error instanceof Error && error.message.includes('closed')) {
        if (this.shouldLogClosedError()) {
          if (enviroment.isProduction()) {
            this.logger.warn('Redis connection closed, returning null');
          } else {
            this.logger.debug('Redis connection closed, returning null', {
              error,
            });
          }
        }
      } else {
        if (enviroment.isProduction()) {
          this.logger.error('Redis get error:', { error });
        } else {
          this.logger.debug('Redis get error:', { error });
        }
      }
      return null;
    }
  }

  async del(key: string) {
    if (!this.redisClient || !this.isConnectionAvailable()) {
      return null;
    }
    try {
      return await this.redisClient.del(key);
    } catch (error) {
      if (error instanceof Error && error.message.includes('closed')) {
        if (this.shouldLogClosedError()) {
          if (enviroment.isProduction()) {
            this.logger.warn('Redis connection closed, del operation failed');
          } else {
            this.logger.debug('Redis connection closed, del operation failed', {
              error,
            });
          }
        }
      } else {
        if (enviroment.isProduction()) {
          this.logger.error('Redis del error:', { error });
        } else {
          this.logger.debug('Redis del error:', { error });
        }
      }
      return null;
    }
  }

  async incr(key: string) {
    if (!this.redisClient || !this.isConnectionAvailable()) {
      return null;
    }
    try {
      return await this.redisClient.incr(key);
    } catch (error) {
      if (error instanceof Error && error.message.includes('closed')) {
        if (this.shouldLogClosedError()) {
          if (enviroment.isProduction()) {
            this.logger.warn('Redis connection closed, incr operation failed');
          } else {
            this.logger.debug(
              'Redis connection closed, incr operation failed',
              { error },
            );
          }
        }
      } else {
        if (enviroment.isProduction()) {
          this.logger.error('Redis incr error:', { error });
        } else {
          this.logger.debug('Redis incr error:', { error });
        }
      }
      return null;
    }
  }

  async incrby(key: string, increment: number) {
    if (!this.redisClient || !this.isConnectionAvailable()) {
      return null;
    }
    try {
      return await this.redisClient.incrby(key, increment);
    } catch (error) {
      if (error instanceof Error && error.message.includes('closed')) {
        if (this.shouldLogClosedError()) {
          if (enviroment.isProduction()) {
            this.logger.warn(
              'Redis connection closed, incrby operation failed',
            );
          } else {
            this.logger.debug(
              'Redis connection closed, incrby operation failed',
              { error },
            );
          }
        }
      } else {
        if (enviroment.isProduction()) {
          this.logger.error('Redis incrby error:', { error });
        } else {
          this.logger.debug('Redis incrby error:', { error });
        }
      }
      return null;
    }
  }

  async decr(key: string) {
    if (!this.redisClient || !this.isConnectionAvailable()) {
      return null;
    }
    try {
      return await this.redisClient.decr(key);
    } catch (error) {
      if (error instanceof Error && error.message.includes('closed')) {
        if (this.shouldLogClosedError()) {
          if (enviroment.isProduction()) {
            this.logger.warn('Redis connection closed, decr operation failed');
          } else {
            this.logger.debug(
              'Redis connection closed, decr operation failed',
              { error },
            );
          }
        }
      } else {
        if (enviroment.isProduction()) {
          this.logger.error('Redis decr error:', { error });
        } else {
          this.logger.debug('Redis decr error:', { error });
        }
      }
      return null;
    }
  }

  async decrby(key: string, decrement: number) {
    if (!this.redisClient || !this.isConnectionAvailable()) {
      return null;
    }
    try {
      return await this.redisClient.decrby(key, decrement);
    } catch (error) {
      if (error instanceof Error && error.message.includes('closed')) {
        if (this.shouldLogClosedError()) {
          if (enviroment.isProduction()) {
            this.logger.warn(
              'Redis connection closed, decrby operation failed',
            );
          } else {
            this.logger.debug(
              'Redis connection closed, decrby operation failed',
              { error },
            );
          }
        }
      } else {
        if (enviroment.isProduction()) {
          this.logger.error('Redis decrby error:', { error });
        } else {
          this.logger.debug('Redis decrby error:', { error });
        }
      }
      return null;
    }
  }

  async expire(key: string, seconds: number) {
    if (!this.redisClient || !this.isConnectionAvailable()) {
      return null;
    }
    try {
      return await this.redisClient.expire(key, seconds);
    } catch (error) {
      if (error instanceof Error && error.message.includes('closed')) {
        if (this.shouldLogClosedError()) {
          if (enviroment.isProduction()) {
            this.logger.warn(
              'Redis connection closed, expire operation failed',
            );
          } else {
            this.logger.debug(
              'Redis connection closed, expire operation failed',
              { error },
            );
          }
        }
      } else {
        if (enviroment.isProduction()) {
          this.logger.error('Redis expire error:', { error });
        } else {
          this.logger.debug('Redis expire error:', { error });
        }
      }
      return null;
    }
  }

  async ttl(key: string) {
    if (!this.redisClient || !this.isConnectionAvailable()) {
      return null;
    }
    try {
      return await this.redisClient.ttl(key);
    } catch (error) {
      if (error instanceof Error && error.message.includes('closed')) {
        if (this.shouldLogClosedError()) {
          if (enviroment.isProduction()) {
            this.logger.warn('Redis connection closed, ttl operation failed');
          } else {
            this.logger.debug('Redis connection closed, ttl operation failed', {
              error,
            });
          }
        }
      } else {
        if (enviroment.isProduction()) {
          this.logger.error('Redis ttl error:', { error });
        } else {
          this.logger.debug('Redis ttl error:', { error });
        }
      }
      return null;
    }
  }

  async exists(key: string) {
    if (!this.redisClient || !this.isConnectionAvailable()) {
      return null;
    }
    try {
      return await this.redisClient.exists(key);
    } catch (error) {
      if (error instanceof Error && error.message.includes('closed')) {
        if (this.shouldLogClosedError()) {
          if (enviroment.isProduction()) {
            this.logger.warn(
              'Redis connection closed, exists operation failed',
            );
          } else {
            this.logger.debug(
              'Redis connection closed, exists operation failed',
              { error },
            );
          }
        }
      } else {
        if (enviroment.isProduction()) {
          this.logger.error('Redis exists error:', { error });
        } else {
          this.logger.debug('Redis exists error:', { error });
        }
      }
      return null;
    }
  }

  /**
   * 根据模式删除键
   * 使用 SCAN 命令迭代匹配键，避免阻塞 Redis
   * @param pattern Redis 键模式 (例如: 'user:*', 'cache:*')
   * @returns 删除的键数量，失败返回 0
   */
  async deleteByPattern(pattern: string): Promise<number> {
    if (!this.redisClient || !this.isConnectionAvailable()) {
      return 0;
    }
    try {
      let cursor = '0';
      let deletedCount = 0;
      const batchSize = 100; // 每批次处理的键数量

      do {
        // 使用 SCAN 迭代，避免使用 KEYS 命令阻塞 Redis
        const [newCursor, keys] = await this.redisClient.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          batchSize,
        );
        cursor = newCursor;

        if (keys.length > 0) {
          // 批量删除匹配的键
          const deleted = await this.redisClient.del(...keys);
          deletedCount += deleted;
        }
      } while (cursor !== '0');

      if (deletedCount > 0) {
        this.logger.info(
          `Deleted ${deletedCount} keys matching pattern: ${pattern}`,
        );
      }

      return deletedCount;
    } catch (error) {
      if (error instanceof Error && error.message.includes('closed')) {
        if (this.shouldLogClosedError()) {
          if (enviroment.isProduction()) {
            this.logger.warn(
              'Redis connection closed, deleteByPattern operation failed',
            );
          } else {
            this.logger.debug(
              'Redis connection closed, deleteByPattern operation failed',
              { error },
            );
          }
        }
      } else {
        if (enviroment.isProduction()) {
          this.logger.error('Redis deleteByPattern error:', {
            error,
            pattern,
          });
        } else {
          this.logger.debug('Redis deleteByPattern error:', {
            error,
            pattern,
          });
        }
      }
      return 0;
    }
  }
}
