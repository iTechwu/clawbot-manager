import { z } from 'zod';
import { AppRouter } from '@ts-rest/core';

/**
 * Base API Response Schema
 * Matches the existing { code, msg, data } format used in the backend
 */

// HTTP status codes used in the API
export const HTTP_CODE = {
  SUCCESS: 0,
  ERROR: -1,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
} as const;

// ============================================================================
// API Versioning - Contract Metadata
// ============================================================================

/**
 * API 版本号常量（从 @repo/constants 复制，避免循环依赖）
 */
export const API_VERSION = {
  V1: '1',
  V2: '2',
} as const;

export type ApiVersion = (typeof API_VERSION)[keyof typeof API_VERSION];

export const API_VERSION_HEADER = 'x-api-version' as const;
export const API_VERSION_DEFAULT = API_VERSION.V1;

/**
 * Contract 元数据 Symbol
 * 用于在 contract 上附加版本信息
 */
export const CONTRACT_METADATA = Symbol('CONTRACT_METADATA');

/**
 * Contract 元数据接口
 */
export interface ContractMetadata {
  /** API 版本号 */
  version: ApiVersion;
  /** 路由前缀 */
  pathPrefix: string;
}

/**
 * 带版本元数据的 Contract 类型
 */
export type VersionedContract<T extends AppRouter> = T & {
  [CONTRACT_METADATA]: ContractMetadata;
};

/**
 * 创建带版本的 Contract
 *
 * @param contract - ts-rest contract router
 * @param metadata - 版本和路径元数据
 * @returns 带元数据的 contract
 *
 * @example
 * ```typescript
 * const c = initContract();
 * export const signContract = withVersion(
 *   c.router({ ... }, { pathPrefix: '/sign' }),
 *   { version: API_VERSION.V1, pathPrefix: '/sign' }
 * );
 *
 * // 读取版本
 * const version = getContractVersion(signContract); // '1'
 * ```
 */
export function withVersion<T extends AppRouter>(
  contract: T,
  metadata: ContractMetadata,
): VersionedContract<T> {
  const versionedContract = contract as VersionedContract<T>;
  versionedContract[CONTRACT_METADATA] = metadata;
  return versionedContract;
}

/**
 * 从 Contract 获取版本号
 *
 * @param contract - ts-rest contract
 * @returns 版本号，如果未设置则返回默认版本
 */
export function getContractVersion(contract: unknown): ApiVersion {
  if (
    contract &&
    typeof contract === 'object' &&
    CONTRACT_METADATA in contract
  ) {
    return (contract as VersionedContract<AppRouter>)[CONTRACT_METADATA]
      .version;
  }
  return API_VERSION_DEFAULT;
}

/**
 * 从 Contract 获取完整元数据
 *
 * @param contract - ts-rest contract
 * @returns 元数据对象，如果未设置则返回 undefined
 */
export function getContractMetadata(
  contract: unknown,
): ContractMetadata | undefined {
  if (
    contract &&
    typeof contract === 'object' &&
    CONTRACT_METADATA in contract
  ) {
    return (contract as VersionedContract<AppRouter>)[CONTRACT_METADATA];
  }
  return undefined;
}

/**
 * 检查 Contract 是否有版本元数据
 */
export function hasContractVersion(contract: unknown): boolean {
  return (
    contract !== null &&
    typeof contract === 'object' &&
    CONTRACT_METADATA in contract
  );
}

// Base response wrapper schema
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    code: z.number(),
    msg: z.string(),
    data: dataSchema,
  });

// Alternative response wrapper schema with rest: true format (used in rbac-api)
export const RestResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    rest: z.boolean(),
    data: dataSchema,
  });

/**
 * Helper function to create API response schema
 * Wraps any data schema in the standard { code, msg, data } format
 * Alias for ApiResponseSchema for more intuitive usage in contracts
 *
 * 配合 response.helper.ts 中的 success(), created(), deleted() 等函数使用
 */
export const createApiResponse = ApiResponseSchema;

