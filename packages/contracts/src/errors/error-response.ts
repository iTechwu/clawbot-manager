/**
 * Error Response Schemas for API Contracts
 * API 契约中使用的错误响应 Schema
 */

import { z } from 'zod';

/**
 * Base error detail schema
 * 基础错误详情 Schema
 *
 * errorCode is now a string to match the string enum format
 */
export const ErrorDetailSchema = z.object({
  errorCode: z.string(),
  errorType: z.string(),
  errorData: z.any().optional(),
});

export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;

/**
 * Standard API error response schema
 * 标准 API 错误响应 Schema
 *
 * Note: `code` remains a number for HTTP status code compatibility
 * `error.errorCode` is a string for type safety
 */
export const ApiErrorResponseSchema = z.object({
  code: z.number(),
  msg: z.string(),
  data: z.null(),
  error: ErrorDetailSchema.optional(),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

/**
 * Create a typed error response schema for specific error codes
 * 为特定错误码创建类型化的错误响应 Schema
 *
 * @param allowedCodes - Array of allowed error codes for this endpoint (string format)
 * @example
 * const UserNotFoundErrorSchema = createTypedErrorResponse(['200401']);
 */
export function createTypedErrorResponse<T extends readonly string[]>(
  allowedCodes: T,
) {
  return z.object({
    code: z.number(),
    msg: z.string(),
    data: z.null(),
    error: z
      .object({
        errorCode: z.union(
          allowedCodes.map((code) => z.literal(code)) as [
            z.ZodLiteral<string>,
            z.ZodLiteral<string>,
            ...z.ZodLiteral<string>[],
          ],
        ),
        errorType: z.string(),
        errorData: z.any().optional(),
      })
      .optional(),
  });
}

/**
 * Create error response schema with single error code
 * 创建单个错误码的错误响应 Schema
 */
export function createSingleErrorResponse<T extends string>(code: T) {
  return z.object({
    code: z.number(),
    msg: z.string(),
    data: z.null(),
    error: z
      .object({
        errorCode: z.literal(code),
        errorType: z.string(),
        errorData: z.any().optional(),
      })
      .optional(),
  });
}

/**
 * Common error response schemas for reuse
 * 常用错误响应 Schema
 */
export const CommonErrorResponses = {
  // 401 Unauthorized
  unauthorized: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.null(),
  }),

  // 403 Forbidden
  forbidden: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.null(),
  }),

  // 404 Not Found
  notFound: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.null(),
  }),

  // 400 Bad Request
  badRequest: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.null(),
  }),

  // 500 Internal Server Error
  internalError: z.object({
    code: z.number(),
    msg: z.string(),
    data: z.null(),
  }),
} as const;

/**
 * Error code constants grouped by domain (string format)
 * 按域分组的错误码常量 (方便在契约中引用)
 */
export const ErrorCodes = {
  User: {
    NOT_FOUND: '200401',
    ALREADY_EXISTS: '200402',
    INVALID_PASSWORD: '200403',
  },
  Common: {
    UNAUTHORIZED: '923402',
    INVALID_TOKEN: '926404',
    TOO_FREQUENT: '925429',
    INTERNAL_ERROR: '900500',
  },
} as const;
