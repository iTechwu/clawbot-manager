/**
 * Transaction Module
 * 事务模块导出
 */

export { TransactionModule } from './transaction.module';
export { UnitOfWorkService } from './unit-of-work.service';
export type { TransactionOptions } from './unit-of-work.service';
export {
  getTransactionClient,
  runInTransactionContext,
  isInTransaction,
} from './transaction-context';
export { TransactionalServiceBase } from './transactional-service.base';
