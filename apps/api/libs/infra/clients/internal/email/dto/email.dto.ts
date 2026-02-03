import { z } from 'zod';

// ============================================================================
// Email Configuration Schemas
// ============================================================================

export const EmailKeysSchema = z.object({
  accessKey: z.string(),
  accessSecret: z.string(),
  host: z.string(),
  port: z.number(),
  secure: z.boolean(),
  user: z.string(),
  pass: z.string(),
});

export const EmailTemplateSchema = z.object({
  name: z.string(),
  subject: z.string(),
  from: z.string(),
  templateInvokeName: z.string(),
  codeExpire: z.number().optional(),
  frequency: z.number().optional(),
  sub: z.record(z.string(), z.string()).nullable().optional(),
});

export const EmailConfigSchema = z.object({
  vendor: z.string(),
  apiUser: z.string(),
  apiKey: z.string(),
  domain: z.string(),
  name: z.string(),
  templates: z.array(EmailTemplateSchema),
});

// ============================================================================
// Email Message Schemas
// ============================================================================

export const EmailSubValuesSchema = z.object({
  name: z.string(),
  code: z.string(),
});

export const SignalMessageSchema = z.object({
  to: z.string().email(),
  subject: z.string().optional(),
  templateInvokeName: z.string(),
  sub: z.record(z.string(), z.array(z.string())),
  options: z.any().optional(),
  queueMailId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type EmailKeys = z.infer<typeof EmailKeysSchema>;
export type EmailTemplate = z.infer<typeof EmailTemplateSchema>;
export type EmailConfig = z.infer<typeof EmailConfigSchema>;
export type EmailSubValues = z.infer<typeof EmailSubValuesSchema>;
export type SignalMessage = z.infer<typeof SignalMessageSchema>;

// ============================================================================
// Legacy Namespace (for backward compatibility)
// ============================================================================

export namespace PardxEmailSender {
  export type EmailKeys = z.infer<typeof EmailKeysSchema>;
  export type Config = z.infer<typeof EmailConfigSchema>;
  export type SignalMessage = z.infer<typeof SignalMessageSchema>;
  export type RegisterEmailSub = z.infer<typeof EmailSubValuesSchema>;
  export type EmailTemplate = z.infer<typeof EmailTemplateSchema>;
}
