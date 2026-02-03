import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { ApiResponseSchema, SuccessResponseSchema } from '../base';
import {
  SendVerifyEmailRequestSchema,
  SettingAccountRequestSchema,
  SetPasswordRequestSchema,
  BrandSchema,
  BrandSettingRequestSchema,
  UsageResponseSchema,
  EmailVerifyRequestSchema,
  MobileLoginRequestSchema,
  UpdateAvatarRequestSchema,
} from '../schemas/setting.schema';
import { UserAccountBaseSchema } from '../schemas/user.schema';
import { LoginSuccessSchema, UserInfoSchema } from '../schemas/sign.schema';

const c = initContract();

/**
 * Setting API Contract
 */
export const settingContract = c.router(
  {
    // POST /settings/send-verify-email - Send verify email
    sendVerifyEmail: {
      method: 'POST',
      path: '/send-verify-email',
      body: SendVerifyEmailRequestSchema,
      responses: {
        200: ApiResponseSchema(SuccessResponseSchema),
      },
      summary: 'Send verify email',
    },

    // POST /settings/account - Save account info
    saveAccount: {
      method: 'POST',
      path: '/account',
      body: SettingAccountRequestSchema,
      responses: {
        200: ApiResponseSchema(UserInfoSchema),
      },
      summary: 'Save account info',
    },

    // POST /settings/password - Set password (first time)
    setPassword: {
      method: 'POST',
      path: '/password',
      body: SetPasswordRequestSchema,
      responses: {
        200: ApiResponseSchema(UserAccountBaseSchema),
      },
      summary: 'Set password (first time)',
    },

    // GET /settings/brand - Get branding info
    getBranding: {
      method: 'GET',
      path: '/brand',
      responses: {
        200: ApiResponseSchema(BrandSchema),
      },
      summary: 'Get branding info',
    },

    // POST /settings/brand - Save branding
    saveBranding: {
      method: 'POST',
      path: '/brand',
      body: BrandSettingRequestSchema,
      responses: {
        200: ApiResponseSchema(BrandSchema),
      },
      summary: 'Save branding',
    },

    // GET /settings/usage - Get usage info
    getUsage: {
      method: 'GET',
      path: '/usage',
      responses: {
        200: ApiResponseSchema(UsageResponseSchema),
      },
      summary: 'Get usage info',
    },

    // POST /settings/email/bind - Bind email
    bindEmail: {
      method: 'POST',
      path: '/email/bind',
      body: EmailVerifyRequestSchema,
      responses: {
        200: ApiResponseSchema(LoginSuccessSchema),
      },
      summary: 'Bind email account',
    },

    // POST /settings/phone/bind - Bind phone
    bindPhone: {
      method: 'POST',
      path: '/phone/bind',
      body: MobileLoginRequestSchema,
      responses: {
        200: ApiResponseSchema(LoginSuccessSchema),
      },
      summary: 'Bind phone number',
    },

    // POST /settings/avatar - Update avatar
    updateAvatar: {
      method: 'POST',
      path: '/avatar',
      body: UpdateAvatarRequestSchema,
      responses: {
        200: ApiResponseSchema(UserAccountBaseSchema),
      },
      summary: 'Update user avatar',
    },
  },
  {
    pathPrefix: '/settings',
  },
);

export type SettingContract = typeof settingContract;
