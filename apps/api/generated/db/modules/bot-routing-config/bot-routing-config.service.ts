import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@app/prisma';
import { TransactionalServiceBase } from '@app/shared-db';
import { HandlePrismaError, DbOperationType } from '@/utils/prisma-error.util';
import { AppConfig } from '@/config/validation';
import type { Prisma, BotRoutingConfig } from '@prisma/client';

@Injectable()
export class BotRoutingConfigService extends TransactionalServiceBase {
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
    where: Prisma.BotRoutingConfigWhereInput,
    additional?: { select?: Prisma.BotRoutingConfigSelect },
  ): Promise<BotRoutingConfig | null> {
    return this.getReadClient().botRoutingConfig.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.BotRoutingConfigSelect },
  ): Promise<BotRoutingConfig | null> {
    return this.getReadClient().botRoutingConfig.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getByBotId(value: string, additional?: { select?: Prisma.BotRoutingConfigSelect }): Promise<BotRoutingConfig | null> {
    return this.getReadClient().botRoutingConfig.findUnique({
      where: { botId: value },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.BotRoutingConfigWhereInput,
    pagination?: {
      orderBy?: Prisma.BotRoutingConfigOrderByWithRelationInput;
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.BotRoutingConfigSelect },
  ): Promise<{ list: BotRoutingConfig[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = this.appConfig.MaxPageSize,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().botRoutingConfig.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().botRoutingConfig.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.BotRoutingConfigCreateInput,
    additional?: { select?: Prisma.BotRoutingConfigSelect },
  ): Promise<BotRoutingConfig> {
    return this.getWriteClient().botRoutingConfig.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.BotRoutingConfigWhereUniqueInput,
    data: Prisma.BotRoutingConfigUpdateInput,
    additional?: { select?: Prisma.BotRoutingConfigSelect },
  ): Promise<BotRoutingConfig> {
    return this.getWriteClient().botRoutingConfig.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.BotRoutingConfigWhereUniqueInput): Promise<BotRoutingConfig> {
    return this.getWriteClient().botRoutingConfig.delete({ where });
  }
}
