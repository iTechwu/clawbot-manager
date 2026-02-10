import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@app/prisma';
import { TransactionalServiceBase } from '@app/shared-db';
import { HandlePrismaError, DbOperationType } from '@/utils/prisma-error.util';
import { AppConfig } from '@/config/validation';
import type { Prisma, FallbackChain } from '@prisma/client';

@Injectable()
export class FallbackChainService extends TransactionalServiceBase {
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
    where: Prisma.FallbackChainWhereInput,
    additional?: { select?: Prisma.FallbackChainSelect },
  ): Promise<FallbackChain | null> {
    return this.getReadClient().fallbackChain.findFirst({
      where: { ...where, isDeleted: false },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.FallbackChainSelect },
  ): Promise<FallbackChain | null> {
    return this.getReadClient().fallbackChain.findUnique({
      where: { id: id, isDeleted: false },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getByChainId(value: string, additional?: { select?: Prisma.FallbackChainSelect }): Promise<FallbackChain | null> {
    return this.getReadClient().fallbackChain.findUnique({
      where: { chainId: value, isDeleted: false },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.FallbackChainWhereInput,
    pagination?: {
      orderBy?: Prisma.FallbackChainOrderByWithRelationInput;
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.FallbackChainSelect },
  ): Promise<{ list: FallbackChain[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = this.appConfig.MaxPageSize,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().fallbackChain.findMany({
        where: { ...where, isDeleted: false },
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().fallbackChain.count({
        where: { ...where, isDeleted: false },
      }),
    ]);

    return { list, total, page, limit };
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.FallbackChainCreateInput,
    additional?: { select?: Prisma.FallbackChainSelect },
  ): Promise<FallbackChain> {
    return this.getWriteClient().fallbackChain.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.FallbackChainWhereUniqueInput,
    data: Prisma.FallbackChainUpdateInput,
    additional?: { select?: Prisma.FallbackChainSelect },
  ): Promise<FallbackChain> {
    return this.getWriteClient().fallbackChain.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.FallbackChainWhereUniqueInput): Promise<FallbackChain> {
    return this.getWriteClient().fallbackChain.delete({ where });
  }
}