// Success response type helper
export type ApiResponse<T> = {
  code: number;
  msg: string;
  data: T;
};

// Pagination query schema (matches PaginationQueryDto)
export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().positive().optional().default(20),
  page: z.coerce.number().positive().min(1).optional().default(1),
  sort: z
    .enum(['createdAt', 'name', 'fsize', 'disable', 'frameTime', 'expireAt'])
    .optional(),
  asc: z.enum(['asc', 'desc']).optional(),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/**
 * Base paginated response schema with generic item type
 * Returns { list, total, page, limit } for all list endpoints
 *
 * @template T - The Zod schema for list items
 * @example
 * const UserListResponseSchema = PaginatedResponseSchema(UserSchema);
 * // Results in: { list: User[], total: number, page: number, limit: number }
 */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
) =>
  z.object({
    list: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  });

/**
 * Extended paginated response schema with optional metadata fields
 * Includes additional fields like totalSize, permission, role, nowTime
 * 用于替代 PardxApp.PageResponseData，保持 zod-first 的设计
 *
 * @template T - The Zod schema for list items
 * @example
 * const SpaceListResponseSchema = ExtendedPaginatedResponseSchema(SpaceSchema);
 * // Results in: { list: Space[], total: number, page: number, limit: number, totalSize?: number, ... }
 */
export const ExtendedPaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
) =>
  z.object({
    list: z.array(itemSchema),
    total: z.number(),
    page: z.number().optional(),
    limit: z.number().optional(),
    /** 总大小（字节），用于文件列表 */
    totalSize: z.number().optional(),
    /** 权限列表 */
    permission: z.array(z.string()).optional(),
    /** 角色标识 */
    role: z.string().optional(),
    /** 服务器当前时间 */
    nowTime: z.coerce.date().optional(),
  });

/**
 * Generic paginated response type
 * Use this for type-safe paginated API responses
 *
 * @template T - The type of items in the list
 */
export type PaginatedResponse<T> = {
  list: T[];
  total: number;
  page: number;
  limit: number;
};

/**
 * Extended paginated response type with optional metadata
 * 用于替代 PardxApp.PageResponseData，提供更丰富的分页信息
 *
 * @template T - The type of items in the list
 */
export type ExtendedPaginatedResponse<T> = {
  list: T[];
  total: number;
  page?: number;
  limit?: number;
  /** 总大小（字节），用于文件列表 */
  totalSize?: number;
  /** 权限列表 */
  permission?: string[];
  /** 角色标识 */
  role?: string;
  /** 服务器当前时间 */
  nowTime?: Date;
};

// Common ID schema (UUID string)
export const IdSchema = z.string().uuid();

// Common success response
export const SuccessResponseSchema = z.object({
  success: z.boolean(),
});

export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;

// Error response schema (basic)
export const ErrorResponseSchema = z.object({
  code: z.number(),
  msg: z.string(),
  data: z.null().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Enhanced error response with error details
export const EnhancedErrorResponseSchema = z.object({
  code: z.number(),
  msg: z.string(),
  data: z.null(),
  error: z
    .object({
      errorCode: z.number(),
      errorType: z.string(),
      errorData: z.any().optional(),
    })
    .optional(),
});

export type EnhancedErrorResponse = z.infer<typeof EnhancedErrorResponseSchema>;

// Helper function to create API response schema with common responses
export function createApiContract<
  TBody extends z.ZodTypeAny | undefined,
  TQuery extends z.ZodTypeAny | undefined,
  TParams extends z.ZodTypeAny | undefined,
  TResponse extends z.ZodTypeAny,
>(config: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  summary?: string;
  body?: TBody;
  query?: TQuery;
  pathParams?: TParams;
  responses: {
    200: TResponse;
    401?: z.ZodTypeAny;
    403?: z.ZodTypeAny;
    404?: z.ZodTypeAny;
    422?: z.ZodTypeAny;
  };
}) {
  return config;
}

// Re-export zod for convenience
export { z };
