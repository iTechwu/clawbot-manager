/**
 * Cache Interceptor
 *
 * 拦截器实现，处理 @Cacheable, @CacheEvict, @CachePut 装饰器的缓存逻辑。
 * 与 RedisService 深度融合，使用 config.local.yaml 中的 redis 配置。
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, from } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import { RedisService } from '@app/redis';
import {
  CACHE_METADATA_KEY,
  CACHE_EVICT_METADATA_KEY,
  CACHE_PUT_METADATA_KEY,
  CacheOptions,
  CacheEvictOptions,
  defaultKeyGenerator,
} from './cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();

    // 检查是否有缓存元数据
    const cacheOptions = this.reflector.get<CacheOptions>(
      CACHE_METADATA_KEY,
      handler,
    );
    const evictOptions = this.reflector.get<CacheEvictOptions>(
      CACHE_EVICT_METADATA_KEY,
      handler,
    );
    const putOptions = this.reflector.get<CacheOptions>(
      CACHE_PUT_METADATA_KEY,
      handler,
    );

    // 获取方法参数
    const args = context.getArgs();

    // 处理 @CacheEvict (beforeInvocation)
    if (evictOptions?.beforeInvocation) {
      this.evictCache(evictOptions, args);
    }

    // 处理 @Cacheable
    if (cacheOptions) {
      return this.handleCacheable(cacheOptions, args, next);
    }

    // 处理 @CachePut
    if (putOptions) {
      return this.handleCachePut(putOptions, args, next);
    }

    // 处理 @CacheEvict (afterInvocation)
    if (evictOptions && !evictOptions.beforeInvocation) {
      return next.handle().pipe(
        tap(() => {
          this.evictCache(evictOptions, args);
        }),
      );
    }

    return next.handle();
  }

  /**
   * 处理 @Cacheable 逻辑
   */
  private handleCacheable(
    options: CacheOptions,
    args: any[],
    next: CallHandler,
  ): Observable<any> {
    const cacheKey = this.generateCacheKey(options, args);

    return from(this.redis.getData(options.cacheName, cacheKey)).pipe(
      switchMap((cachedValue) => {
        if (cachedValue !== null && cachedValue !== undefined) {
          this.logger.debug('Cache hit', {
            cacheName: options.cacheName,
            cacheKey,
          });
          return of(cachedValue);
        }

        this.logger.debug('Cache miss', {
          cacheName: options.cacheName,
          cacheKey,
        });

        return next.handle().pipe(
          tap((result) => {
            // 检查条件
            const shouldCache = options.condition
              ? options.condition(result)
              : result !== null && result !== undefined;

            if (shouldCache) {
              this.redis
                .saveData(options.cacheName, cacheKey, result, options.ttl)
                .catch((err) => {
                  this.logger.error('Cache save error', {
                    cacheName: options.cacheName,
                    cacheKey,
                    error: err.message,
                  });
                });
            }
          }),
        );
      }),
    );
  }

  /**
   * 处理 @CachePut 逻辑
   */
  private handleCachePut(
    options: CacheOptions,
    args: any[],
    next: CallHandler,
  ): Observable<any> {
    const cacheKey = this.generateCacheKey(options, args);

    return next.handle().pipe(
      tap((result) => {
        const shouldCache = options.condition
          ? options.condition(result)
          : result !== null && result !== undefined;

        if (shouldCache) {
          this.redis
            .saveData(options.cacheName, cacheKey, result, options.ttl)
            .catch((err) => {
              this.logger.error('Cache put error', {
                cacheName: options.cacheName,
                cacheKey,
                error: err.message,
              });
            });
        }
      }),
    );
  }

  /**
   * 执行缓存失效
   */
  private async evictCache(
    options: CacheEvictOptions,
    args: any[],
  ): Promise<void> {
    try {
      if (options.allEntries) {
        // 清除所有匹配 cacheName 的缓存
        const pattern = this.redis.getRedisKey(options.cacheName, '*');
        const keys = await this.scanKeys(pattern);
        if (keys.length > 0) {
          await Promise.all(keys.map((key) => this.redis.del(key)));
          this.logger.debug('Cache evicted (all entries)', {
            cacheName: options.cacheName,
            count: keys.length,
          });
        }
      } else if (options.evictByPrefix) {
        // 使用前缀模式清除缓存
        // 生成的 key 作为前缀，清除所有以该前缀开头的缓存
        const keyPrefix = this.generateEvictKey(options, args);
        const pattern = this.redis.getRedisKey(
          options.cacheName,
          `${keyPrefix}*`,
        );
        const keys = await this.scanKeys(pattern);

        if (keys.length > 0) {
          await Promise.all(keys.map((key) => this.redis.del(key)));
          this.logger.debug('Cache evicted (by prefix)', {
            cacheName: options.cacheName,
            keyPrefix,
            pattern,
            count: keys.length,
          });
        } else {
          // 即使没有找到带后缀的 key，也尝试删除精确匹配的 key
          await this.redis.deleteData(options.cacheName, keyPrefix);
          this.logger.debug(
            'Cache evicted (exact match, no prefix entries found)',
            {
              cacheName: options.cacheName,
              cacheKey: keyPrefix,
            },
          );
        }
      } else {
        // 精确匹配删除
        const cacheKey = this.generateEvictKey(options, args);
        await this.redis.deleteData(options.cacheName, cacheKey);
        this.logger.debug('Cache evicted', {
          cacheName: options.cacheName,
          cacheKey,
        });
      }
    } catch (err) {
      this.logger.error('Cache evict error', {
        cacheName: options.cacheName,
        error: err.message,
      });
    }
  }

  /**
   * 生成缓存 key
   */
  private generateCacheKey(options: CacheOptions, args: any[]): string {
    const keyGenerator = options.keyGenerator || defaultKeyGenerator;
    return keyGenerator(...args);
  }

  /**
   * 生成失效缓存 key
   */
  private generateEvictKey(options: CacheEvictOptions, args: any[]): string {
    const keyGenerator = options.keyGenerator || defaultKeyGenerator;
    return keyGenerator(...args);
  }

  /**
   * 扫描匹配 pattern 的所有 keys
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const result = await this.redis.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');

    return keys;
  }
}
