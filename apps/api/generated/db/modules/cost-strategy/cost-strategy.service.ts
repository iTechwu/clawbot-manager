import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@app/prisma';
import { TransactionalServiceBase } from '@app/shared-db';
import { HandlePrismaError, DbOperationType } from '@/utils/prisma-error.util';
import { AppConfig } from '@/config/validation';
import type { Prisma, CostStrategy } from '@prisma/client';

@Injectable()
export class CostStrategyService extends TransactionalServiceBase {
  private appConfig: AppConfig;

  constructor(
    prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    super(prisma);
    this.appConfig = config.getOrThrow<AppConfig>('app');
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.CostStrategyWhereInput,
    additional?: { select?: Prisma.CostStrategySelect },
  ): Promise<CostStrategy | null> {
    return this.getReadClient().costStrategy.findFirst({
      where: { ...where, isDeleted: false },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.CostStrategySelect },
  ): Promise<CostStrategy | null> {
    return this.getReadClient().costStrategy.findUnique({
      where: { id: id, isDeleted: false },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getByStrategyId(value: string, additional?: { select?: Prisma.CostStrategySelect }): Promise<CostStrategy | null> {
    return this.getReadClient().costStrategy.findUnique({
      where: { strategyId: value, isDeleted: false },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.CostStrategyWhereInput,
    pagination?: {
      orderBy?: Prisma.CostStrategyOrderByWithRelationInput;
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.CostStrategySelect },
  ): Promise<{ list: CostStrategy[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = this.appConfig.MaxPageSize,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().costStrategy.findMany({
        where: { ...where, isDeleted: false },
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().costStrategy.count({
        where: { ...where, isDeleted: false },
      }),
    ]);

    return { list, total, page, limit };
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.CostStrategyCreateInput,
    additional?: { select?: Prisma.CostStrategySelect },
  ): Promise<CostStrategy> {
    return this.getWriteClient().costStrategy.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.CostStrategyWhereUniqueInput,
    data: Prisma.CostStrategyUpdateInput,
    additional?: { select?: Prisma.CostStrategySelect },
  ): Promise<CostStrategy> {
    return this.getWriteClient().costStrategy.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.CostStrategyWhereUniqueInput): Promise<CostStrategy> {
    return this.getWriteClient().costStrategy.delete({ where });
  }
}
