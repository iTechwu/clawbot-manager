import { initContract } from '@ts-rest/core';
import { ApiResponseSchema } from '../base';
import {
  CheckRiskWordRequestSchema,
  CheckRiskWordResponseSchema,
  VolcengineRiskWordDetectionRequestSchema,
  VolcengineRiskWordDetectionResponseSchema,
} from '../schemas/risk-words.schema';

const c = initContract();

/**
 * Risk Words API Contract
 */
export const riskWordsContract = c.router(
  {
    // POST /risk-words/check - Check risk word
    checkRiskWord: {
      method: 'POST',
      path: '/check',
      body: CheckRiskWordRequestSchema,
      responses: {
        200: ApiResponseSchema(CheckRiskWordResponseSchema),
      },
      summary: 'Check risk word in text',
    },

    // POST /risk-words/volcengine/detection - Volcengine risk word detection
    volcengineDetection: {
      method: 'POST',
      path: '/volcengine/detection',
      body: VolcengineRiskWordDetectionRequestSchema,
      responses: {
        200: ApiResponseSchema(VolcengineRiskWordDetectionResponseSchema),
      },
      summary: 'Volcengine text risk detection',
    },
  },
  {
    pathPrefix: '/risk-words',
  },
);

export type RiskWordsContract = typeof riskWordsContract;
