import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@app/prisma';
import { TransactionalServiceBase } from '@app/shared-db';
import { HandlePrismaError, DbOperationType } from '@/utils/prisma-error.util';
import { AppConfig } from '@/config/validation';
import type { Prisma, BotPlugin } from '@prisma/client';

@Injectable()
export class BotPluginService extends TransactionalServiceBase {
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
    where: Prisma.BotPluginWhereInput,
    additional?: { select?: Prisma.BotPluginSelect },
  ): Promise<BotPlugin | null> {
    return this.getReadClient().botPlugin.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.BotPluginSelect },
  ): Promise<BotPlugin | null> {
    return this.getReadClient().botPlugin.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.BotPluginWhereInput,
    pagination?: {
      orderBy?: Prisma.BotPluginOrderByWithRelationInput;
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.BotPluginSelect },
  ): Promise<{ list: BotPlugin[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = this.appConfig.MaxPageSize,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().botPlugin.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().botPlugin.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.BotPluginCreateInput,
    additional?: { select?: Prisma.BotPluginSelect },
  ): Promise<BotPlugin> {
    return this.getWriteClient().botPlugin.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.BotPluginWhereUniqueInput,
    data: Prisma.BotPluginUpdateInput,
    additional?: { select?: Prisma.BotPluginSelect },
  ): Promise<BotPlugin> {
    return this.getWriteClient().botPlugin.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.BotPluginWhereUniqueInput): Promise<BotPlugin> {
    return this.getWriteClient().botPlugin.delete({ where });
  }
}
