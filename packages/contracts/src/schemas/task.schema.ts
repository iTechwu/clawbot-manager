import { z } from 'zod';

/**
 * Task-related Zod schemas
 */

// System task status enum (QueueStatus from Prisma)
export const SystemTaskStatusSchema = z.enum([
  'init',
  'processing',
  'completed',
  'failed',
]);

// System task schema (all fields optional to match Partial<SystemTask>)
export const SystemTaskSchema = z
  .object({
    id: z.string().uuid(),
    createUserId: z.string().uuid(),
    status: SystemTaskStatusSchema,
    checked: z.boolean().default(false),
    error: z.string().optional().nullable(),
    data: z.any().optional().nullable(),
    seconds: z.number().default(0),
    isFileOperation: z.boolean().default(false),
    fileSystemIds: z.array(z.string().uuid()).optional().nullable(),
    spaceIds: z.array(z.string().uuid()).optional().nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  })
  .partial();

// Task check response
export const TaskCheckResponseSchema = z.object({
  task: SystemTaskSchema,
});

// Task list response
export const TaskListResponseSchema = z.array(SystemTaskSchema);

// Check tasks request
export const CheckTasksRequestSchema = z.object({
  taskIds: z.array(z.string().uuid()).optional(),
});

// Check tasks response
export const CheckTasksResponseSchema = z.array(SystemTaskSchema);
