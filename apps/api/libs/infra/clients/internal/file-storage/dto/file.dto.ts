import { FileBucketVendor } from '@prisma/client';
import { z } from 'zod';

// File API Key Schema
export const FileApiKeySchema = z.object({
  accessKey: z.string(),
  secretKey: z.string(),
});

// File Local Schema
export const FileLocalSchema = z.object({
  lang: z.string(),
});

// Config Schema
export const PardxUploaderConfigSchema = z.object({
  vendor: z.nativeEnum(FileBucketVendor),
  bucket: z.string(),
  region: z.string(),
  zone: z.string().optional(),
  endpoint: z.string().optional(),
  internalEndpoint: z.string().optional(),
  tosEndpoint: z.string().optional(),
  tosInternalEndpoint: z.string().optional(),
  domain: z.string().optional(),
  cdnKeyName: z.string().optional(),
  cdnPrivateKey: z.string().optional(),
  webhook: z.string().optional(),
  locale: z.enum(['en', 'zh-CN', 'cn']).optional(),
  isPublic: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

// PutObject Options Schema
export const PutObjectOptionsSchema = z.object({
  acl: z.enum(['public-read', 'public-read-write', 'private']).optional(),
  contentType: z.string().optional(),
});

// GetObject Options Schema
export const GetObjectOptionsSchema = z.object({
  expiresIn: z.number().optional(),
});

// Presigned Put URL Object Schema
export const PresignedPutUrlObjectSchema = z.object({
  url: z.string(),
  headers: z.record(z.string(), z.string()),
});

// Listed Object Entry Schema
export const ListedObjectEntrySchema = z.object({
  key: z.string(),
  putTime: z.number(),
  hash: z.string(),
  fsize: z.number().optional(),
  mimeType: z.string(),
  type: z.number().optional(),
  endUser: z.string().optional(),
  status: z.number().optional(),
  md5: z.string().optional(),
  parts: z.array(z.number()).optional(),
});

// GetObjects Result Schema
export const GetObjectsResultSchema = z.object({
  marker: z.string().optional(),
  commonPrefixes: z.array(z.string()).optional(),
  items: z.array(ListedObjectEntrySchema),
});

// Fetch Object Result Schema
export const FetchObjectResultSchema = z.object({
  hash: z.string(),
  key: z.string(),
  fsize: z.number().optional(),
  mimeType: z.string(),
});

// Operation Response Data Schema
export const OperationResponseDataSchema = z.object({
  error: z.string().optional(),
  fsize: z.number().optional(),
  hash: z.string().optional(),
  mimeType: z.string().optional(),
  type: z.number().optional(),
  putTime: z.number().optional(),
  endUser: z.string().optional(),
  restoreStatus: z.number().optional(),
  status: z.number().optional(),
  md5: z.string().optional(),
  expiration: z.number().optional(),
  transitionToIA: z.number().optional(),
  transitionToARCHIVE: z.number().optional(),
  transitionToDeepArchive: z.number().optional(),
  transitionToArchiveIR: z.number().optional(),
});

// Operation Response Schema
export const OperationResponseSchema = z.object({
  code: z.number(),
  data: OperationResponseDataSchema.optional(),
});

// BatchOps Result Schema
export const BatchOpsResultSchema = z.array(OperationResponseSchema);

// Type exports (inferred from Zod schemas)
export type FileApiKey = z.infer<typeof FileApiKeySchema>;
export type FileLocal = z.infer<typeof FileLocalSchema>;
export type PardxUploaderConfig = z.infer<typeof PardxUploaderConfigSchema>;
export type PutObjectOptions = z.infer<typeof PutObjectOptionsSchema>;
export type GetObjectOptions = z.infer<typeof GetObjectOptionsSchema>;
export type PresignedPutUrlObject = z.infer<typeof PresignedPutUrlObjectSchema>;
export type ListedObjectEntry = z.infer<typeof ListedObjectEntrySchema>;
export type GetObjectsResult = z.infer<typeof GetObjectsResultSchema>;
export type FetchObjectResult = z.infer<typeof FetchObjectResultSchema>;
export type OperationResponseData = z.infer<typeof OperationResponseDataSchema>;
export type OperationResponse = z.infer<typeof OperationResponseSchema>;
export type BatchOpsResult = z.infer<typeof BatchOpsResultSchema>;

// Namespace for backward compatibility
export namespace PardxUploader {
  export type FileApiKey = z.infer<typeof FileApiKeySchema>;
  export type FileLocal = z.infer<typeof FileLocalSchema>;
  export type Config = z.infer<typeof PardxUploaderConfigSchema>;
}
