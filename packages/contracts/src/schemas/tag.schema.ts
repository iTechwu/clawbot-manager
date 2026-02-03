import { z } from 'zod';
import { PaginationQuerySchema, PaginatedResponseSchema } from '../base';

/**
 * Tag-related Zod schemas
 */

// Tag schema - use any for recursive types to avoid circular reference issues
export const TagSchema: z.ZodType<unknown> = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  parentId: z.string().uuid().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
  level: z.number().int().min(1).default(1),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  parent: z.lazy(() => TagSchema.optional().nullable()),
  children: z.array(z.lazy(() => TagSchema)).optional(),
  fileCount: z.number().int().optional(),
});

// Tag type - infer from schema for use in other code
export type Tag = {
  id: string;
  name: string;
  parentId?: string | null;
  userId?: string | null;
  level: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  parent?: Tag | null;
  children?: Tag[];
  fileCount?: number;
};

// Create tag request
export const CreateTagRequestSchema = z.object({
  name: z.string().min(1),
  fileSystemId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  level: z.number().int().min(1).optional().default(1),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

// Query tag request
export const QueryTagRequestSchema = PaginationQuerySchema.extend({
  name: z.string().optional(),
  parentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  level: z.coerce.number().int().min(1).optional(),
  isActive: z.coerce.boolean().optional(),
});

// Tag list response
export const TagListResponseSchema = PaginatedResponseSchema(TagSchema);

// Tag tree response
export const TagTreeResponseSchema = z.array(TagSchema);

