import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { ApiResponseSchema } from '../base';
import {
  TranscodeWebhookRequestSchema,
  AudioTranscribeWebhookRequestSchema,
  VolcengineTranscodeWebhookRequestSchema,
  PythonTaskWebhookRequestSchema,
  WebhookSuccessResponseSchema,
} from '../schemas/webhook.schema';

const c = initContract();

/**
 * Webhook API Contract
 * Note: Webhook endpoints typically don't require authentication as they are called by external services
 */
export const webhookContract = c.router(
  {
    // POST /webhook/transcode - Transcode webhook callback
    transcode: {
      method: 'POST',
      path: '/transcode',
      body: TranscodeWebhookRequestSchema,
      responses: {
        200: ApiResponseSchema(WebhookSuccessResponseSchema),
      },
      summary: 'Transcode webhook callback',
    },

    // POST /webhook/audio-transcribe/:vendor - Audio transcribe webhook callback
    audioTranscribe: {
      method: 'POST',
      path: '/audio-transcribe/:vendor',
      pathParams: z.object({
        vendor: z.enum(['oss', 'tos']),
      }),
      body: AudioTranscribeWebhookRequestSchema,
      responses: {
        200: ApiResponseSchema(WebhookSuccessResponseSchema),
      },
      summary: 'Audio transcribe webhook callback',
    },

    // POST /webhook/transcode/volcengine - Volcengine transcode webhook callback
    volcengineTranscode: {
      method: 'POST',
      path: '/transcode/volcengine',
      body: VolcengineTranscodeWebhookRequestSchema,
      responses: {
        200: ApiResponseSchema(WebhookSuccessResponseSchema),
      },
      summary: 'Volcengine transcode webhook callback',
    },

    // POST /webhook/python-task - Python task webhook callback
    pythonTask: {
      method: 'POST',
      path: '/python-task',
      body: PythonTaskWebhookRequestSchema,
      responses: {
        200: ApiResponseSchema(WebhookSuccessResponseSchema),
      },
      summary: 'Python task webhook callback from agent_x',
    },
  },
  {
    pathPrefix: '/webhook',
  },
);

export type WebhookContract = typeof webhookContract;

