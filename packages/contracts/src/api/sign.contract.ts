import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  ApiResponseSchema,
  SuccessResponseSchema,
  withVersion,
  API_VERSION,
} from '../base';
import {
  EmailLoginSchema,
  MobilePasswordLoginSchema,
  MobileCodeLoginSchema,
  EmailRegisterSchema,
  MobileRegisterSchema,
  EmailVerifySchema,
  MobileVerifySchema,
  SendCodeSchema,
  SendEmailCodeSchema,
  LoginSuccessSchema,
  EmailAccountSchema,
  MobileAccountSchema,
  SignOutSuccessSchema,
} from '../schemas/sign.schema';

const c = initContract();

/**
 * Sign/Auth API Contract
 * 登录认证相关的 API 契约定义
 *
 * 基于 apps/api/src/modules/sign-api/sign-api.controller.ts
 */
export const signContract = c.router(
  {
    // ============================================================================
    // 登录接口
    // ============================================================================

    /**
     * POST /sign/in/email - Email 登录
     */
    loginByEmail: {
      method: 'POST',
      path: '/in/email',
      body: EmailLoginSchema,
      responses: {
        200: ApiResponseSchema(LoginSuccessSchema),
      },
      summary: '邮箱登录',
    },

    /**
     * POST /sign/in/mobile/password - 手机号密码登录
     */
    loginByMobilePassword: {
      method: 'POST',
      path: '/in/mobile/password',
      body: MobilePasswordLoginSchema,
      responses: {
        200: ApiResponseSchema(LoginSuccessSchema),
      },
      summary: '手机号密码登录',
    },

    /**
     * POST /sign/in/phone - 手机号验证码登录
     */
    loginByMobileCode: {
      method: 'POST',
      path: '/in/phone',
      body: MobileCodeLoginSchema,
      responses: {
        200: ApiResponseSchema(LoginSuccessSchema),
      },
      summary: '手机号验证码登录',
    },

    /**
     * GET /sign/in/device - 设备登录（匿名用户）
     */
    loginByDevice: {
      method: 'GET',
      path: '/in/device',
      responses: {
        200: ApiResponseSchema(LoginSuccessSchema),
      },
      summary: '设备登录（创建匿名用户）',
    },

    // ============================================================================
    // 注册接口
    // ============================================================================

    /**
     * POST /sign/up/email - Email 注册
     */
    registerByEmail: {
      method: 'POST',
      path: '/up/email',
      body: EmailRegisterSchema,
      responses: {
        200: ApiResponseSchema(LoginSuccessSchema),
      },
      summary: '邮箱注册',
    },

    /**
     * POST /sign/up/mobile - 手机号注册
     */
    registerByMobile: {
      method: 'POST',
      path: '/up/mobile',
      body: MobileRegisterSchema,
      responses: {
        200: ApiResponseSchema(LoginSuccessSchema),
      },
      summary: '手机号注册',
    },

    // ============================================================================
    // Token 刷新
    // ============================================================================

    /**
     * GET /sign/refresh/token - 刷新 Token
     */
    refreshToken: {
      method: 'GET',
      path: '/refresh/token',
      query: z.object({
        refresh: z.string(),
      }),
      responses: {
        200: ApiResponseSchema(LoginSuccessSchema),
      },
      summary: '刷新 Token',
    },

    /**
     * GET /sign/in/cookie - 通过 Cookie 刷新 Token
     */
    refreshByCookie: {
      method: 'GET',
      path: '/in/cookie',
      query: z.object({
        refresh: z.string(),
      }),
      responses: {
        200: ApiResponseSchema(LoginSuccessSchema),
      },
      summary: '通过 Cookie 刷新 Token',
    },

    // ============================================================================
    // 验证接口
    // ============================================================================

    /**
     * POST /sign/verify/email - 邮箱验证码校验
     */
    verifyEmail: {
      method: 'POST',
      path: '/verify/email',
      body: EmailVerifySchema,
      responses: {
        200: ApiResponseSchema(LoginSuccessSchema),
      },
      summary: '邮箱验证码校验',
    },

    /**
     * POST /sign/verify/mobile - 手机号验证码校验
     */
    verifyMobile: {
      method: 'POST',
      path: '/verify/mobile',
      body: MobileVerifySchema,
      responses: {
        200: ApiResponseSchema(LoginSuccessSchema),
      },
      summary: '手机号验证码校验',
    },

    // ============================================================================
    // 发送验证码
    // ============================================================================

    /**
     * POST /sign/send/verifyemail - 发送邮箱验证码
     */
    sendEmailCode: {
      method: 'POST',
      path: '/send/verifyemail',
      body: SendEmailCodeSchema,
      responses: {
        200: ApiResponseSchema(SuccessResponseSchema),
      },
      summary: '发送邮箱验证码',
    },

    /**
     * POST /sign/send/code/mobile - 发送手机注册验证码
     */
    sendMobileRegisterCode: {
      method: 'POST',
      path: '/send/code/mobile',
      body: SendCodeSchema,
      responses: {
        200: ApiResponseSchema(SuccessResponseSchema),
      },
      summary: '发送手机注册验证码',
    },

    /**
     * POST /sign/send/code/mobile/login - 发送手机登录验证码
     */
    sendMobileLoginCode: {
      method: 'POST',
      path: '/send/code/mobile/login',
      body: SendCodeSchema,
      responses: {
        200: ApiResponseSchema(SuccessResponseSchema),
      },
      summary: '发送手机登录验证码',
    },

    // ============================================================================
    // 登出接口
    // ============================================================================

    /**
     * POST /sign/out - 登出
     */
    signOut: {
      method: 'POST',
      path: '/out',
      body: z.object({}).optional(),
      responses: {
        200: ApiResponseSchema(SignOutSuccessSchema),
      },
      summary: '登出',
    },
  },
  {
    pathPrefix: '/sign',
  },
);

/**
 * 带版本元数据的 Sign Contract
 * 使用 withVersion 包装，支持自动版本提取
 *
 * @example
 * ```typescript
 * // Controller 中使用
 * @TsRestController(signContract)
 * export class SignApiController { }
 *
 * // 读取版本
 * import { getContractVersion } from '@repo/contracts';
 * const version = getContractVersion(signContract); // '1'
 * ```
 */
export const signContractVersioned = withVersion(signContract, {
  version: API_VERSION.V1,
  pathPrefix: '/sign',
});

export type SignContract = typeof signContract;
