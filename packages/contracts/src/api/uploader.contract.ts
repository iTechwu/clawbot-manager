import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { ApiResponseSchema, SuccessResponseSchema } from '../base';
import {
  PublicTokenRequestSchema,
  PrivateTokenRequestSchema,
  PrivateAbortRequestSchema,
  PrivateCompletedRequestSchema,
  TokenResponseSchema,
  FileSourceResponseSchema,
  UploaderSuccessResponseSchema,
} from '../schemas/uploader.schema';

const c = initContract();

/**
 * Uploader API Contract
 */
export const uploaderContract = c.router(
  {
    // POST /uploader/token/private/thumb - Get private thumb token
    getPrivateThumbToken: {
      method: 'POST',
      path: '/token/private/thumb',
      body: PublicTokenRequestSchema,
      responses: {
        200: ApiResponseSchema(TokenResponseSchema),
      },
      summary: 'Get private thumb token',
    },

    // POST /uploader/init/multipart - Initialize multipart upload
    initMultipart: {
      method: 'POST',
      path: '/init/multipart',
      body: PrivateTokenRequestSchema,
      responses: {
        200: ApiResponseSchema(TokenResponseSchema),
      },
      summary: 'Initialize multipart upload',
    },

    // POST /uploader/token/multipart - Get multipart upload token
    getMultipartToken: {
      method: 'POST',
      path: '/token/multipart',
      body: PrivateTokenRequestSchema,
      responses: {
        200: ApiResponseSchema(TokenResponseSchema),
      },
      summary: 'Get multipart upload token',
    },

    // POST /uploader/token/private - Get private upload token
    getPrivateToken: {
      method: 'POST',
      path: '/token/private',
      body: PrivateTokenRequestSchema,
      responses: {
        200: ApiResponseSchema(TokenResponseSchema),
      },
      summary: 'Get private upload token',
    },

    // POST /uploader/abort - Abort upload
    abort: {
      method: 'POST',
      path: '/abort',
      body: PrivateAbortRequestSchema,
      responses: {
        200: ApiResponseSchema(UploaderSuccessResponseSchema),
      },
      summary: 'Abort upload',
    },

    // POST /uploader/complete - Complete upload
    complete: {
      method: 'POST',
      path: '/complete',
      body: PrivateCompletedRequestSchema,
      responses: {
        200: ApiResponseSchema(FileSourceResponseSchema),
      },
      summary: 'Complete upload',
    },
  },
  {
    pathPrefix: '/uploader',
  },
);

export type UploaderContract = typeof uploaderContract;

