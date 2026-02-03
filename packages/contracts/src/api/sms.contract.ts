import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { ApiResponseSchema } from '../base';
import {
  SendSmsCodeRequestSchema,
  CheckVerifyCodeRequestSchema,
  MobileCodeSendRequestSchema,
  SmsMobileLoginRequestSchema,
  SendSmsCodeResponseSchema,
  CheckVerifyCodeResponseSchema,
  SendLoginCodeResponseSchema,
  SendRegisterCodeResponseSchema,
} from '../schemas/sms.schema';
import { LoginSuccessSchema } from '../schemas/sign.schema';

const c = initContract();

/**
 * SMS API Contract
 */
export const smsContract = c.router(
  {
    // POST /sms/send/code - Send SMS code
    sendCode: {
      method: 'POST',
      path: '/send/code',
      body: SendSmsCodeRequestSchema,
      responses: {
        200: ApiResponseSchema(SendSmsCodeResponseSchema),
      },
      summary: 'Send SMS verification code',
    },

    // POST /sms/check/code - Check verify code
    checkCode: {
      method: 'POST',
      path: '/check/code',
      body: CheckVerifyCodeRequestSchema,
      responses: {
        200: ApiResponseSchema(CheckVerifyCodeResponseSchema),
      },
      summary: 'Check SMS verification code',
    },

    // POST /sms/send/code/login - Send login code
    sendLoginCode: {
      method: 'POST',
      path: '/send/code/login',
      body: MobileCodeSendRequestSchema,
      responses: {
        200: ApiResponseSchema(SendLoginCodeResponseSchema),
      },
      summary: 'Send login verification code',
    },

    // POST /sms/login/verify - Login with verify code
    loginWithVerifyCode: {
      method: 'POST',
      path: '/login/verify',
      body: SmsMobileLoginRequestSchema,
      responses: {
        200: ApiResponseSchema(LoginSuccessSchema),
      },
      summary: 'Login with SMS verification code',
    },

    // POST /sms/send/code/register - Send register code
    sendRegisterCode: {
      method: 'POST',
      path: '/send/code/register',
      body: MobileCodeSendRequestSchema,
      responses: {
        200: ApiResponseSchema(SendRegisterCodeResponseSchema),
      },
      summary: 'Send register verification code',
    },

    // POST /sms/register/verify - Register with verify code
    registerWithVerifyCode: {
      method: 'POST',
      path: '/register/verify',
      body: SmsMobileLoginRequestSchema,
      responses: {
        200: ApiResponseSchema(LoginSuccessSchema),
      },
      summary: 'Register with SMS verification code',
    },
  },
  {
    pathPrefix: '/sms',
  },
);

export type SmsContract = typeof smsContract;

