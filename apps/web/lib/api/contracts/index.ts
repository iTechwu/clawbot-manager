/**
 * ts-rest API Contracts
 * Type-safe API client using ts-rest with React Query
 *
 * 使用方法：
 *
 * 1. 导入底层 API clients（适用于复杂场景）：
 * ```tsx
 * import { api } from '@/lib/api/contracts';
 * const { data } = api.list.useQuery(['users']);
 * ```
 */

// ts-rest clients (底层 API clients)
export * from './client';

// Wrapped hooks (封装好的 Hooks，推荐使用)
export * from './hooks';
