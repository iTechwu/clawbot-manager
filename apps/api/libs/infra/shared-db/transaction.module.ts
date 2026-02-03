/**
 * Transaction Module
 * 事务模块
 */

import { Module } from '@nestjs/common';
import { UnitOfWorkService } from './unit-of-work.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UnitOfWorkService],
  exports: [UnitOfWorkService],
})
export class TransactionModule {}
