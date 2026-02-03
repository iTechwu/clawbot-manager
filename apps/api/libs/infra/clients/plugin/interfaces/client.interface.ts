/**
 * Client Plugin Interfaces
 *
 * 定义客户端层通用接口和类型
 */

/**
 * 客户端配置基础接口
 */
export interface ClientConfig {
  /** 客户端名称 */
  name: string;
  /** API 端点 */
  endpoint?: string;
  /** 超时时间 (ms) */
  timeout?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 重试延迟 (ms) */
  retryDelay?: number;
}

/**
 * HTTP 客户端配置
 */
export interface HttpClientConfig extends ClientConfig {
  /** 基础 URL */
  baseUrl: string;
  /** 默认请求头 */
  headers?: Record<string, string>;
}

/**
 * 客户端响应包装
 */
export interface ClientResponse<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 错误代码 */
  errorCode?: string;
  /** HTTP 状态码 */
  statusCode?: number;
}

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 客户端健康检查接口
 */
export interface HealthCheckable {
  /** 健康检查 */
  healthCheck(): Promise<boolean>;
}

/**
 * 可初始化客户端接口
 */
export interface Initializable {
  /** 初始化 */
  initialize(): Promise<void>;
  /** 是否已初始化 */
  isInitialized(): boolean;
}
