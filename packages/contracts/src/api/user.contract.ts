import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { ApiResponseSchema } from '../base';
import { UserErrorCode } from '../errors/domains/user.errors';
import { createTypedErrorResponse } from '../errors/error-response';
import {
  UserCheckResponseSchema,
  UserAccountBaseSchema,
  UserContactResponseSchema,
  UpdateUserProfileSchema,
  UpdateUserProfileResponseSchema,
  ChangePasswordSchema,
  ChangePasswordResponseSchema,
} from '../schemas/user.schema';

const c = initContract();

/**
 * User API Contract
 */
export const userContract = c.router(
  {
    // GET /user/check - Check user info (userId)
    check: {
      method: 'GET',
      path: '/check',
      responses: {
        200: ApiResponseSchema(UserCheckResponseSchema),
        401: createTypedErrorResponse([UserErrorCode.UserNotFound] as const),
      },
      summary: 'Check user info (userId)',
    },

    // GET /user/info - Get user account info
    getInfo: {
      method: 'GET',
      path: '/info',
      responses: {
        200: ApiResponseSchema(UserAccountBaseSchema),
        401: createTypedErrorResponse([UserErrorCode.UserNotFound] as const),
      },
      summary: 'Get user account info',
    },

    // GET /user/contact/:userId - Get user contact info
    getContact: {
      method: 'GET',
      path: '/contact/:userId',
      pathParams: z.object({
        userId: z.string().uuid(),
      }),
      responses: {
        200: ApiResponseSchema(UserContactResponseSchema),
        400: createTypedErrorResponse([UserErrorCode.UserNotFound] as const),
      },
      summary: 'Get user contact info by userId',
    },

    // PUT /user/profile - Update user profile
    updateProfile: {
      method: 'PUT',
      path: '/profile',
      body: UpdateUserProfileSchema,
      responses: {
        200: ApiResponseSchema(UpdateUserProfileResponseSchema),
        401: createTypedErrorResponse([UserErrorCode.UserNotFound] as const),
      },
      summary: 'Update user profile (nickname, avatar)',
    },

    // PUT /user/password - Change password
    changePassword: {
      method: 'PUT',
      path: '/password',
      body: ChangePasswordSchema,
      responses: {
        200: ApiResponseSchema(ChangePasswordResponseSchema),
        400: createTypedErrorResponse([UserErrorCode.InvalidPassword] as const),
        401: createTypedErrorResponse([UserErrorCode.UserNotFound] as const),
      },
      summary: 'Change user password',
    },
  },
  {
    pathPrefix: '/user',
  },
);

export type UserContract = typeof userContract;
