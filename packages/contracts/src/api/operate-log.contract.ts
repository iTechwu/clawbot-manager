/**
 * OperateLog API Contract
 * 操作日志 API 契约定义
 */

import { initContract } from '@ts-rest/core';
import { createApiResponse } from '../base';
import {
  OperateLogListQuerySchema,
  OperateLogListResponseSchema,
} from '../schemas/operate-log.schema';

const c = initContract();

export const operateLogContract = c.router(
  {
    /**
     * 获取操作日志列表
     * GET /operate-logs
     */
    list: {
      method: 'GET',
      path: '/operate-logs',
      query: OperateLogListQuerySchema,
      responses: {
        200: createApiResponse(OperateLogListResponseSchema),
      },
      summary: '获取操作日志列表',
      description: '查询当前用户的操作日志，支持按操作类型、目标类型、时间范围过滤',
    },
  },
  {
    pathPrefix: '/operate-log',
  },
);

export type OperateLogContract = typeof operateLogContract;
