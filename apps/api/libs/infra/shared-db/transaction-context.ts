/**
 * Transaction Context
 * 事务上下文管理
 *
 * 使用 AsyncLocalStorage 在调用链中传递事务客户端
 * 让 db 服务层能够自动感知当前是否在事务中
 */

import { AsyncLocalStorage } from 'async_hooks';
import { PrismaClient } from '@prisma/client';

/**
 * Transaction context storage
 * 事务上下文存储
 */
const transactionContext = new AsyncLocalStorage<PrismaClient>();

/**
 * Get current transaction client if in a transaction
 * 获取当前事务客户端（如果在事务中）
 *
 * @returns Transaction client or undefined
 */
export function getTransactionClient(): PrismaClient | undefined {
  return transactionContext.getStore();
}

/**
 * Run callback with transaction context
 * 在事务上下文中运行回调
 *
 * @param tx - Transaction client
 * @param callback - Callback function
 * @returns Result of callback
 */
export async function runInTransactionContext<T>(
  tx: PrismaClient,
  callback: () => Promise<T>,
): Promise<T> {
  return transactionContext.run(tx, callback);
}

/**
 * Check if currently in a transaction
 * 检查当前是否在事务中
 *
 * @returns True if in transaction
 */
export function isInTransaction(): boolean {
  return transactionContext.getStore() !== undefined;
}
