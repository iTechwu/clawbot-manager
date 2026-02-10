import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@app/prisma';
import { TransactionalServiceBase } from '@app/shared-db';
import { HandlePrismaError, DbOperationType } from '@/utils/prisma-error.util';
import { AppConfig } from '@/config/validation';
import type { Prisma, CapabilityTag } from '@prisma/client';

@Injectable()
export class CapabilityTagService extends TransactionalServiceBase {
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
    where: Prisma.CapabilityTagWhereInput,
    additional?: { select?: Prisma.CapabilityTagSelect },
  ): Promise<CapabilityTag | null> {
    return this.getReadClient().capabilityTag.findFirst({
      where: { ...where, isDeleted: false },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.CapabilityTagSelect },
  ): Promise<CapabilityTag | null> {
    return this.getReadClient().capabilityTag.findUnique({
      where: { id: id, isDeleted: false },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getByTagId(value: string, additional?: { select?: Prisma.CapabilityTagSelect }): Promise<CapabilityTag | null> {
    return this.getReadClient().capabilityTag.findUnique({
      where: { tagId: value, isDeleted: false },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.CapabilityTagWhereInput,
    pagination?: {
      orderBy?: Prisma.CapabilityTagOrderByWithRelationInput;
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.CapabilityTagSelect },
  ): Promise<{ list: CapabilityTag[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = this.appConfig.MaxPageSize,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().capabilityTag.findMany({
        where: { ...where, isDeleted: false },
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().capabilityTag.count({
        where: { ...where, isDeleted: false },
      }),
    ]);

    return { list, total, page, limit };
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.CapabilityTagCreateInput,
    additional?: { select?: Prisma.CapabilityTagSelect },
  ): Promise<CapabilityTag> {
    return this.getWriteClient().capabilityTag.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.CapabilityTagWhereUniqueInput,
    data: Prisma.CapabilityTagUpdateInput,
    additional?: { select?: Prisma.CapabilityTagSelect },
  ): Promise<CapabilityTag> {
    return this.getWriteClient().capabilityTag.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.CapabilityTagWhereUniqueInput): Promise<CapabilityTag> {
    return this.getWriteClient().capabilityTag.delete({ where });
  }
}
