import { Req, Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { SimpleAuth } from '@app/auth';
import { operateLogContract, API_VERSION } from '@repo/contracts';
import { success } from '@/common/ts-rest';
import { OperateLogApiService } from './operate-log-api.service';
import type { FastifyRequest } from 'fastify';

/**
 * OperateLog API Controller
 * 操作日志 API 控制器
 */
@Controller({ version: API_VERSION.V1 })
export class OperateLogApiController {
  constructor(private readonly operateLogApiService: OperateLogApiService) {}

  /**
   * GET /api/operate-log/operate-logs
   * Get user operate logs
   */
  @SimpleAuth()
  @TsRestHandler(operateLogContract.list)
  async list(@Req() req: FastifyRequest): Promise<any> {
    return tsRestHandler(operateLogContract.list, async ({ query }) => {
      const userId = (req as any).userId as string;
      const result = await this.operateLogApiService.list(userId, query);
      return success(result);
    });
  }
}
