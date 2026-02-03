/**
 * @fileoverview File CDN 类型定义
 *
 * @module file-cdn/dto
 */

import { z } from 'zod';

// CDN Query Data Schema
export const QueryDataSchema = z.object({
  auth: z.string(),
});

// CDN Config Schema
export const CdnConfigSchema = z.object({
  url: z.string(),
  downloaderUrl: z.string(),
  vodUrl: z.string(),
  thumbTemplate: z.string(),
});

// CDN Configs Schema
export const CdnConfigsSchema = z.object({
  cn: CdnConfigSchema,
  us: CdnConfigSchema,
});

// CDN URL Response Schema
export const CdnUrlResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  url: z.string(),
});

// Image Template ID Schema
export const ImageTemplateIdSchema = z.union([
  z.literal('origin'),
  z.literal('preview'),
  z.literal('mini'),
  z.string(),
]);

// CloudFlare Template Schema
export const CloudFlareTemplateSchema = z.union([
  z.literal('360:360:360:360'),
  z.literal('183:103:360:360'),
  z.literal('origin'),
  z.literal('mini'),
  z.string(),
]);

// CDN Region Schema
export const CdnRegionSchema = z.enum(['cn', 'us']);

// CDN URL Type Schema
export const CdnUrlTypeSchema = z.enum(['image', 'video', 'download']);

// Signed URL Params Schema
export const SignedUrlParamsSchema = z.object({
  auth: z.string().optional(),
  expireIn: z.union([z.string(), z.number()]).optional(),
  signature: z.string().optional(),
  signedHeaders: z.string().optional(),
  signedId: z.string().optional(),
  templateId: z.string().optional(),
});

// AWS Signature V4 Params Schema
export const AwsSignatureV4ParamsSchema = z.object({
  algorithm: z.string(),
  contentSha256: z.string(),
  credential: z.string(),
  expires: z.number(),
  signature: z.string(),
  signedHeaders: z.string(),
  requestId: z.string(),
});

// Type exports
export type QueryData = z.infer<typeof QueryDataSchema>;
export type CdnConfig = z.infer<typeof CdnConfigSchema>;
export type CdnConfigs = z.infer<typeof CdnConfigsSchema>;
export type CdnUrlResponse = z.infer<typeof CdnUrlResponseSchema>;
export type ImageTemplateId = z.infer<typeof ImageTemplateIdSchema>;
export type CloudFlareTemplate = z.infer<typeof CloudFlareTemplateSchema>;
export type CdnRegion = z.infer<typeof CdnRegionSchema>;
export type CdnUrlType = z.infer<typeof CdnUrlTypeSchema>;
export type SignedUrlParams = z.infer<typeof SignedUrlParamsSchema>;
export type AwsSignatureV4Params = z.infer<typeof AwsSignatureV4ParamsSchema>;

// Namespace for backward compatibility
export namespace PardxFileCdn {
  export type QueryData = z.infer<typeof QueryDataSchema>;
  export type Config = z.infer<typeof CdnConfigSchema>;
  export type Configs = z.infer<typeof CdnConfigsSchema>;
}
