/**
 * OCR 服务 DTO 定义
 */

import { z } from 'zod';

// OCR Block Schema
export const OcrBlockSchema = z.object({
  text: z.string(),
  confidence: z.number(),
  boundingBox: z.array(z.number()).optional(),
});

// OCR Page Schema
export const OcrPageSchema = z.object({
  pageNumber: z.number(),
  text: z.string(),
  blocks: z.array(OcrBlockSchema).optional(),
});

// OCR Result Schema
export const OcrResultSchema = z.object({
  text: z.string(),
  confidence: z.number(),
  pages: z.array(OcrPageSchema).optional(),
  fileType: z.string().optional(),
  processingTime: z.number().optional(),
});

// OCR Request Schema
export const OcrRequestSchema = z.object({
  fileUrl: z.string(),
  fileType: z.string(),
  extractPages: z.boolean().optional(),
  language: z.string().optional(),
});

// OCR Batch Request Schema
export const OcrBatchRequestSchema = z.object({
  files: z.array(OcrRequestSchema),
});

// OCR Batch Result Schema
export const OcrBatchResultSchema = z.object({
  results: z.array(
    z.union([
      OcrResultSchema,
      z.object({ error: z.string(), fileUrl: z.string() }),
    ]),
  ),
  successCount: z.number(),
  failCount: z.number(),
});

// Type exports
export type OcrBlock = z.infer<typeof OcrBlockSchema>;
export type OcrPage = z.infer<typeof OcrPageSchema>;
export type OcrResult = z.infer<typeof OcrResultSchema>;
export type OcrRequest = z.infer<typeof OcrRequestSchema>;
export type OcrBatchRequest = z.infer<typeof OcrBatchRequestSchema>;
export type OcrBatchResult = z.infer<typeof OcrBatchResultSchema>;
