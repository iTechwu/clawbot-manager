import { Req, Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { SimpleAuth } from '@app/auth';
import { userContract, API_VERSION } from '@repo/contracts';
import { success } from '@/common/ts-rest';
import { UserApiService } from './user-api.service';
import type { FastifyRequest } from 'fastify';

/**
 * User API Controller
 * ts-rest 版本的用户 API
 */
@Controller({ version: API_VERSION.V1 })
export class UserApiController {
  constructor(private readonly userApiService: UserApiService) {}

  /**
   * PUT /api/user/profile
   * Update user profile
   */
  @SimpleAuth()
  @TsRestHandler(userContract.updateProfile)
  async updateProfile(@Req() req: FastifyRequest): Promise<any> {
    return tsRestHandler(userContract.updateProfile, async ({ body }) => {
      const userId = (req as any).userId as string;
      const result = await this.userApiService.updateProfile(userId, body);
      return success(result);
    });
  }

  /**
   * PUT /api/user/password
   * Change user password
   */
  @SimpleAuth()
  @TsRestHandler(userContract.changePassword)
  async changePassword(@Req() req: FastifyRequest): Promise<any> {
    return tsRestHandler(userContract.changePassword, async ({ body }) => {
      const userId = (req as any).userId as string;
      const result = await this.userApiService.changePassword(userId, body);
      return success(result);
    });
  }
}
