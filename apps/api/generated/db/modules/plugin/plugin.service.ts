import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@app/prisma';
import { TransactionalServiceBase } from '@app/shared-db';
import { HandlePrismaError, DbOperationType } from '@/utils/prisma-error.util';
import { AppConfig } from '@/config/validation';
import type { Prisma, Plugin } from '@prisma/client';

@Injectable()
export class PluginService extends TransactionalServiceBase {
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
    where: Prisma.PluginWhereInput,
    additional?: { select?: Prisma.PluginSelect },
  ): Promise<Plugin | null> {
    return this.getReadClient().plugin.findFirst({
      where: { ...where, isDeleted: false },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.PluginSelect },
  ): Promise<Plugin | null> {
    return this.getReadClient().plugin.findUnique({
      where: { id: id, isDeleted: false },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getBySlug(value: string, additional?: { select?: Prisma.PluginSelect }): Promise<Plugin | null> {
    return this.getReadClient().plugin.findUnique({
      where: { slug: value, isDeleted: false },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.PluginWhereInput,
    pagination?: {
      orderBy?: Prisma.PluginOrderByWithRelationInput;
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.PluginSelect },
  ): Promise<{ list: Plugin[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = this.appConfig.MaxPageSize,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().plugin.findMany({
        where: { ...where, isDeleted: false },
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().plugin.count({
        where: { ...where, isDeleted: false },
      }),
    ]);

    return { list, total, page, limit };
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.PluginCreateInput,
    additional?: { select?: Prisma.PluginSelect },
  ): Promise<Plugin> {
    return this.getWriteClient().plugin.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.PluginWhereUniqueInput,
    data: Prisma.PluginUpdateInput,
    additional?: { select?: Prisma.PluginSelect },
  ): Promise<Plugin> {
    return this.getWriteClient().plugin.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.PluginWhereUniqueInput): Promise<Plugin> {
    return this.getWriteClient().plugin.delete({ where });
  }
}
