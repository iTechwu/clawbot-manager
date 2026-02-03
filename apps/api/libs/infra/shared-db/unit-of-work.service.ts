/**
 * Unit of Work Service
 * 工作单元服务 - 统一管理跨服务事务
 *
 * 职责：
 * 1. 提供统一的事务管理接口
 * 2. 支持跨多个 db 服务的事务操作
 * 3. 自动处理事务的提交和回滚
 * 4. 支持嵌套事务检测
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class SignService {
 *   constructor(
 *     private readonly uow: UnitOfWorkService,
 *     private readonly userService: UserService,
 *   ) {}
 *
 *   async createAccount(data: CreateAccountDto) {
 *     return await this.uow.execute(async () => {
 *       // 在事务中调用服务层方法，服务层会自动使用事务客户端
 *       const user = await this.userService.createUser(data);
 *       return { user };
 *     });
 *   }
 * }
 * ```
 */

import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@app/prisma';
import { runInTransactionContext } from './transaction-context';

/**
 * Transaction options
 * 事务选项
 */
export interface TransactionOptions {
  maxWait?: number;
  timeout?: number;
  isolationLevel?:
    | 'ReadUncommitted'
    | 'ReadCommitted'
    | 'RepeatableRead'
    | 'Serializable';
}

/**
 * Unit of Work Service
 * 工作单元服务
 */
@Injectable()
export class UnitOfWorkService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute a callback within a transaction
   * 在事务中执行回调
   *
   * 使用 AsyncLocalStorage 在调用链中传递事务客户端
   * db 服务层会自动检测并使用事务客户端
   *
   * @param callback - Callback function (no need to pass tx parameter)
   * @param options - Transaction options
   * @returns Result of the callback
   */
  async execute<T>(
    callback: () => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    return await this.prisma.write.$transaction(async (tx) => {
      // 在事务上下文中运行回调
      // db 服务层会自动通过 getTransactionClient() 获取事务客户端
      return await runInTransactionContext(
        tx as unknown as PrismaClient,
        callback,
      );
    }, options);
  }

  /**
   * Execute with retry on deadlock/conflict
   * 在死锁/冲突时重试执行
   *
   * @param callback - Callback function
   * @param options - Transaction options with retry config
   * @returns Result of the callback
   */
  async executeWithRetry<T>(
    callback: () => Promise<T>,
    options?: TransactionOptions & {
      maxRetries?: number;
      retryDelay?: number;
    },
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? 3;
    const retryDelay = options?.retryDelay ?? 100;
    const { maxRetries: _, retryDelay: __, ...txOptions } = options || {};

    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.execute(callback, txOptions);
      } catch (error) {
        lastError = error as Error;
        if (this.isRetryableError(error) && attempt < maxRetries) {
          await this.sleep(retryDelay * Math.pow(2, attempt));
          continue;
        }
        throw error;
      }
    }
    throw lastError || new Error('Transaction failed after max retries');
  }

  /**
   * Check if error is retryable
   * 检查错误是否可重试
   */
  private isRetryableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    const prismaCode = (error as { code?: string }).code;
    const retryableCodes = ['P2034', 'P2028', '40001', '40P01'];
    if (prismaCode && retryableCodes.includes(prismaCode)) {
      return true;
    }

    const message = (error as { message?: string }).message || '';
    return retryableCodes.some((code) => message.includes(code));
  }

  /**
   * Sleep for specified milliseconds
   * 睡眠指定毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
