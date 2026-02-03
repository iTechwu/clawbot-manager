import { z } from 'zod';

const SmsVendorSchema = z.enum([
  'tencent',
  'aliyun',
  'zxjcsms',
  'http',
  'volcengine',
]);

export const SmsDefaultTemplateSchema = z.object({
  name: z.string(),
  sign: z.string(),
  templateCode: z.string().optional(),
  frequency: z.number(),
  codeExpire: z.number(),
});

export const SmsZxjcTemplateSchema = z.object({
  apName: z.string(),
  apPassword: z.string(),
  content: z.string(),
  srcId: z.string().optional(),
  serviceId: z.string().optional(),
  sendTime: z.string().optional(),
});

export const SmsHttpTemplateSchema = z.object({
  name: z.string(),
  sign: z.string(),
  content: z.string(),
  frequency: z.number(),
  codeExpire: z.number(),
  extend: z.string().optional(),
});

export const SmsVolcengineTemplateSchema = z.object({
  name: z.string(),
  sign: z.string(),
  smsAccount: z.string(),
  templateId: z.string(),
  tag: z.string().optional(),
  userExtCode: z.string().optional(),
  scene: z.string().optional(),
  codeType: z.number().optional(),
  expireTime: z.number().optional(),
  tryCount: z.number().optional(),
  frequency: z.number(),
  codeExpire: z.number(),
});

export const SmsProviderConfigSchema = z.object({
  vendor: SmsVendorSchema,
  accessKey: z.string(),
  accessSecret: z.string(),
  region: z.string().optional(),
  appId: z.string().optional(),
  endpoint: z.string().optional(),
  url: z.string().optional(),
  appKey: z.string().optional(),
  appCode: z.string().optional(),
  templates: z.array(
    z.union([
      SmsDefaultTemplateSchema,
      SmsHttpTemplateSchema,
      SmsVolcengineTemplateSchema,
    ]),
  ),
});

export const AppSmsConfigSchema = z.object({
  default: SmsVendorSchema,
  providers: z.array(SmsProviderConfigSchema),
});

export type AppSmsConfig = z.infer<typeof AppSmsConfigSchema>;
export type SmsProviderConfig = z.infer<typeof SmsProviderConfigSchema>;
export type SmsDefaultTemplate = z.infer<typeof SmsDefaultTemplateSchema>;
export type SmsZxjcTemplate = z.infer<typeof SmsZxjcTemplateSchema>;
export type SmsHttpTemplate = z.infer<typeof SmsHttpTemplateSchema>;
export type SmsVolcengineTemplate = z.infer<typeof SmsVolcengineTemplateSchema>;

export enum VerifyCodeResult {
  SUCCESS = '0',
  INVALID_CODE = '1',
  EXPIRED = '2',
  USED = '3',
  NOT_FOUND = '4',
  EXCEEDED = '5',
}

export interface VerifyCodeResponse {
  success: boolean;
  result: VerifyCodeResult;
  message: string;
  data?: any;
}
