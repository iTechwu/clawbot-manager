/**
 * TTS 服务 DTO 定义
 */

import { z } from 'zod';

// TTS Request Schema
export const TtsRequestSchema = z.object({
  text: z.string(),
  speaker: z.string().optional(),
  format: z.string().default('mp3'),
  speech_rate: z.number().default(0),
  loudness_rate: z.number().default(0),
  pitch: z.number().default(0),
});

// TTS Response Schema
export const TtsResponseSchema = z.object({
  code: z.number(),
  data: z.string().optional(),
  sentence: z.any().optional(),
  message: z.string().optional(),
});

// TTS Result Schema
export const TtsResultSchema = z.object({
  success: z.boolean(),
  audio: z.string().optional(),
  s3Uri: z.string().optional(),
  duration: z.number().optional(),
  error: z.string().optional(),
  text: z.string().optional(),
});

// Type exports
export type TtsRequest = z.infer<typeof TtsRequestSchema>;
export type TtsResponse = z.infer<typeof TtsResponseSchema>;
export type TtsResult = z.infer<typeof TtsResultSchema>;

// Legacy class exports for backward compatibility
export class TtsRequestDto implements TtsRequest {
  text: string;
  speaker?: string;
  format: string = 'mp3';
  speech_rate: number = 0;
  loudness_rate: number = 0;
  pitch: number = 0;
}

export class TtsResponseDto implements TtsResponse {
  code: number;
  data?: string;
  sentence?: any;
  message?: string;
}

export class TtsResultDto implements TtsResult {
  success: boolean;
  audio?: string;
  s3Uri?: string;
  duration?: number;
  error?: string;
  text?: string;
}
