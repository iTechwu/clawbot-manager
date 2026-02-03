/**
 * Cache Event Handler
 *
 * 处理缓存相关事件，用于缓存失效和刷新。
 * 与 RedisService 深度融合。
 */

import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RedisService } from '@app/redis';
import { EventNames } from '../event.decorator';

/**
 * 缓存失效事件 Payload
 */
export interface CacheInvalidatedPayload {
  cacheName: string;
  cacheKey?: string;
  pattern?: string;
  reason?: string;
  timestamp: Date;
}

/**
 * 用户更新事件 Payload
 */
export interface UserUpdatedPayload {
  userId: string;
  user?: any;
  timestamp: Date;
}

/**
 * 团队成员变更事件 Payload
 */

@Injectable()
export class CacheEventHandler {
  constructor(
    private readonly redis: RedisService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * 处理通用缓存失效事件
   */
  @OnEvent(EventNames.CACHE.INVALIDATED)
  async handleCacheInvalidated(
    payload: CacheInvalidatedPayload,
  ): Promise<void> {
    try {
      if (payload.pattern) {
        // 按模式清除
        await this.invalidateByPattern(payload.cacheName, payload.pattern);
      } else if (payload.cacheKey) {
        // 按 key 清除
        await this.redis.deleteData(payload.cacheName, payload.cacheKey);
      }

      this.logger.debug('Cache invalidated via event', {
        cacheName: payload.cacheName,
        cacheKey: payload.cacheKey,
        pattern: payload.pattern,
        reason: payload.reason,
      });
    } catch (error) {
      this.logger.error('Cache invalidation error', {
        cacheName: payload.cacheName,
        error: error.message,
      });
    }
  }

  /**
   * 处理用户更新事件 - 失效用户缓存
   */
  @OnEvent(EventNames.USER.UPDATED)
  async handleUserUpdated(payload: UserUpdatedPayload): Promise<void> {
    try {
      if (payload.userId) {
        await this.redis.deleteData('userInfo', payload.userId);
        this.logger.debug('User cache invalidated', {
          userId: payload.userId,
          event: EventNames.USER.UPDATED,
        });
      }
    } catch (error) {
      this.logger.error('User cache invalidation error', {
        userId: payload.userId,
        error: error.message,
      });
    }
  }

  /**
   * 处理用户删除事件 - 失效用户缓存
   */
  @OnEvent(EventNames.USER.DELETED)
  async handleUserDeleted(payload: UserUpdatedPayload): Promise<void> {
    try {
      if (payload.userId) {
        await this.redis.deleteData('userInfo', payload.userId);
        this.logger.debug('User cache invalidated on delete', {
          userId: payload.userId,
          event: EventNames.USER.DELETED,
        });
      }
    } catch (error) {
      this.logger.error('User cache invalidation error on delete', {
        userId: payload.userId,
        error: error.message,
      });
    }
  }

  /**
   * 按模式失效缓存
   */
  private async invalidateByPattern(
    cacheName: string,
    pattern: string,
  ): Promise<void> {
    const fullPattern = this.redis.getRedisKey(cacheName, pattern);
    const keys = await this.scanKeys(fullPattern);

    if (keys.length > 0) {
      await Promise.all(keys.map((key) => this.redis.del(key)));
      this.logger.debug('Cache invalidated by pattern', {
        cacheName,
        pattern,
        count: keys.length,
      });
    }
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
