import { z } from 'zod';

/**
 * Uploader-related Zod schemas
 */

// Vendor enum for file storage providers
export const FileVendorSchema = z.enum([
  'oss',
  'us3',
  'qiniu',
  's3',
  'gcs',
  'tos',
  'tencent',
  'ksyun',
]);

export type FileVendor = z.infer<typeof FileVendorSchema>;

// Upload metadata schema - 上传元数据
export const UploadMetadataSchema = z.object({
  /** 关联的职位描述 ID */
  jobDescriptionId: z.string().uuid().optional(),
  /** 关联的会议 ID */
  meetingId: z.string().uuid().optional(),
  /** 是否自动解析 */
  autoParse: z.boolean().optional(),
  /** 自定义字段 */
  customFields: z.record(z.string(), z.string()).optional(),
});

export type UploadMetadata = z.infer<typeof UploadMetadataSchema>;

// Public token request
export const PublicTokenRequestSchema = z.object({
  signature: z.string().min(1),
  filename: z.string().min(1),
  vendor: FileVendorSchema.optional(),
  bucket: z.string().optional(),
  locale: z.enum(['en', 'zh-CN']).optional(),
});

// Private token request - 包含元数据支持
export const PrivateTokenRequestSchema = z.object({
  signature: z.string().min(1),
  filename: z.string().min(1),
  fsize: z.number().positive(),
  vendor: FileVendorSchema.optional(),
  bucket: z.string().optional(),
  key: z.string().optional(),
  sha256: z.string().optional(),
  uploadId: z.string().optional(),
  partNumber: z.number().int().positive().optional(),
  locale: z.enum(['en', 'zh-CN']).optional(),
  /** 上传元数据 */
  metadata: UploadMetadataSchema.optional(),
});

// Private abort request
export const PrivateAbortRequestSchema = z.object({
  signature: z.string().min(1),
  fileId: z.string().uuid(),
});

// Batch abort request
export const BatchAbortRequestSchema = z.object({
  signature: z.string().min(1),
  fileIds: z.array(z.string().uuid()),
});

// Private completed request
export const PrivateCompletedRequestSchema = z.object({
  signature: z.string().min(1),
  fileId: z.string().uuid(),
});

// Batch save request
export const BatchSaveRequestSchema = z.object({
  files: z.array(
    z.object({
      url: z.string().url(),
      fsize: z.number().positive(),
      filename: z.string().min(1),
    }),
  ),
});

export type BatchSaveRequest = z.infer<typeof BatchSaveRequestSchema>;
export type RemoteFileItem = z.infer<
  typeof BatchSaveRequestSchema
>['files'][number];

// Token response
export const TokenResponseSchema = z.object({
  token: z.string(),
  key: z.string(),
  fileId: z.string().uuid(),
  bucket: z.string(),
  url: z.string().url().optional(),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;

// FileSource response (for complete endpoint)
export const FileSourceResponseSchema = z.object({
  id: z.string().uuid(),
  key: z.string().uuid(),
  bucket: z.string(),
  fsize: z.number(),
  mimeType: z.string(),
  ext: z.string(),
  sha256: z.string().optional(),
  isUploaded: z.boolean(),
  url: z.string().url().optional(),
});

export type FileSourceResponse = z.infer<typeof FileSourceResponseSchema>;

// Success response
export const UploaderSuccessResponseSchema = z.object({
  success: z.boolean(),
});

// Batch save response item
export const BatchSaveFileResultSchema = z.object({
  url: z.string().url(),
  filename: z.string(),
  fileId: z.string().uuid().optional(),
  success: z.boolean(),
  error: z.string().optional(),
});

export type BatchSaveFileResult = z.infer<typeof BatchSaveFileResultSchema>;

// Batch save response
export const BatchSaveResponseSchema = z.object({
  success: z.boolean(),
  savedCount: z.number(),
  failedCount: z.number(),
  results: z.array(BatchSaveFileResultSchema),
});

export type BatchSaveResponse = z.infer<typeof BatchSaveResponseSchema>;
