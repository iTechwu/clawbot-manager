import { initContract } from '@ts-rest/core';
import { ApiResponseSchema } from '../base';
import {
  PermissionConfigResponseSchema,
  ServiceReadyResponseSchema,
  HealthCheckResponseSchema,
} from '../schemas/system.schema';

const c = initContract();

/**
 * System API Contract
 */
export const systemContract = c.router(
  {
    // GET /system/config/permission - Get permission configuration
    getPermissionConfig: {
      method: 'GET',
      path: '/config/permission',
      responses: {
        200: ApiResponseSchema(PermissionConfigResponseSchema),
      },
      summary: 'Get permission configuration',
    },

    // GET /system/ready - Check if service is ready
    checkServiceReady: {
      method: 'GET',
      path: '/ready',
      responses: {
        200: ApiResponseSchema(ServiceReadyResponseSchema),
      },
      summary: 'Check if service is ready',
    },

    // GET /system/health - Check service health
    checkHealth: {
      method: 'GET',
      path: '/health',
      responses: {
        200: ApiResponseSchema(HealthCheckResponseSchema),
      },
      summary: 'Check service health status',
    },
  },
  {
    pathPrefix: '/system',
  },
);

export type SystemContract = typeof systemContract;

