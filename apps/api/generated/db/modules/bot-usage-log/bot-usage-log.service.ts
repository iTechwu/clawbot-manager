import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@app/prisma';
import { TransactionalServiceBase } from '@app/shared-db';
import { HandlePrismaError, DbOperationType } from '@/utils/prisma-error.util';
import { AppConfig } from '@/config/validation';
import type { Prisma, BotUsageLog } from '@prisma/client';

@Injectable()
export class BotUsageLogService extends TransactionalServiceBase {
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
    where: Prisma.BotUsageLogWhereInput,
    additional?: { select?: Prisma.BotUsageLogSelect },
  ): Promise<BotUsageLog | null> {
    return this.getReadClient().botUsageLog.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.BotUsageLogSelect },
  ): Promise<BotUsageLog | null> {
    return this.getReadClient().botUsageLog.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.BotUsageLogWhereInput,
    pagination?: {
      orderBy?: Prisma.BotUsageLogOrderByWithRelationInput;
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.BotUsageLogSelect },
  ): Promise<{ list: BotUsageLog[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = this.appConfig.MaxPageSize,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().botUsageLog.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().botUsageLog.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.BotUsageLogCreateInput,
    additional?: { select?: Prisma.BotUsageLogSelect },
  ): Promise<BotUsageLog> {
    return this.getWriteClient().botUsageLog.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.BotUsageLogWhereUniqueInput,
    data: Prisma.BotUsageLogUpdateInput,
    additional?: { select?: Prisma.BotUsageLogSelect },
  ): Promise<BotUsageLog> {
    return this.getWriteClient().botUsageLog.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.BotUsageLogWhereUniqueInput): Promise<BotUsageLog> {
    return this.getWriteClient().botUsageLog.delete({ where });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async listByBotId(
    botId: string,
    options?: { startDate?: Date; endDate?: Date },
  ): Promise<BotUsageLog[]> {
    const where: Prisma.BotUsageLogWhereInput = { botId };
    if (options?.startDate) {
      where.createdAt = { gte: options.startDate };
    }
    if (options?.endDate) {
      where.createdAt = {
        ...((where.createdAt as object) || {}),
        lte: options.endDate,
      };
    }
    return this.getReadClient().botUsageLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取路由统计信息
   * 根据 botId 和可选的模型过滤条件统计请求数据
   */
  @HandlePrismaError(DbOperationType.QUERY)
  async getRoutingStats(
    botId: string,
    options?: {
      models?: string[];
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{
    totalRequests: number;
    successCount: number;
    failureCount: number;
    avgLatencyMs: number;
    targetStats: Array<{
      model: string;
      vendor: string;
      requestCount: number;
      successCount: number;
      failureCount: number;
      avgLatencyMs: number;
      totalCost: number;
    }>;
  }> {
    const where: Prisma.BotUsageLogWhereInput = { botId };

    if (options?.models && options.models.length > 0) {
      where.model = { in: options.models };
    }
    if (options?.startDate) {
      where.createdAt = { gte: options.startDate };
    }
    if (options?.endDate) {
      where.createdAt = {
        ...((where.createdAt as object) || {}),
        lte: options.endDate,
      };
    }

    // 获取所有匹配的日志
    const logs = await this.getReadClient().botUsageLog.findMany({
      where,
      select: {
        model: true,
        vendor: true,
        statusCode: true,
        durationMs: true,
        totalCost: true,
      },
    });

    // 计算总体统计
    const totalRequests = logs.length;
    const successCount = logs.filter(
      (l) => l.statusCode && l.statusCode >= 200 && l.statusCode < 300,
    ).length;
    const failureCount = totalRequests - successCount;
    const avgLatencyMs =
      totalRequests > 0
        ? logs.reduce((sum, l) => sum + (l.durationMs || 0), 0) / totalRequests
        : 0;

    // 按模型分组统计
    const modelStats = new Map<
      string,
      {
        model: string;
        vendor: string;
        requestCount: number;
        successCount: number;
        failureCount: number;
        totalLatency: number;
        totalCost: number;
      }
    >();

    for (const log of logs) {
      const key = `${log.vendor}:${log.model || 'unknown'}`;
      const existing = modelStats.get(key) || {
        model: log.model || 'unknown',
        vendor: log.vendor,
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        totalLatency: 0,
        totalCost: 0,
      };

      existing.requestCount++;
      if (log.statusCode && log.statusCode >= 200 && log.statusCode < 300) {
        existing.successCount++;
      } else {
        existing.failureCount++;
      }
      existing.totalLatency += log.durationMs || 0;
      existing.totalCost += log.totalCost ? Number(log.totalCost) : 0;

      modelStats.set(key, existing);
    }

    const targetStats = Array.from(modelStats.values()).map((stat) => ({
      model: stat.model,
      vendor: stat.vendor,
      requestCount: stat.requestCount,
      successCount: stat.successCount,
      failureCount: stat.failureCount,
      avgLatencyMs:
        stat.requestCount > 0 ? stat.totalLatency / stat.requestCount : 0,
      totalCost: stat.totalCost,
    }));

    return {
      totalRequests,
      successCount,
      failureCount,
      avgLatencyMs,
      targetStats,
    };
  }
}
