import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@app/prisma';
import { TransactionalServiceBase } from '@app/shared-db';
import { HandlePrismaError, DbOperationType } from '@/utils/prisma-error.util';
import { AppConfig } from '@/config/validation';
import type { Prisma, BotSkill } from '@prisma/client';

@Injectable()
export class BotSkillService extends TransactionalServiceBase {
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
    where: Prisma.BotSkillWhereInput,
    additional?: { select?: Prisma.BotSkillSelect },
  ): Promise<BotSkill | null> {
    return this.getReadClient().botSkill.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.BotSkillSelect },
  ): Promise<BotSkill | null> {
    return this.getReadClient().botSkill.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.BotSkillWhereInput,
    pagination?: {
      orderBy?: Prisma.BotSkillOrderByWithRelationInput;
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.BotSkillSelect },
  ): Promise<{ list: BotSkill[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = this.appConfig.MaxPageSize,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().botSkill.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().botSkill.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.BotSkillCreateInput,
    additional?: { select?: Prisma.BotSkillSelect },
  ): Promise<BotSkill> {
    return this.getWriteClient().botSkill.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.BotSkillWhereUniqueInput,
    data: Prisma.BotSkillUpdateInput,
    additional?: { select?: Prisma.BotSkillSelect },
  ): Promise<BotSkill> {
    return this.getWriteClient().botSkill.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.BotSkillWhereUniqueInput): Promise<BotSkill> {
    return this.getWriteClient().botSkill.delete({ where });
  }
}
