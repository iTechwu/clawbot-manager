import { z } from 'zod';

/**
 * Risk Words-related Zod schemas
 */

// Check risk word request
export const CheckRiskWordRequestSchema = z.object({
  text: z.string().min(1),
});

// Volcengine risk word detection request
export const VolcengineRiskWordDetectionRequestSchema = z.object({
  text: z.string().min(1),
  account_id: z.string().min(1),
  biztype: z.string().optional(),
  operate_time: z.number().optional(),
});

// Risk word check response (task result - can be any)
export const CheckRiskWordResponseSchema = z.any();

// Volcengine detection response (can be any)
export const VolcengineRiskWordDetectionResponseSchema = z.any();

