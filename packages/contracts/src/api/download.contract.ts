import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { ApiResponseSchema } from '../base';
import { CommonErrorCode } from '../errors/domains/common.errors';
import { createTypedErrorResponse } from '../errors/error-response';
import {
  DownloadFileParamsSchema,
  DownloadFileQuerySchema,
  DownloadFileResponseSchema,
  BatchDownloadRequestSchema,
  BatchDownloadResponseSchema,
} from '../schemas/download.schema';

const c = initContract();

/**
 * Download API Contract
 *
 * RESTful Changes from V1:
 * - GET /files/:fileId (was POST /space/:spaceId/file/:fileId/:operationType)
 * - POST /batch (unchanged path, cleaner body)
 */
export const downloadContract = c.router(
  {
    // GET /space/spaces/:spaceId/files/:fileId - Download single file
    // V1: POST /download/space/:spaceId/file/:fileId/:operationType
    // V2: GET /space/:spaceId/files/:fileId?operationType=...
    getFile: {
      method: 'GET',
      path: '/spaces/:spaceId/files/:fileId/op',
      pathParams: z.object({
        spaceId: z.string().uuid(),
        fileId: z.string().uuid(),
      }),
      query: z.object({
        operationType: z
          .enum(['fileViewOp', 'fileDownloadOp'])
          .optional()
          .default('fileDownloadOp'),
      }),
      responses: {
        200: ApiResponseSchema(DownloadFileResponseSchema),
        401: createTypedErrorResponse([CommonErrorCode.UnAuthorized] as const),
      },
      summary: 'Get download URL for a single file',
    },
    // POST /download/batch - Batch download files
    // V1: POST /download/batch
    // V2: POST /download/batch (same path, cleaner schema)
    batchDownload: {
      method: 'POST',
      path: '/batch',
      body: BatchDownloadRequestSchema,
      responses: {
        200: ApiResponseSchema(BatchDownloadResponseSchema),
        401: createTypedErrorResponse([CommonErrorCode.UnAuthorized] as const),
      },
      summary: 'Get download URL for multiple files',
    },
  },
  {
    pathPrefix: '/download',
  },
);

export type DownloadContract = typeof downloadContract;
