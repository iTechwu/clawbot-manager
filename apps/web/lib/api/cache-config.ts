/**
 * React Query Cache Configuration
 * 差异化缓存策略配置
 *
 * 根据数据特性配置不同的缓存时间：
 * - 用户/权限数据：较短的 staleTime，保证权限及时更新
 * - 静态数据：较长的 staleTime，减少不必要的请求
 * - 实时数据：极短或无缓存，保证数据新鲜度
 *
 * @example
 * ```tsx
 * import { cacheTime, queryOptions } from '@/lib/api/cache-config';
 *
 * // 使用预定义的缓存时间
 * useQuery({
 *   queryKey: ['permissions'],
 *   queryFn: fetchPermissions,
 *   staleTime: cacheTime.permission,
 * });
 * ```
 */

// ============================================================================
// 时间常量（毫秒）
// ============================================================================

const SECOND = 1000;
const MINUTE = 60 * SECOND;

// ============================================================================
// 缓存时间配置
// ============================================================================

/**
 * 预定义的缓存时间（staleTime）
 *
 * staleTime: 数据被认为"新鲜"的时间，在此期间不会触发后台刷新
 */
export const cacheTime = {
  /**
   * 无缓存 - 每次都重新获取
   * 适用于：需要实时更新的数据
   */
  none: 0,

  /**
   * 极短缓存 - 30秒
   * 适用于：未读消息数、实时状态等
   */
  realtime: 30 * SECOND,

  /**
   * 短缓存 - 1分钟
   * 适用于：用户权限、当前用户信息等需要较快更新的数据
   */
  short: 1 * MINUTE,

  /**
   * 权限缓存 - 2分钟
   * 适用于：用户权限数据，需要在权限变更后较快生效
   */
  permission: 2 * MINUTE,

  /**
   * 中等缓存 - 5分钟（默认值）
   * 适用于：大部分列表数据，如团队列表、成员列表等
   */
  medium: 5 * MINUTE,

  /**
   * 长缓存 - 15分钟
   * 适用于：变化较少的数据，如角色列表、部门列表等
   */
  long: 15 * MINUTE,

  /**
   * 静态缓存 - 30分钟
   * 适用于：几乎不变的数据，如权限模板、系统配置等
   */
  static: 30 * MINUTE,

  /**
   * 超长缓存 - 1小时
   * 适用于：完全静态的数据，如公司信息、知识库等
   */
  veryLong: 60 * MINUTE,
} as const;

/**
 * 垃圾回收时间配置（gcTime）
 *
 * gcTime: 数据从缓存中移除的时间（当没有活跃订阅者时）
 * 通常设置为 staleTime 的 2-3 倍
 */
export const gcTime = {
  short: 5 * MINUTE,
  medium: 30 * MINUTE,
  long: 60 * MINUTE,
} as const;

// ============================================================================
// 预定义查询选项
// ============================================================================

/**
 * 预定义的查询选项组合
 * 可以直接展开到 useQuery 配置中
 */
export const queryOptions = {
  /**
   * 实时数据 - 30秒缓存
   * 适用于：未读消息数、在线状态等
   */
  realtime: {
    staleTime: cacheTime.realtime,
    gcTime: gcTime.short,
    refetchInterval: 30 * SECOND, // 自动轮询
    refetchIntervalInBackground: false, // 后台不轮询
  },

  /**
   * 权限数据 - 2分钟缓存
   * 适用于：用户权限、角色权限等
   */
  permission: {
    staleTime: cacheTime.permission,
    gcTime: gcTime.medium,
  },

  /**
   * 用户数据 - 1分钟缓存
   * 适用于：当前用户信息、用户设置等
   */
  user: {
    staleTime: cacheTime.short,
    gcTime: gcTime.medium,
  },

  /**
   * 列表数据 - 5分钟缓存（默认）
   * 适用于：团队列表、成员列表、文件列表等
   */
  list: {
    staleTime: cacheTime.medium,
    gcTime: gcTime.medium,
  },

  /**
   * 详情数据 - 5分钟缓存
   * 适用于：团队详情、文件详情等
   */
  detail: {
    staleTime: cacheTime.medium,
    gcTime: gcTime.medium,
  },

  /**
   * 静态数据 - 30分钟缓存
   * 适用于：权限模板、系统配置等
   */
  static: {
    staleTime: cacheTime.static,
    gcTime: gcTime.long,
  },

  /**
   * 消息数据 - 30秒缓存 + 轮询
   * 适用于：未读消息数
   */
  messages: {
    staleTime: cacheTime.realtime,
    gcTime: gcTime.short,
    refetchInterval: 60 * SECOND, // 每分钟轮询
    refetchIntervalInBackground: false,
  },
} as const;

// ============================================================================
// 数据类型到缓存策略的映射
// ============================================================================

/**
 * 按数据类型获取推荐的缓存配置
 */
export const cacheConfigByType = {
  // 消息相关
  messages: queryOptions.list,
  unreadCount: queryOptions.messages,
} as const;

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 创建带有自定义缓存配置的查询选项
 *
 * @example
 * ```tsx
 * const options = createQueryOptions({
 *   staleTime: cacheTime.long,
 *   refetchOnWindowFocus: true,
 * });
 * ```
 */
export function createQueryOptions<T extends Record<string, unknown>>(
  overrides: T,
): T {
  return overrides;
}

/**
 * 获取分页查询的缓存配置
 * 分页数据使用较短的缓存时间，因为可能频繁切换页面
 */
export function getPaginatedQueryOptions() {
  return {
    staleTime: cacheTime.medium,
    gcTime: gcTime.medium,
    // 分页数据不需要在后台刷新
    refetchOnWindowFocus: false,
  };
}

/**
 * 获取搜索查询的缓存配置
 * 搜索结果使用较短的缓存时间
 */
export function getSearchQueryOptions() {
  return {
    staleTime: cacheTime.short,
    gcTime: gcTime.short,
    // 搜索结果在窗口聚焦时不刷新
    refetchOnWindowFocus: false,
  };
}
