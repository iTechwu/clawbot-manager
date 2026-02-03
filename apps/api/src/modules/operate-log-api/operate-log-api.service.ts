import { Injectable } from '@nestjs/common';
import { OperateLogService } from '@app/db';
import type {
  OperateLogListQuery,
  OperateLogListResponse,
  OperateType,
  OperateTarget,
} from '@repo/contracts';
import type {
  OperateType as PrismaOperateType,
  OperateTarget as PrismaOperateTarget,
} from '@prisma/client';

/**
 * OperateLog API Service
 * 操作日志 API 服务层
 */
@Injectable()
export class OperateLogApiService {
  constructor(private readonly operateLogDb: OperateLogService) {}

  /**
   * Get user operate logs with pagination
   * 获取用户操作日志列表
   */
  async list(
    userId: string,
    query: OperateLogListQuery,
  ): Promise<OperateLogListResponse> {
    const {
      limit = 20,
      page = 1,
      operateType,
      target,
      targetId,
      startDate,
      endDate,
    } = query;

    const where: {
      userId: string;
      operateType?: PrismaOperateType;
      target?: PrismaOperateTarget;
      targetId?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = { userId };

    if (operateType) {
      where.operateType = operateType as PrismaOperateType;
    }
    if (target) {
      where.target = target as PrismaOperateTarget;
    }
    if (targetId) {
      where.targetId = targetId;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const { list, total } = await this.operateLogDb.list(
      where,
      { limit, page },
      {
        select: {
          id: true,
          userId: true,
          operateType: true,
          target: true,
          targetId: true,
          targetName: true,
          detail: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              nickname: true,
              avatarFileId: true,
            },
          },
        },
      },
    );

    // Prisma 类型默认不包含关联字段，这里进行显式类型扩展
    type OperateLogWithUser = {
      id: string;
      userId: string;
      operateType: PrismaOperateType;
      target: PrismaOperateTarget;
      targetId: string | null;
      targetName: string | null;
      detail: unknown;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: Date;
      user?: {
        id: string;
        nickname: string | null;
        avatarFileId: string | null;
      } | null;
    };

    const typedList = list as OperateLogWithUser[];

    return {
      list: typedList.map((item) => ({
        id: item.id,
        userId: item.userId,
        operateType: item.operateType as OperateType,
        target: item.target as OperateTarget,
        targetId: item.targetId ?? undefined,
        targetName: item.targetName ?? undefined,
        detail: item.detail ?? undefined,
        ipAddress: item.ipAddress ?? undefined,
        userAgent: item.userAgent ?? undefined,
        createdAt: item.createdAt,
        user: item.user
          ? {
              id: item.user.id,
              nickname: item.user.nickname,
              avatarFileId: item.user.avatarFileId ?? undefined,
            }
          : undefined,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Log an operation
   * 记录操作日志
   */
  async logOperation(data: {
    userId: string;
    operateType: OperateType;
    target: OperateTarget;
    targetId?: string;
    targetName?: string;
    detail?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.operateLogDb.create({
      user: { connect: { id: data.userId } },
      operateType: data.operateType as PrismaOperateType,
      target: data.target as PrismaOperateTarget,
      targetId: data.targetId,
      targetName: data.targetName,
      detail: data.detail,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  }
}
