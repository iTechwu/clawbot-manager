import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@app/prisma';
import { TransactionalServiceBase } from '@app/shared-db';
import { HandlePrismaError, DbOperationType } from '@/utils/prisma-error.util';
import { AppConfig } from '@/config/validation';
import type { Prisma, BotModelRouting } from '@prisma/client';

@Injectable()
export class BotModelRoutingService extends TransactionalServiceBase {
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
    where: Prisma.BotModelRoutingWhereInput,
    additional?: { select?: Prisma.BotModelRoutingSelect },
  ): Promise<BotModelRouting | null> {
    return this.getReadClient().botModelRouting.findFirst({
      where: { ...where, isDeleted: false },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.BotModelRoutingSelect },
  ): Promise<BotModelRouting | null> {
    return this.getReadClient().botModelRouting.findUnique({
      where: { id: id, isDeleted: false },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.BotModelRoutingWhereInput,
    pagination?: {
      orderBy?: Prisma.BotModelRoutingOrderByWithRelationInput;
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.BotModelRoutingSelect },
  ): Promise<{
    list: BotModelRouting[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = this.appConfig.MaxPageSize,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().botModelRouting.findMany({
        where: { ...where, isDeleted: false },
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().botModelRouting.count({
        where: { ...where, isDeleted: false },
      }),
    ]);

    return { list, total, page, limit };
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.BotModelRoutingCreateInput,
    additional?: { select?: Prisma.BotModelRoutingSelect },
  ): Promise<BotModelRouting> {
    return this.getWriteClient().botModelRouting.create({
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.BotModelRoutingWhereUniqueInput,
    data: Prisma.BotModelRoutingUpdateInput,
    additional?: { select?: Prisma.BotModelRoutingSelect },
  ): Promise<BotModelRouting> {
    return this.getWriteClient().botModelRouting.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(
    where: Prisma.BotModelRoutingWhereUniqueInput,
  ): Promise<BotModelRouting> {
    return this.getWriteClient().botModelRouting.delete({ where });
  }
}
