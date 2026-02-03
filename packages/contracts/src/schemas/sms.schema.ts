import { z } from 'zod';
import { LoginSuccessSchema } from './sign.schema';

/**
 * SMS-related Zod schemas
 */

// Send SMS code request
export const SendSmsCodeRequestSchema = z.object({
  phoneNumbers: z.string().regex(/^1[3-9]\d{9}$/, 'Invalid phone number'),
});

// Check verify code request
export const CheckVerifyCodeRequestSchema = z.object({
  phoneNumber: z.string().regex(/^1[3-9]\d{9}$/, 'Invalid phone number'),
  code: z.string().regex(/^\d{4,6}$/, 'Code should be 4-6 digits'),
});

// Mobile code send request
export const MobileCodeSendRequestSchema = z.object({
  mobile: z.string().regex(/^1[3-9]\d{9}$/, 'Invalid phone number'),
  iddCode: z.string().optional().default('0086'),
});

// Mobile login request (SMS)
export const SmsMobileLoginRequestSchema = z.object({
  mobile: z.string().regex(/^1[3-9]\d{9}$/, 'Invalid phone number'),
  code: z.string().min(1),
});

// Send SMS code response
export const SendSmsCodeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

// Check verify code response
export const CheckVerifyCodeResponseSchema = z.object({
  success: z.boolean(),
  result: z.string().optional(),
});

// Send login code response
export const SendLoginCodeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

// Send register code response
export const SendRegisterCodeResponseSchema = z.object({
  phoneNumber: z.string(),
  expireTime: z.number(),
});
