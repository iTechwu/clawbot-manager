import { z } from 'zod';

/**
 * System-related Zod schemas
 */

// Permission config response
export const PermissionConfigResponseSchema = z.object({
  role: z.array(z.enum(['owner', 'admin', 'member', 'guest'])),
});

// Service ready response
export const ServiceReadyResponseSchema = z.literal('ready');

// Health check details
export const HealthCheckDetailsSchema = z.object({
  db: z.enum(['healthy', 'unhealthy']),
  rabbitmq: z.enum(['healthy', 'unhealthy']),
  redis: z.enum(['healthy', 'unhealthy']),
});

// Health check response
export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  details: HealthCheckDetailsSchema,
});
