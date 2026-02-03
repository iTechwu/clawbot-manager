/**
 * Transactional Service Base
 * 事务感知服务基类
 *
 * 所有 db 服务层应该继承此基类，以支持事务上下文
 * 自动检测是否在事务中，如果在事务中则使用事务客户端，否则使用常规客户端
 *
 * 支持两种事务方式：
 * 1. @Transactional 装饰器（使用 Symbol 存储，适合单个服务内部事务）
 * 2. UnitOfWorkService（使用 AsyncLocalStorage，适合跨服务事务）
 *
 * 两种方式可以协同工作，服务层会自动检测并使用正确的事务客户端
 */

import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@app/prisma';
import {
  getTransactionClient as getAsyncTransactionClient,
  isInTransaction as isInAsyncTransaction,
} from './transaction-context';
import { getTransactionClient as getSymbolTransactionClient } from '@/decorators/transaction/transactional.decorator';

/**
 * Base class for transactional services
 * 事务感知服务基类
 */
export abstract class TransactionalServiceBase {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Get write client (transaction-aware)
   * 获取写客户端（事务感知）
   *
   * 优先使用 AsyncLocalStorage 中的事务客户端（UnitOfWorkService）
   * 其次使用 Symbol 中的事务客户端（@Transactional 装饰器）
   * 最后使用常规写客户端
   *
   * Returns transaction client if in a transaction,
   * otherwise returns regular write client.
   */
  protected getWriteClient(): PrismaClient {
    // 1. 优先检查 AsyncLocalStorage（UnitOfWorkService）
    const asyncTxClient = getAsyncTransactionClient();
    if (asyncTxClient) {
      return asyncTxClient;
    }

    // 2. 检查 Symbol（@Transactional 装饰器）
    const symbolTxClient = getSymbolTransactionClient(this);
    if (symbolTxClient) {
      return symbolTxClient;
    }

    // 3. 使用常规写客户端
    return this.prisma.write;
  }

  /**
   * Get read client
   * 获取读客户端
   *
   * Note: In transaction, read operations should also use write client
   * to ensure consistency (read-after-write)
   */
  protected getReadClient(): PrismaClient {
    // 如果在事务中，使用事务客户端以确保读取一致性
    // 如果不在事务中，使用读客户端

    // 1. 优先检查 AsyncLocalStorage（UnitOfWorkService）
    const asyncTxClient = getAsyncTransactionClient();
    if (asyncTxClient) {
      return asyncTxClient;
    }

    // 2. 检查 Symbol（@Transactional 装饰器）
    const symbolTxClient = getSymbolTransactionClient(this);
    if (symbolTxClient) {
      return symbolTxClient;
    }

    // 3. 使用常规读客户端
    return this.prisma.read;
  }

  /**
   * Check if currently in a transaction
   * 检查当前是否在事务中
   */
  protected isInTransaction(): boolean {
    // 检查 AsyncLocalStorage
    if (isInAsyncTransaction()) {
      return true;
    }

    // 检查 Symbol
    if (getSymbolTransactionClient(this)) {
      return true;
    }

    return false;
  }
}
