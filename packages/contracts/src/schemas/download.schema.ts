import { z } from 'zod';

/**
 * Download-related Zod schemas
 */

// Operation type for file download
export const DownloadOperationTypeSchema = z.enum([
  'fileViewOp',
  'fileDownloadOp',
]);

export type DownloadOperationType = z.infer<typeof DownloadOperationTypeSchema>;

// Single file download params
export const DownloadFileParamsSchema = z.object({
  spaceId: z.string().uuid(),
  fileId: z.string().uuid(),
});

export type DownloadFileParams = z.infer<typeof DownloadFileParamsSchema>;

// Single file download query
export const DownloadFileQuerySchema = z.object({
  operationType:
    DownloadOperationTypeSchema.optional().default('fileDownloadOp'),
});

export type DownloadFileQuery = z.infer<typeof DownloadFileQuerySchema>;

// Single file download response
export const DownloadFileResponseSchema = z.object({
  url: z.string().url(),
  filename: z.string().optional(),
  contentType: z.string().optional(),
  size: z.number().optional(),
});

export type DownloadFileResponse = z.infer<typeof DownloadFileResponseSchema>;

// Batch download request body
export const BatchDownloadRequestSchema = z.object({
  spaceId: z.string().uuid(),
  // folderId can be "root" (special value for space root) or a UUID
  folderId: z.union([z.literal('root'), z.string().uuid()]).optional(),
  fileId: z.string().uuid().optional(),
  fileSystemIds: z.array(z.string().uuid()).optional(),
});

export type BatchDownloadRequest = z.infer<typeof BatchDownloadRequestSchema>;

// Batch download response
export const BatchDownloadResponseSchema = z.object({
  url: z.string().url(),
  filename: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
});

export type BatchDownloadResponse = z.infer<typeof BatchDownloadResponseSchema>;
